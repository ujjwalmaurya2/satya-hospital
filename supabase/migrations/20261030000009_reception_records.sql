-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — RECEPTION APPOINTMENTS + MEDICAL RECORDS
-- Migration: 20261030000009_reception_records.sql
-- Depends on: 20261029000008 (role-aware set_appointment_status, lab helpers)
--
-- 1. Reception appointment search (any date range, IST dates, server-side
--    filters, paging) and summary counts — read with the caller's own RLS.
-- 2. Reception notes / contact-phone corrections and an audit entry for every
--    appointment status change.
-- 3. Medical documents (prescription scans, previous records, …): private
--    `medical-records` bucket, writes only through audited RPCs, versioned
--    replacements (never overwritten), doctor verification before patients
--    can see a document.
-- Idempotent: safe to run more than once. Existing rows are not modified.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Appointments: notes, index, audited status changes
-- ----------------------------------------------------------------------------
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reception_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_date_token ON public.appointments(appointment_date, token_number);

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
  v_from appointment_status;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('reception', 'doctor', 'admin') THEN
    RAISE EXCEPTION 'You are not allowed to change OPD appointments.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_appt.status = p_status THEN
    RETURN v_appt;
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

  v_from := v_appt.status;
  UPDATE public.appointments
     SET status = p_status,
         cancellation_reason = CASE WHEN p_status = 'cancelled' THEN COALESCE(p_reason, 'Cancelled at reception') ELSE cancellation_reason END
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  PERFORM public.lab_audit('appointment.status', 'appointments', v_appt.id,
    format('Token #%s on %s: %s → %s%s', v_appt.token_number, v_appt.appointment_date, v_from, p_status,
           CASE WHEN p_status = 'cancelled' THEN ' (' || COALESCE(p_reason, 'no reason given') || ')' ELSE '' END));
  RETURN v_appt;
END;
$$;

-- Reception may correct the contact number and keep desk notes. Clinical
-- fields (visit reason, doctor notes, prescriptions) are not editable here.
CREATE OR REPLACE FUNCTION public.update_appointment_details(p_appointment_id UUID, p_contact_phone TEXT, p_reception_notes TEXT)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old  public.appointments;
  v_appt public.appointments;
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_contact_phone, ''), '\D', '', 'g'), '');
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'admin']::user_role[]);
  IF v_phone IS NOT NULL AND v_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Please enter a valid 10-digit mobile number.' USING ERRCODE = 'check_violation';
  END IF;
  IF length(COALESCE(p_reception_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'Notes are limited to 1000 characters.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO v_old FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found'; END IF;

  UPDATE public.appointments
     SET contact_phone = COALESCE(v_phone, contact_phone),
         reception_notes = NULLIF(btrim(COALESCE(p_reception_notes, '')), '')
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  PERFORM public.lab_audit('appointment.details', 'appointments', v_appt.id,
    format('Token #%s on %s: %s%s', v_appt.token_number, v_appt.appointment_date,
           CASE WHEN v_old.contact_phone IS DISTINCT FROM v_appt.contact_phone THEN 'phone corrected; ' ELSE '' END,
           CASE WHEN v_old.reception_notes IS DISTINCT FROM v_appt.reception_notes THEN 'reception notes updated' ELSE 'no change' END));
  RETURN v_appt;
END;
$$;
REVOKE ALL ON FUNCTION public.update_appointment_details(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_details(UUID, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Reception search + summary (SECURITY INVOKER: the caller's RLS applies)
-- ----------------------------------------------------------------------------
-- Dates are appointment_date (an IST calendar date), never created_at.
-- p_payment: 'paid' (online or desk), 'unpaid'. p_query matches patient name,
-- phone, patient ID, booking reference or appointment code.
CREATE OR REPLACE FUNCTION public.reception_search_appointments(
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL,
  p_statuses appointment_status[] DEFAULT NULL,
  p_queue_type TEXT DEFAULT NULL,
  p_payment TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'asc',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_digits TEXT := NULLIF(regexp_replace(COALESCE(p_query, ''), '\D', '', 'g'), '');
  v_result JSONB;
BEGIN
  IF public.get_auth_role() IS NULL OR public.get_auth_role() NOT IN ('reception', 'doctor', 'admin') THEN
    RAISE EXCEPTION 'You are not allowed to search appointments.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH matched AS (
    SELECT a.*, p.full_name AS p_name, p.patient_id AS p_code, p.phone AS p_phone, d.full_name AS d_name
      FROM public.appointments a
      LEFT JOIN public.patient_profiles p ON p.id = a.patient_profile_id
      LEFT JOIN public.doctor_profiles d ON d.id = a.doctor_id
     WHERE (p_from IS NULL OR a.appointment_date >= p_from)
       AND (p_to IS NULL OR a.appointment_date <= p_to)
       AND (p_statuses IS NULL OR cardinality(p_statuses) = 0 OR a.status = ANY (p_statuses))
       AND (p_queue_type IS NULL OR a.queue_type::TEXT = p_queue_type)
       AND (p_payment IS NULL
            OR (p_payment = 'paid' AND (a.payment_status = 'paid' OR a.fee_payment_mode IS NOT NULL))
            OR (p_payment = 'unpaid' AND a.payment_status <> 'paid' AND a.fee_payment_mode IS NULL))
       AND (v_q IS NULL
            OR p.full_name ILIKE '%' || v_q || '%'
            OR p.patient_id ILIKE '%' || v_q || '%'
            OR a.booking_reference ILIKE '%' || v_q || '%'
            OR a.appointment_code ILIKE '%' || v_q || '%'
            OR (v_digits IS NOT NULL AND length(v_digits) >= 4 AND (p.phone LIKE '%' || v_digits || '%' OR a.contact_phone LIKE '%' || v_digits || '%')))
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM matched),
    'rows', COALESCE((
      SELECT jsonb_agg(row ORDER BY ord)
        FROM (
          SELECT to_jsonb(m) - 'p_name' - 'p_code' - 'p_phone' - 'd_name'
                   || jsonb_build_object('patient', jsonb_build_object('full_name', m.p_name, 'patient_id', m.p_code, 'phone', m.p_phone),
                                         'doctor', CASE WHEN m.d_name IS NULL THEN NULL ELSE jsonb_build_object('full_name', m.d_name) END) AS row,
                 row_number() OVER (ORDER BY
                   CASE WHEN p_sort = 'desc' THEN m.appointment_date END DESC,
                   CASE WHEN p_sort = 'desc' THEN NULL ELSE m.appointment_date END ASC,
                   m.token_number) AS ord
            FROM matched m
           ORDER BY ord
           LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
        ) page
    ), '[]'::JSONB)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.reception_search_appointments(DATE, DATE, appointment_status[], TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reception_search_appointments(DATE, DATE, appointment_status[], TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Counts for one day (by status and source) plus everything booked after it.
CREATE OR REPLACE FUNCTION public.reception_appointment_summary(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF public.get_auth_role() IS NULL OR public.get_auth_role() NOT IN ('reception', 'doctor', 'admin') THEN
    RAISE EXCEPTION 'You are not allowed to view appointment counts.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT jsonb_build_object(
    'date', p_date,
    'total', count(*) FILTER (WHERE appointment_date = p_date),
    'booked', count(*) FILTER (WHERE appointment_date = p_date AND status = 'booked'),
    'checked_in', count(*) FILTER (WHERE appointment_date = p_date AND status = 'checked_in'),
    'in_consultation', count(*) FILTER (WHERE appointment_date = p_date AND status = 'in_consultation'),
    'completed', count(*) FILTER (WHERE appointment_date = p_date AND status = 'completed'),
    'cancelled', count(*) FILTER (WHERE appointment_date = p_date AND status = 'cancelled'),
    'no_show', count(*) FILTER (WHERE appointment_date = p_date AND status = 'no_show'),
    'walk_in', count(*) FILTER (WHERE appointment_date = p_date AND queue_type = 'walk_in'),
    'online', count(*) FILTER (WHERE appointment_date = p_date AND queue_type = 'online'),
    'upcoming', count(*) FILTER (WHERE appointment_date > p_date AND status NOT IN ('cancelled'))
  ) INTO v_result
  FROM public.appointments
  WHERE appointment_date >= p_date;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.reception_appointment_summary(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reception_appointment_summary(DATE) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Medical documents
-- ----------------------------------------------------------------------------
ALTER TABLE public.medical_documents
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS record_date DATE,
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID REFERENCES public.medical_documents(id),
  ADD COLUMN IF NOT EXISTS replace_reason TEXT,
  -- Staff can't read other users' profiles, so the uploader's name is stored with the record.
  ADD COLUMN IF NOT EXISTS uploader_name TEXT;
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON public.medical_documents(patient_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_documents_appointment ON public.medical_documents(appointment_id);

-- Least privilege: staff may read; every write goes through the RPCs below.
DROP POLICY IF EXISTS "Doctor & Reception manage medical documents" ON public.medical_documents;
DROP POLICY IF EXISTS "Staff read medical documents" ON public.medical_documents;
CREATE POLICY "Staff read medical documents" ON public.medical_documents FOR SELECT
  USING (public.get_auth_role() IN ('reception', 'doctor', 'admin'));
-- Patients: their own, doctor-verified, current version only.
DROP POLICY IF EXISTS "Patients view own verified prescriptions" ON public.medical_documents;
CREATE POLICY "Patients view own verified prescriptions" ON public.medical_documents FOR SELECT
  USING (
    patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())
    AND verification_status = 'verified' AND superseded_by_id IS NULL
  );

CREATE OR REPLACE FUNCTION public.register_medical_document(
  p_patient_profile_id UUID,
  p_appointment_id UUID,
  p_document_type TEXT,
  p_title TEXT,
  p_file_name TEXT,
  p_file_size INTEGER,
  p_mime_type TEXT,
  p_storage_key TEXT,
  p_record_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_replaces_id UUID DEFAULT NULL,
  p_replace_reason TEXT DEFAULT NULL
)
RETURNS public.medical_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   user_role := public.lab_require_role(ARRAY['reception', 'doctor', 'admin']::user_role[]);
  v_actor  public.profiles;
  v_ext    TEXT := lower(substring(COALESCE(p_file_name, '') FROM '\.([A-Za-z0-9]+)$'));
  v_exists BOOLEAN := true;
  v_old    public.medical_documents;
  v_doc    public.medical_documents;
BEGIN
  SELECT * INTO v_actor FROM public.profiles WHERE id = auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.patient_profiles WHERE id = p_patient_profile_id) THEN
    RAISE EXCEPTION 'Patient not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF p_appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appointments WHERE id = p_appointment_id AND patient_profile_id = p_patient_profile_id
  ) THEN
    RAISE EXCEPTION 'That appointment does not belong to this patient.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_document_type NOT IN ('prescription', 'previous_record', 'pathology_report', 'diagnostic_report', 'discharge_summary', 'other') THEN
    RAISE EXCEPTION 'Choose a record type.' USING ERRCODE = 'check_violation';
  END IF;
  IF btrim(COALESCE(p_title, '')) = '' OR length(p_title) > 200 THEN
    RAISE EXCEPTION 'Give the document a short name.' USING ERRCODE = 'check_violation';
  END IF;
  -- Extension and declared type must agree and be one of the allowed formats.
  IF NOT ((v_ext = 'pdf' AND p_mime_type = 'application/pdf')
       OR (v_ext IN ('jpg', 'jpeg') AND p_mime_type = 'image/jpeg')
       OR (v_ext = 'png' AND p_mime_type = 'image/png')) THEN
    RAISE EXCEPTION 'Only PDF, JPG and PNG files can be uploaded.' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_file_size, 0) <= 0 OR p_file_size > 10485760 THEN
    RAISE EXCEPTION 'Files must be 10 MB or smaller.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_record_date IS NOT NULL AND p_record_date > public.hospital_now_ist()::DATE THEN
    RAISE EXCEPTION 'The record date cannot be in the future.' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_storage_key, '') NOT LIKE 'patients/' || p_patient_profile_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'The file was not uploaded for this patient.' USING ERRCODE = 'check_violation';
  END IF;
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = ''medical-records'' AND name = $1)' INTO v_exists USING p_storage_key;
  END IF;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'The uploaded file was not found in storage. Please upload it again.' USING ERRCODE = 'no_data_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.medical_documents WHERE storage_key = p_storage_key) THEN
    RAISE EXCEPTION 'This file is already attached to a record.' USING ERRCODE = 'unique_violation';
  END IF;

  IF p_replaces_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.medical_documents WHERE id = p_replaces_id FOR UPDATE;
    IF NOT FOUND OR v_old.patient_profile_id <> p_patient_profile_id THEN
      RAISE EXCEPTION 'The record being replaced does not belong to this patient.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_old.superseded_by_id IS NOT NULL THEN
      RAISE EXCEPTION 'That record has already been replaced.' USING ERRCODE = 'check_violation';
    END IF;
    IF btrim(COALESCE(p_replace_reason, '')) = '' THEN
      RAISE EXCEPTION 'Give a reason for replacing the record.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.medical_documents (
    patient_profile_id, appointment_id, document_type, title, file_name, file_size, mime_type, storage_key,
    uploader_id, uploader_name, uploader_role, verification_status, verified_by, verified_at, notes, record_date, replace_reason
  ) VALUES (
    p_patient_profile_id, p_appointment_id, p_document_type, btrim(p_title), p_file_name, p_file_size, p_mime_type, p_storage_key,
    auth.uid(), v_actor.full_name, v_role,
    -- A doctor's own upload is already doctor-verified; reception uploads wait for a doctor.
    CASE WHEN v_role IN ('doctor', 'admin') THEN 'verified' ELSE 'unverified' END::document_verification_status,
    CASE WHEN v_role IN ('doctor', 'admin') THEN v_actor.full_name END,
    CASE WHEN v_role IN ('doctor', 'admin') THEN NOW() END,
    NULLIF(btrim(COALESCE(p_notes, '')), ''), p_record_date, NULLIF(btrim(COALESCE(p_replace_reason, '')), '')
  ) RETURNING * INTO v_doc;

  IF p_replaces_id IS NOT NULL THEN
    UPDATE public.medical_documents SET superseded_by_id = v_doc.id WHERE id = p_replaces_id;
  END IF;
  PERFORM public.lab_audit(CASE WHEN p_replaces_id IS NULL THEN 'medical_document.uploaded' ELSE 'medical_document.replaced' END,
    'medical_documents', v_doc.id, format('%s (%s) for patient %s', v_doc.title, v_doc.document_type, p_patient_profile_id));
  RETURN v_doc;
END;
$$;
REVOKE ALL ON FUNCTION public.register_medical_document(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DATE, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_medical_document(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DATE, TEXT, UUID, TEXT) TO authenticated;

-- Doctor sign-off makes a document visible to the patient. Repeating it is a no-op.
CREATE OR REPLACE FUNCTION public.verify_medical_document(p_document_id UUID)
RETURNS public.medical_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.medical_documents;
  v_actor public.profiles;
BEGIN
  PERFORM public.lab_require_role(ARRAY['doctor', 'admin']::user_role[]);
  SELECT * INTO v_doc FROM public.medical_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found.' USING ERRCODE = 'no_data_found'; END IF;
  IF v_doc.verification_status = 'verified' THEN RETURN v_doc; END IF;
  SELECT * INTO v_actor FROM public.profiles WHERE id = auth.uid();
  UPDATE public.medical_documents SET verification_status = 'verified', verified_by = v_actor.full_name, verified_at = NOW()
   WHERE id = p_document_id RETURNING * INTO v_doc;
  PERFORM public.lab_audit('medical_document.verified', 'medical_documents', v_doc.id, v_doc.title);
  RETURN v_doc;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_medical_document(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_medical_document(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_medical_record_file(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_auth_role() IN ('reception', 'doctor', 'admin') THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.medical_documents d
       WHERE d.storage_key = p_key AND d.verification_status = 'verified' AND d.superseded_by_id IS NULL
         AND d.patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid()))
  END;
$$;
GRANT EXECUTE ON FUNCTION public.can_read_medical_record_file(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.medical_record_file_is_unregistered(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.medical_documents WHERE storage_key = p_key);
$$;
GRANT EXECUTE ON FUNCTION public.medical_record_file_is_unregistered(TEXT) TO authenticated;

-- Private bucket: PDF / JPEG / PNG, 10 MB. Registered files are immutable;
-- only a never-registered upload (failed save) may be deleted by staff.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('medical-records', 'medical-records', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

    EXECUTE 'DROP POLICY IF EXISTS "Staff upload medical record files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Staff upload medical record files" ON storage.objects FOR INSERT TO authenticated
             WITH CHECK (bucket_id = 'medical-records' AND public.get_auth_role() IN ('reception', 'doctor', 'admin'))$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Authorised read of medical record files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Authorised read of medical record files" ON storage.objects FOR SELECT TO authenticated
             USING (bucket_id = 'medical-records' AND public.can_read_medical_record_file(name))$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Staff remove unregistered medical record files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Staff remove unregistered medical record files" ON storage.objects FOR DELETE TO authenticated
             USING (bucket_id = 'medical-records' AND public.get_auth_role() IN ('reception', 'doctor', 'admin')
                    AND public.medical_record_file_is_unregistered(name))$p$;
  END IF;
END $$;
