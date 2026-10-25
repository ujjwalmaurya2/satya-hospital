-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — OPD + LAB WORKFLOW FIXES
-- Migration: 20261029000008_opd_lab_workflow_fixes.sql
-- Depends on: 20261024000003, 20261026000005, 20261027000006
--
-- 1. OPD: one appointments row is shared by Reception and the Doctor. Roles now
--    decide which status changes each may make (Reception confirms arrival,
--    the doctor starts/completes the consultation) and consultation notes are
--    saved with the completion in one transaction.
-- 2. Lab reports: Reception may upload (pathology/Super Admin verify and
--    release); storage objects must exist before a report row is created;
--    unregistered uploads can be cleaned up; verify/release are idempotent;
--    independent verification is a hospital setting (off by default).
-- 3. Home sample collection: configuration (service pincodes, time slots, fee,
--    capacity, booking window) and per-order address/slot/fee, all validated
--    in SQL. Nothing is enabled until the Super Admin saves real values.
-- Idempotent: safe to run more than once. No existing rows are modified.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. OPD status by role
-- ----------------------------------------------------------------------------
-- Reception: confirm arrival (checked_in), no-show, cancel, call the next token.
-- Doctor:    start (in_consultation), complete, or send back to waiting.
-- Super Admin (doctor/owner): everything.
CREATE OR REPLACE FUNCTION public.set_appointment_status(
  p_appointment_id UUID,
  p_status appointment_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := public.get_auth_role();
  v_appt public.appointments;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('reception', 'doctor', 'admin') THEN
    RAISE EXCEPTION 'You are not allowed to change OPD appointments.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_appt.status = p_status THEN
    RETURN v_appt; -- repeated click: nothing to do
  END IF;

  IF v_role = 'reception' AND p_status = 'completed' THEN
    RAISE EXCEPTION 'Only the doctor can mark a consultation as completed.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_role = 'doctor' AND NOT (
       (p_status = 'in_consultation' AND v_appt.status = 'checked_in')
    OR (p_status = 'completed' AND v_appt.status IN ('checked_in', 'in_consultation'))
    OR (p_status = 'checked_in' AND v_appt.status = 'in_consultation')
  ) THEN
    RAISE EXCEPTION 'Doctors can start, complete or send back consultations for patients who have arrived.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The update trigger validates the transition and stamps checked_in_at / called_at / completed_at.
  UPDATE public.appointments
     SET status = p_status,
         cancellation_reason = CASE WHEN p_status = 'cancelled' THEN COALESCE(p_reason, 'Cancelled at reception') ELSE cancellation_reason END
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;
  RETURN v_appt;
END;
$$;

-- Walk-ins: unchanged logic, but "today" now comes from the same hospital clock
-- as the insert trigger and online booking (identical in production; testable).
CREATE OR REPLACE FUNCTION public.register_walk_in(
  p_full_name TEXT,
  p_phone TEXT,
  p_gender TEXT,
  p_dob DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_doctor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today   DATE := public.hospital_now_ist()::DATE;
  v_phone   TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_patient public.patient_profiles;
  v_appt    public.appointments;
BEGIN
  PERFORM public.assert_queue_staff();

  IF btrim(COALESCE(p_full_name, '')) = '' THEN
    RAISE EXCEPTION 'Patient name is required.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'A valid 10-digit Indian mobile number is required.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_appt FROM public.appointments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_appt; END IF;
  END IF;

  SELECT * INTO v_patient
    FROM public.patient_profiles
   WHERE phone = v_phone AND lower(full_name) = lower(btrim(p_full_name))
   ORDER BY created_at
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.patient_profiles (full_name, phone, gender, dob)
    VALUES (btrim(p_full_name), v_phone, p_gender, p_dob)
    RETURNING * INTO v_patient;
  END IF;

  SELECT * INTO v_appt
    FROM public.appointments
   WHERE patient_profile_id = v_patient.id
     AND appointment_date = v_today
     AND status NOT IN ('cancelled')
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION '% already holds token #% for today.', v_patient.full_name, v_appt.token_number
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.appointments (
    appointment_code, patient_profile_id, doctor_id, appointment_date, token_number,
    queue_type, status, booked_by_role, notes, idempotency_key
  ) VALUES (
    'pending', v_patient.id, p_doctor_id, v_today, 0,
    'walk_in', 'checked_in', public.get_auth_role(), NULLIF(btrim(COALESCE(p_notes, '')), ''), p_idempotency_key
  )
  RETURNING * INTO v_appt;

  RETURN v_appt;
END;
$$;

-- Reception, the doctor or the Super Admin may call the next arrived patient.
CREATE OR REPLACE FUNCTION public.call_next_token()
RETURNS SETOF public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := public.hospital_now_ist()::DATE;
  v_id    UUID;
BEGIN
  IF public.get_auth_role() IS NULL OR public.get_auth_role() NOT IN ('reception', 'doctor', 'admin') THEN
    RAISE EXCEPTION 'You are not allowed to call patients.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_id
    FROM public.appointments
   WHERE appointment_date = v_today AND status = 'checked_in'
   ORDER BY token_number
   LIMIT 1
   FOR UPDATE SKIP LOCKED;
  IF v_id IS NULL THEN RETURN; END IF;

  RETURN QUERY UPDATE public.appointments SET status = 'in_consultation' WHERE id = v_id RETURNING *;
END;
$$;

-- Consultation notes: the doctor's login may not be linked to a doctor_profiles
-- row (e.g. the owner), so doctor_id becomes optional and the author is recorded.
ALTER TABLE public.patient_visits ALTER COLUMN doctor_id DROP NOT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES auth.users(id);

-- Save notes and complete the appointment together (one transaction, idempotent).
CREATE OR REPLACE FUNCTION public.complete_opd_consultation(
  p_appointment_id UUID,
  p_chief_complaint TEXT,
  p_clinical_notes TEXT,
  p_diagnosis TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt    public.appointments;
  v_doctor  public.doctor_profiles;
  v_author  public.profiles;
  v_visit   UUID;
BEGIN
  PERFORM public.lab_require_role(ARRAY['doctor', 'admin']::user_role[]);
  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found'; END IF;

  SELECT id INTO v_visit FROM public.patient_visits WHERE appointment_id = v_appt.id LIMIT 1;
  IF v_appt.status = 'completed' AND v_visit IS NOT NULL THEN
    RETURN jsonb_build_object('appointment_id', v_appt.id, 'visit_id', v_visit, 'status', 'completed');
  END IF;
  IF v_appt.status NOT IN ('checked_in', 'in_consultation') THEN
    RAISE EXCEPTION 'Only patients who have arrived can be completed.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_author FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO v_doctor FROM public.doctor_profiles WHERE profile_id = auth.uid() LIMIT 1;

  INSERT INTO public.patient_visits (patient_profile_id, appointment_id, doctor_id, visit_date, chief_complaint, clinical_notes, diagnosis, doctor_signature, recorded_by)
  VALUES (v_appt.patient_profile_id, v_appt.id, COALESCE(v_doctor.id, v_appt.doctor_id), v_appt.appointment_date,
          COALESCE(NULLIF(btrim(p_chief_complaint), ''), v_appt.visit_reason, 'OPD consultation'),
          COALESCE(btrim(p_clinical_notes), ''), NULLIF(btrim(COALESCE(p_diagnosis, '')), ''),
          COALESCE(v_doctor.full_name, v_author.full_name), auth.uid())
  RETURNING id INTO v_visit;

  UPDATE public.appointments SET status = 'completed' WHERE id = v_appt.id;
  RETURN jsonb_build_object('appointment_id', v_appt.id, 'visit_id', v_visit, 'status', 'completed');
END;
$$;
REVOKE ALL ON FUNCTION public.complete_opd_consultation(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_opd_consultation(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Lab reports
-- ----------------------------------------------------------------------------
ALTER TABLE public.hospital_settings
  ADD COLUMN IF NOT EXISTS lab_require_independent_verification BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.pathology_reports ADD COLUMN IF NOT EXISTS original_file_size INTEGER;

DROP FUNCTION IF EXISTS public.register_lab_report(UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.register_lab_report(
  p_order_id UUID, p_test_id UUID, p_storage_key TEXT, p_file_name TEXT, p_file_size INTEGER,
  p_checksum TEXT DEFAULT NULL, p_correction_reason TEXT DEFAULT NULL, p_original_file_size INTEGER DEFAULT NULL
)
RETURNS public.pathology_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   public.pathology_orders;
  v_test    TEXT;
  v_prev    public.pathology_reports;
  v_report  public.pathology_reports;
  v_access  TEXT;
  v_exists  BOOLEAN := true;
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'pathology', 'admin']::user_role[]);
  SELECT * INTO v_order FROM public.pathology_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Reports can only be added to confirmed orders.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT n INTO v_test FROM public.pathology_order_items i, unnest(i.test_ids, i.test_names) AS u(id, n)
   WHERE i.order_id = v_order.id AND u.id = p_test_id LIMIT 1;
  IF v_test IS NULL THEN
    RAISE EXCEPTION 'This test is not part of the order.' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_storage_key, '') NOT LIKE 'orders/' || v_order.id::TEXT || '/%' OR lower(COALESCE(p_file_name, '')) NOT LIKE '%.pdf'
     OR COALESCE(p_file_size, 0) <= 0 OR p_file_size > 10485760 THEN
    RAISE EXCEPTION 'Upload a PDF report (up to 10 MB) for this order.' USING ERRCODE = 'check_violation';
  END IF;
  -- The file must really be in private storage before it is linked to a patient.
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = ''lab-reports'' AND name = $1)' INTO v_exists USING p_storage_key;
  END IF;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'The uploaded file was not found in storage. Please upload it again.' USING ERRCODE = 'no_data_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pathology_reports WHERE storage_key = p_storage_key) THEN
    RAISE EXCEPTION 'This file is already attached to a report.' USING ERRCODE = 'unique_violation';
  END IF;

  SELECT * INTO v_prev FROM public.pathology_reports
   WHERE order_id = v_order.id AND test_id = p_test_id AND status IN ('pending_verification', 'published')
   ORDER BY version_number DESC LIMIT 1;
  IF FOUND AND btrim(COALESCE(p_correction_reason, '')) = '' THEN
    RAISE EXCEPTION 'A report already exists for this test. Give a reason for the new version.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT accession_number INTO v_access FROM public.pathology_samples WHERE order_id = v_order.id AND status <> 'rejected' ORDER BY collected_at LIMIT 1;

  INSERT INTO public.pathology_reports (
    report_code, patient_profile_id, order_id, test_id, lab_accession_number, test_name, storage_key, file_name, file_size,
    original_file_size, checksum, status, version_number, correction_reason, uploaded_by
  ) VALUES (
    'REP-' || to_char(public.hospital_now_ist(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)),
    v_order.patient_profile_id, v_order.id, p_test_id, COALESCE(v_access, v_order.order_number), v_test, p_storage_key, p_file_name, p_file_size,
    p_original_file_size, p_checksum, 'pending_verification',
    COALESCE((SELECT max(version_number) FROM public.pathology_reports WHERE order_id = v_order.id AND test_id = p_test_id), 0) + 1,
    NULLIF(btrim(COALESCE(p_correction_reason, '')), ''), auth.uid()
  ) RETURNING * INTO v_report;

  UPDATE public.pathology_reports SET status = 'superseded', superseded_by_id = v_report.id
   WHERE order_id = v_order.id AND test_id = p_test_id AND status = 'pending_verification' AND id <> v_report.id;
  PERFORM public.lab_audit('lab_report.uploaded', 'pathology_reports', v_report.id,
    format('%s v%s for %s (%s bytes%s)', v_test, v_report.version_number, v_order.order_number, p_file_size,
           CASE WHEN p_original_file_size > p_file_size THEN ', compressed from ' || p_original_file_size ELSE '' END));
  RETURN v_report;
END;
$$;
REVOKE ALL ON FUNCTION public.register_lab_report(UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_lab_report(UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER) TO authenticated;

-- Verify: pathology or Super Admin. Repeating it on a verified report is a no-op.
CREATE OR REPLACE FUNCTION public.verify_lab_report(p_report_id UUID)
RETURNS public.pathology_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.pathology_reports;
  v_independent BOOLEAN;
BEGIN
  PERFORM public.lab_require_role(ARRAY['pathology', 'admin']::user_role[]);
  SELECT * INTO v_report FROM public.pathology_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found.' USING ERRCODE = 'no_data_found'; END IF;
  IF v_report.verified_at IS NOT NULL AND v_report.status IN ('pending_verification', 'published') THEN
    RETURN v_report; -- already verified: never reverted by a repeated request
  END IF;
  IF v_report.status <> 'pending_verification' THEN
    RAISE EXCEPTION 'Only reports awaiting verification can be verified.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT lab_require_independent_verification INTO v_independent FROM public.hospital_settings ORDER BY updated_at DESC LIMIT 1;
  IF COALESCE(v_independent, false) AND v_report.uploaded_by = auth.uid() THEN
    RAISE EXCEPTION 'Hospital policy requires a different staff member to verify a report than the one who uploaded it.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_reports SET verified_by = auth.uid(), verified_at = NOW() WHERE id = p_report_id RETURNING * INTO v_report;
  PERFORM public.lab_audit('lab_report.verified', 'pathology_reports', v_report.id, v_report.report_code);
  RETURN v_report;
END;
$$;

-- Release: only verified reports; repeating it on a released report is a no-op.
CREATE OR REPLACE FUNCTION public.release_lab_report(p_report_id UUID)
RETURNS public.pathology_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_report public.pathology_reports;
BEGIN
  PERFORM public.lab_require_role(ARRAY['pathology', 'admin']::user_role[]);
  SELECT * INTO v_report FROM public.pathology_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found.' USING ERRCODE = 'no_data_found'; END IF;
  IF v_report.status = 'published' THEN RETURN v_report; END IF;
  IF v_report.status <> 'pending_verification' OR v_report.verified_at IS NULL THEN
    RAISE EXCEPTION 'Only verified reports can be released.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_reports SET status = 'published', published_at = NOW() WHERE id = p_report_id RETURNING * INTO v_report;
  UPDATE public.pathology_reports SET status = 'superseded', superseded_by_id = v_report.id
   WHERE order_id = v_report.order_id AND test_id = v_report.test_id AND status = 'published' AND id <> v_report.id;
  UPDATE public.pathology_orders o SET lab_status = 'completed', updated_at = NOW()
   WHERE o.id = v_report.order_id AND NOT EXISTS (
     SELECT 1 FROM public.pathology_order_items i, unnest(i.test_ids) AS t(id)
      WHERE i.order_id = o.id
        AND NOT EXISTS (SELECT 1 FROM public.pathology_reports r WHERE r.order_id = o.id AND r.test_id = t.id AND r.status = 'published'));
  PERFORM public.lab_audit('lab_report.released', 'pathology_reports', v_report.id, v_report.report_code);
  RETURN v_report;
END;
$$;

-- Reception can open report files it uploaded for review (still never unreleased files for patients).
CREATE OR REPLACE FUNCTION public.can_read_lab_report_file(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_auth_role() IN ('pathology', 'admin', 'reception') THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.pathology_reports r
       WHERE r.storage_key = p_key AND r.status = 'published'
         AND (public.get_auth_role() = 'doctor'
              OR r.patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())))
  END;
$$;

-- Storage: Reception may upload too; any staff uploader may delete a file that
-- was never registered (cleanup after a failed save). Registered files stay immutable.
CREATE OR REPLACE FUNCTION public.lab_report_file_is_unregistered(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.pathology_reports WHERE storage_key = p_key);
$$;
GRANT EXECUTE ON FUNCTION public.lab_report_file_is_unregistered(TEXT) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Lab staff upload report files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Lab staff upload report files" ON storage.objects FOR INSERT TO authenticated
             WITH CHECK (bucket_id = 'lab-reports' AND public.get_auth_role() IN ('reception', 'pathology', 'admin'))$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Lab staff remove unregistered report files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Lab staff remove unregistered report files" ON storage.objects FOR DELETE TO authenticated
             USING (bucket_id = 'lab-reports' AND public.get_auth_role() IN ('reception', 'pathology', 'admin')
                    AND public.lab_report_file_is_unregistered(name))$p$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Home sample collection
-- ----------------------------------------------------------------------------
ALTER TABLE public.hospital_settings
  ADD COLUMN IF NOT EXISTS lab_home_collection_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS lab_home_collection_pincodes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS lab_home_collection_slots TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS lab_home_collection_slot_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS lab_home_collection_max_days INTEGER NOT NULL DEFAULT 7;

ALTER TABLE public.pathology_orders
  ADD COLUMN IF NOT EXISTS collection_address TEXT,
  ADD COLUMN IF NOT EXISTS collection_pincode TEXT,
  ADD COLUMN IF NOT EXISTS collection_slot TEXT,
  ADD COLUMN IF NOT EXISTS collection_fee_paise INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE public.pathology_orders ADD CONSTRAINT chk_home_collection_details CHECK (
    collection_method <> 'home'
    OR (collection_address IS NOT NULL AND collection_pincode IS NOT NULL AND collection_slot IS NOT NULL AND preferred_date IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Effective availability: the switch AND real configuration (areas, slots, fee).
CREATE OR REPLACE FUNCTION public.lab_config()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'duplicate_test_rule', lab_duplicate_test_rule,
    'online_payment_enabled', lab_online_payment_enabled AND COALESCE(is_policy_approved_by_hospital, false),
    'require_independent_verification', lab_require_independent_verification,
    'home_collection_enabled', lab_home_collection_enabled
       AND cardinality(lab_home_collection_pincodes) > 0 AND cardinality(lab_home_collection_slots) > 0
       AND lab_home_collection_fee IS NOT NULL,
    'home_collection_switch', lab_home_collection_enabled,
    'home_collection_fee', lab_home_collection_fee,
    'home_collection_pincodes', to_jsonb(lab_home_collection_pincodes),
    'home_collection_slots', to_jsonb(lab_home_collection_slots),
    'home_collection_slot_capacity', lab_home_collection_slot_capacity,
    'home_collection_max_days', lab_home_collection_max_days,
    'operating_days', to_jsonb(opd_days),
    'holidays', to_jsonb(holidays)
  )
  FROM public.hospital_settings ORDER BY updated_at DESC LIMIT 1;
$$;

-- Super Admin saves the home-collection setup. Slots are "HH:MM-HH:MM".
CREATE OR REPLACE FUNCTION public.set_lab_home_collection(
  p_enabled BOOLEAN, p_fee NUMERIC, p_pincodes TEXT[], p_slots TEXT[], p_slot_capacity INTEGER, p_max_days INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings UUID := (SELECT id FROM public.hospital_settings ORDER BY updated_at DESC LIMIT 1);
  v_pins  TEXT[] := ARRAY(SELECT DISTINCT btrim(x) FROM unnest(COALESCE(p_pincodes, '{}')) x WHERE btrim(x) <> '' ORDER BY 1);
  v_slots TEXT[] := ARRAY(SELECT DISTINCT btrim(x) FROM unnest(COALESCE(p_slots, '{}')) x WHERE btrim(x) <> '' ORDER BY 1);
BEGIN
  PERFORM public.lab_require_role(ARRAY['admin']::user_role[]);
  IF EXISTS (SELECT 1 FROM unnest(v_pins) x WHERE x !~ '^[1-9][0-9]{5}$') THEN
    RAISE EXCEPTION 'Pincodes must be 6 digits.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_slots) x WHERE x !~ '^([01][0-9]|2[0-3]):[0-5][0-9]-([01][0-9]|2[0-3]):[0-5][0-9]$' OR split_part(x, '-', 1) >= split_part(x, '-', 2)) THEN
    RAISE EXCEPTION 'Time slots must look like 07:00-09:00, with the end after the start.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_fee IS NOT NULL AND p_fee < 0 THEN
    RAISE EXCEPTION 'The fee cannot be negative.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_slot_capacity IS NOT NULL AND p_slot_capacity < 1 THEN
    RAISE EXCEPTION 'Capacity must be at least 1 (leave empty for no limit).' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_max_days, 7) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Booking window must be between 1 and 60 days.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_enabled AND (cardinality(v_pins) = 0 OR cardinality(v_slots) = 0 OR p_fee IS NULL) THEN
    RAISE EXCEPTION 'Add service pincodes, time slots and the fee (0 if free) before switching home collection on.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.hospital_settings
     SET lab_home_collection_enabled = COALESCE(p_enabled, false), lab_home_collection_fee = p_fee,
         lab_home_collection_pincodes = v_pins, lab_home_collection_slots = v_slots,
         lab_home_collection_slot_capacity = p_slot_capacity, lab_home_collection_max_days = COALESCE(p_max_days, 7),
         updated_at = NOW()
   WHERE id = v_settings;
  PERFORM public.lab_audit('settings.home_collection', 'hospital_settings', v_settings,
    format('Home collection %s; %s pincodes, %s slots, fee %s', CASE WHEN p_enabled THEN 'on' ELSE 'off' END, cardinality(v_pins), cardinality(v_slots), COALESCE(p_fee::TEXT, 'not set')));
  RETURN public.lab_config();
END;
$$;
REVOKE ALL ON FUNCTION public.set_lab_home_collection(BOOLEAN, NUMERIC, TEXT[], TEXT[], INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_lab_home_collection(BOOLEAN, NUMERIC, TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;

-- Order insert now carries collection details and adds the collection fee to the total.
DROP FUNCTION IF EXISTS public.lab_insert_order(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.lab_insert_order(
  p_patient UUID, p_user UUID, p_name TEXT, p_phone TEXT, p_source TEXT, p_collection TEXT,
  p_preferred_date DATE, p_status TEXT, p_items JSONB, p_idempotency_key TEXT,
  p_address TEXT DEFAULT NULL, p_pincode TEXT DEFAULT NULL, p_slot TEXT DEFAULT NULL, p_fee_paise INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priced JSONB := public.lab_price_cart(p_items);
  v_sub    INTEGER;
  v_id     UUID;
  v_item   JSONB;
BEGIN
  SELECT COALESCE(sum((e ->> 'price_paise')::INTEGER), 0) INTO v_sub FROM jsonb_array_elements(v_priced) e;

  FOR i IN 1..5 LOOP
    BEGIN
      INSERT INTO public.pathology_orders (
        order_number, user_id, patient_profile_id, patient_name, contact_phone, source, collection_method,
        preferred_date, status, subtotal_paise, total_paise, idempotency_key, created_by,
        collection_address, collection_pincode, collection_slot, collection_fee_paise
      ) VALUES (
        'LAB-' || to_char(public.hospital_now_ist(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)),
        p_user, p_patient, btrim(p_name), p_phone, p_source, p_collection, p_preferred_date, p_status, v_sub, v_sub + COALESCE(p_fee_paise, 0),
        p_idempotency_key, auth.uid(), p_address, p_pincode, p_slot, COALESCE(p_fee_paise, 0)
      ) RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_id FROM public.pathology_orders WHERE created_by = auth.uid() AND idempotency_key = p_idempotency_key;
      IF FOUND THEN RETURN v_id; END IF;
      IF i = 5 THEN RAISE; END IF;
    END;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_priced) LOOP
    INSERT INTO public.pathology_order_items (order_id, item_type, test_id, package_id, name, price_paise, test_ids, test_names)
    VALUES (
      v_id, v_item ->> 'item_type',
      CASE WHEN v_item ->> 'item_type' = 'test' THEN (v_item ->> 'id')::UUID END,
      CASE WHEN v_item ->> 'item_type' = 'package' THEN (v_item ->> 'id')::UUID END,
      v_item ->> 'name', (v_item ->> 'price_paise')::INTEGER,
      ARRAY(SELECT jsonb_array_elements_text(v_item -> 'test_ids'))::UUID[],
      ARRAY(SELECT jsonb_array_elements_text(v_item -> 'test_names'))
    );
  END LOOP;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.lab_insert_order(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

-- Walk-ins keep calling lab_insert_order with the first ten arguments (defaults cover the rest).

DROP FUNCTION IF EXISTS public.create_lab_order(JSONB, TEXT, TEXT, TEXT, TEXT, DATE, TEXT);
CREATE OR REPLACE FUNCTION public.create_lab_order(
  p_items JSONB, p_patient_name TEXT, p_phone TEXT, p_gender TEXT,
  p_collection_method TEXT, p_preferred_date DATE, p_idempotency_key TEXT,
  p_address TEXT DEFAULT NULL, p_pincode TEXT DEFAULT NULL, p_slot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_now     TIMESTAMP := public.hospital_now_ist();
  v_today   DATE := public.hospital_now_ist()::DATE;
  v_cfg     JSONB := public.lab_config();
  v_method  TEXT := COALESCE(p_collection_method, 'hospital_lab');
  v_id      UUID;
  v_patient UUID;
  v_fee     INTEGER := 0;
  v_taken   INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in to book lab tests.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF public.get_auth_role() IS DISTINCT FROM 'patient' THEN
    RAISE EXCEPTION 'Staff should register lab orders from the reception desk.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF btrim(COALESCE(p_idempotency_key, '')) = '' THEN
    RAISE EXCEPTION 'Missing request key.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_id FROM public.pathology_orders WHERE created_by = v_user AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN public.lab_order_json(v_id); END IF;

  PERFORM public.lab_validate_patient(p_patient_name, p_phone, p_gender);
  IF v_method NOT IN ('hospital_lab', 'home') THEN
    RAISE EXCEPTION 'Invalid collection method.' USING ERRCODE = 'check_violation';
  END IF;

  IF v_method = 'home' THEN
    IF NOT COALESCE((v_cfg ->> 'home_collection_enabled')::BOOLEAN, false) THEN
      RAISE EXCEPTION 'Home sample collection is not available yet.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(btrim(COALESCE(p_address, ''))) < 10 OR length(p_address) > 400 THEN
      RAISE EXCEPTION 'Please enter the full collection address (house, street, locality).' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (v_cfg -> 'home_collection_pincodes') ? COALESCE(btrim(p_pincode), '') THEN
      RAISE EXCEPTION 'Home collection is not available for pincode %. Please choose collection at the hospital lab.', COALESCE(btrim(p_pincode), '—') USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (v_cfg -> 'home_collection_slots') ? COALESCE(p_slot, '') THEN
      RAISE EXCEPTION 'Please choose one of the available time slots.' USING ERRCODE = 'check_violation';
    END IF;
    IF p_preferred_date IS NULL OR p_preferred_date < v_today OR p_preferred_date > v_today + (v_cfg ->> 'home_collection_max_days')::INTEGER THEN
      RAISE EXCEPTION 'Please choose a collection date within the next % days.', v_cfg ->> 'home_collection_max_days' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (v_cfg -> 'operating_days') ? trim(to_char(p_preferred_date, 'Day')) OR (v_cfg -> 'holidays') ? p_preferred_date::TEXT THEN
      RAISE EXCEPTION 'Home collection is not available on that date. Please choose another day.' USING ERRCODE = 'check_violation';
    END IF;
    IF p_preferred_date = v_today AND split_part(p_slot, '-', 1)::TIME <= v_now::TIME THEN
      RAISE EXCEPTION 'That time slot has already started today. Please choose a later slot.' USING ERRCODE = 'check_violation';
    END IF;
    -- Serialise bookings for the same date and slot so capacity can't be exceeded.
    PERFORM pg_advisory_xact_lock(hashtext('lab-home:' || p_preferred_date::TEXT || ':' || p_slot));
    IF (v_cfg ->> 'home_collection_slot_capacity') IS NOT NULL THEN
      SELECT count(*) INTO v_taken FROM public.pathology_orders
       WHERE collection_method = 'home' AND preferred_date = p_preferred_date AND collection_slot = p_slot AND status <> 'cancelled';
      IF v_taken >= (v_cfg ->> 'home_collection_slot_capacity')::INTEGER THEN
        RAISE EXCEPTION 'That time slot is fully booked. Please choose another slot.' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    v_fee := round((v_cfg ->> 'home_collection_fee')::NUMERIC * 100)::INTEGER;
  ELSIF p_preferred_date IS NOT NULL AND (p_preferred_date < v_today OR p_preferred_date > v_today + 30) THEN
    RAISE EXCEPTION 'Please choose a visit date within the next 30 days.' USING ERRCODE = 'check_violation';
  END IF;

  v_patient := public.opd_find_or_create_patient(v_user, p_patient_name, p_phone, p_gender);
  v_id := public.lab_insert_order(
    v_patient, v_user, p_patient_name, p_phone, 'online', v_method, p_preferred_date, 'pending', p_items, p_idempotency_key,
    CASE WHEN v_method = 'home' THEN btrim(p_address) END,
    CASE WHEN v_method = 'home' THEN btrim(p_pincode) END,
    CASE WHEN v_method = 'home' THEN p_slot END,
    v_fee
  );
  RETURN public.lab_order_json(v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.create_lab_order(JSONB, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lab_order(JSONB, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;
