-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — STAFF / RECEPTION QUEUE DESK
-- Migration: 20261024000003_staff_queue_desk.sql
-- Depends on: complete_satya_hospital_setup.sql (or 20261022000001 + 20261023000002)
--
-- What this adds:
--   1. Consultation-fee + queue timestamp columns on appointments.
--   2. A BEFORE INSERT trigger that ALWAYS assigns token_number from the atomic
--      daily counter, so online bookings and walk-ins share one sequence no
--      matter which client inserts them. It also enforces the IST booking
--      window: online booking for a date opens the day before and closes at
--      09:00 AM IST on the day itself; walk-ins are today-only.
--   3. A BEFORE UPDATE trigger that validates queue status transitions.
--   4. Staff RPCs: register_walk_in, call_next_token, set_appointment_status,
--      record_consultation_fee.
--   5. Hardening: RLS on the token counter table, revoke direct execute of the
--      allocator, auto-create a `profiles` row for new auth users.
--   6. Realtime publication for the live queue.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS fee_payment_mode TEXT,
  ADD COLUMN IF NOT EXISTS fee_collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fee_collected_by UUID REFERENCES auth.users(id);

DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT chk_fee_payment_mode CHECK (fee_payment_mode IS NULL OR fee_payment_mode IN ('cash', 'upi'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Token counter hardening
-- ----------------------------------------------------------------------------
-- The counter table was readable/writable through the REST API without RLS.
-- Only SECURITY DEFINER functions touch it now.
ALTER TABLE public.daily_opd_token_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.allocate_daily_opd_token(DATE) FROM PUBLIC, anon, authenticated;

-- Bring counters up to the highest token already stored, so the trigger never
-- hands out a number that collides with rows inserted before this migration.
INSERT INTO public.daily_opd_token_counters (appointment_date, last_token_number, updated_at)
SELECT appointment_date, MAX(token_number), NOW()
FROM public.appointments
GROUP BY appointment_date
ON CONFLICT (appointment_date) DO UPDATE
  SET last_token_number = GREATEST(public.daily_opd_token_counters.last_token_number, EXCLUDED.last_token_number),
      updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3. Insert trigger: atomic token + IST booking window
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.appointments_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_ist   TIMESTAMP := NOW() AT TIME ZONE 'Asia/Kolkata';
  v_today     DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_cutoff    TIME := '09:00';
  v_days      TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  v_holidays  TEXT[] := ARRAY[]::TEXT[];
  v_online_ok BOOLEAN := true;
  v_role      user_role := public.get_auth_role();
BEGIN
  SELECT COALESCE(online_cutoff_time, '09:00')::TIME,
         COALESCE(opd_days, v_days),
         COALESCE(holidays, v_holidays),
         COALESCE(is_online_booking_enabled, true)
    INTO v_cutoff, v_days, v_holidays, v_online_ok
    FROM public.hospital_settings
   ORDER BY updated_at DESC
   LIMIT 1;

  IF NEW.queue_type = 'walk_in' THEN
    IF NEW.appointment_date <> v_today THEN
      RAISE EXCEPTION 'Walk-in tokens can only be issued for today''s OPD (%).', v_today
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_role IS DISTINCT FROM 'reception' AND v_role IS DISTINCT FROM 'admin' THEN
    -- Online booking rules apply to patients. Reception/admin may still
    -- reconcile a delayed online payment after the cutoff.
    IF NOT v_online_ok THEN
      RAISE EXCEPTION 'Online booking is currently disabled. Please visit the reception desk.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.appointment_date < v_today OR NEW.appointment_date > v_today + 1 THEN
      RAISE EXCEPTION 'Online booking for % is not open. Bookings open 1 day before the OPD date.', NEW.appointment_date
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.appointment_date = v_today AND v_now_ist::TIME >= v_cutoff THEN
      RAISE EXCEPTION 'Online booking for today closed at % AM IST. Walk-in tokens are available at reception (OPD begins 09:30 AM).', to_char(v_cutoff, 'HH24:MI')
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (to_char(NEW.appointment_date, 'FMDay') = ANY (v_days))
       OR NEW.appointment_date::TEXT = ANY (v_holidays) THEN
      RAISE EXCEPTION 'OPD is closed on %.', NEW.appointment_date
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Never trust a client-supplied token or code.
  NEW.token_number := public.allocate_daily_opd_token(NEW.appointment_date);
  NEW.appointment_code := 'APT-' || to_char(NEW.appointment_date, 'YYYYMMDD') || '-' || LPAD(NEW.token_number::TEXT, 3, '0');

  IF NEW.status = 'checked_in' AND NEW.checked_in_at IS NULL THEN
    NEW.checked_in_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_before_insert ON public.appointments;
CREATE TRIGGER trg_appointments_before_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_before_insert();

-- ----------------------------------------------------------------------------
-- 4. Update trigger: status transitions + immutable token
-- ----------------------------------------------------------------------------
-- Keep in sync with QUEUE_TRANSITIONS in src/lib/queue.ts
CREATE OR REPLACE FUNCTION public.is_valid_queue_transition(p_from appointment_status, p_to appointment_status)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_from = p_to OR CASE p_from
    WHEN 'booked'          THEN p_to IN ('checked_in', 'no_show', 'cancelled')
    WHEN 'checked_in'      THEN p_to IN ('in_consultation', 'completed', 'no_show', 'cancelled')
    WHEN 'in_consultation' THEN p_to IN ('completed', 'checked_in', 'no_show')
    WHEN 'no_show'         THEN p_to IN ('checked_in')
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.appointments_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.token_number := OLD.token_number;
  NEW.appointment_date := OLD.appointment_date;
  NEW.appointment_code := OLD.appointment_code;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_valid_queue_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Token #% cannot move from % to %.', OLD.token_number, OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'checked_in' THEN NEW.checked_in_at := COALESCE(NEW.checked_in_at, NOW()); END IF;
    IF NEW.status = 'in_consultation' THEN NEW.called_at := NOW(); END IF;
    IF NEW.status = 'completed' THEN NEW.completed_at := NOW(); END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_before_update ON public.appointments;
CREATE TRIGGER trg_appointments_before_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_before_update();

-- ----------------------------------------------------------------------------
-- 5. Staff RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_queue_staff()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_auth_role() IS NULL OR public.get_auth_role() NOT IN ('reception', 'admin') THEN
    RAISE EXCEPTION 'Only reception or admin staff can manage the OPD queue.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- 5.1 Register a walk-in: find-or-create the patient and issue the next token
--     in one transaction.
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
  v_today   DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
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

-- 5.2 Call the lowest checked-in token into consultation. SKIP LOCKED means two
--     desks pressing "Call Next" at once get two different patients.
CREATE OR REPLACE FUNCTION public.call_next_token()
RETURNS SETOF public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_id    UUID;
BEGIN
  PERFORM public.assert_queue_staff();

  SELECT id INTO v_id
    FROM public.appointments
   WHERE appointment_date = v_today AND status = 'checked_in'
   ORDER BY token_number
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    UPDATE public.appointments SET status = 'in_consultation'
     WHERE id = v_id
    RETURNING *;
END;
$$;

-- 5.3 Move one appointment to a new status (validated by the update trigger).
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
  v_appt public.appointments;
BEGIN
  PERFORM public.assert_queue_staff();

  UPDATE public.appointments
     SET status = p_status,
         cancellation_reason = CASE WHEN p_status = 'cancelled' THEN COALESCE(p_reason, 'Cancelled at reception') ELSE cancellation_reason END
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_appt;
END;
$$;

-- 5.4 Record (or clear, with p_mode NULL) the consultation fee.
CREATE OR REPLACE FUNCTION public.record_consultation_fee(
  p_appointment_id UUID,
  p_mode TEXT
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt public.appointments;
BEGIN
  PERFORM public.assert_queue_staff();

  IF p_mode IS NOT NULL AND p_mode NOT IN ('cash', 'upi') THEN
    RAISE EXCEPTION 'Payment mode must be cash or upi.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.appointments
     SET fee_payment_mode = p_mode,
         payment_status   = CASE WHEN p_mode IS NULL THEN 'unpaid' ELSE 'paid' END,
         fee_collected_at = CASE WHEN p_mode IS NULL THEN NULL ELSE NOW() END,
         fee_collected_by = CASE WHEN p_mode IS NULL THEN NULL ELSE auth.uid() END
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_appt;
END;
$$;

REVOKE ALL ON FUNCTION public.register_walk_in(TEXT, TEXT, TEXT, DATE, TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.call_next_token() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_appointment_status(UUID, appointment_status, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_consultation_fee(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_walk_in(TEXT, TEXT, TEXT, DATE, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.call_next_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_appointment_status(UUID, appointment_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_consultation_fee(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Auto-create a profile row for every new auth user (role defaults to
--    'patient'; an admin promotes staff — see supabase/README.md).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::TEXT || '@users.satya.local'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    'patient'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 7. Realtime for the live queue (RLS still applies to subscribers)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;
