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
-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — PUBLIC CONTACT ENQUIRIES
-- Migration: 20261024000004_contact_enquiries.sql
-- Depends on: 20261022000001 (profiles, user_role, get_auth_role)
--
-- What this adds:
--   1. `contact_enquiries` — messages sent from the public /contact form.
--   2. RLS: anyone (anon or signed in) may INSERT a well-formed enquiry; only
--      reception/admin may read it or change its status. Nobody may delete
--      through the API.
--   3. A BEFORE INSERT trigger that pins server-controlled columns (status,
--      timestamps) and throttles repeat submissions from one phone number.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  topic       TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  handled_by  UUID REFERENCES auth.users(id),
  handled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_enquiry_name    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT chk_enquiry_phone   CHECK (phone ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT chk_enquiry_email   CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  CONSTRAINT chk_enquiry_topic   CHECK (char_length(btrim(topic)) BETWEEN 1 AND 60),
  CONSTRAINT chk_enquiry_message CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  CONSTRAINT chk_enquiry_status  CHECK (status IN ('new', 'contacted', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_status_created
  ON public.contact_enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_phone_created
  ON public.contact_enquiries (phone, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Insert trigger: server-controlled columns + simple throttle
-- ----------------------------------------------------------------------------
-- Runs as definer so it can count recent rows even though anon cannot SELECT.
CREATE OR REPLACE FUNCTION public.contact_enquiries_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INTEGER;
BEGIN
  NEW.name       := btrim(NEW.name);
  NEW.phone      := regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g');
  NEW.email      := NULLIF(btrim(COALESCE(NEW.email, '')), '');
  NEW.topic      := btrim(NEW.topic);
  NEW.message    := btrim(NEW.message);
  NEW.status     := 'new';
  NEW.handled_by := NULL;
  NEW.handled_at := NULL;
  NEW.created_at := NOW();

  SELECT COUNT(*) INTO v_recent
    FROM public.contact_enquiries
   WHERE phone = NEW.phone
     AND created_at > NOW() - INTERVAL '10 minutes';
  IF v_recent >= 3 THEN
    RAISE EXCEPTION 'Too many enquiries from this number. Please wait a few minutes or call reception.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_enquiries_before_insert ON public.contact_enquiries;
CREATE TRIGGER trg_contact_enquiries_before_insert
  BEFORE INSERT ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.contact_enquiries_before_insert();

-- Staff may only move the status; the enquiry text itself is immutable.
CREATE OR REPLACE FUNCTION public.contact_enquiries_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id         := OLD.id;
  NEW.name       := OLD.name;
  NEW.phone      := OLD.phone;
  NEW.email      := OLD.email;
  NEW.topic      := OLD.topic;
  NEW.message    := OLD.message;
  NEW.created_at := OLD.created_at;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.handled_by := auth.uid();
    NEW.handled_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_enquiries_before_update ON public.contact_enquiries;
CREATE TRIGGER trg_contact_enquiries_before_update
  BEFORE UPDATE ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.contact_enquiries_before_update();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Submit Enquiry" ON public.contact_enquiries;
CREATE POLICY "Public Submit Enquiry" ON public.contact_enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND char_length(btrim(name)) BETWEEN 1 AND 120
    AND char_length(btrim(topic)) BETWEEN 1 AND 60
    AND char_length(btrim(message)) BETWEEN 1 AND 2000
    AND (email IS NULL OR char_length(email) <= 254)
  );

DROP POLICY IF EXISTS "Reception Read Enquiries" ON public.contact_enquiries;
CREATE POLICY "Reception Read Enquiries" ON public.contact_enquiries
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('reception', 'admin'));

DROP POLICY IF EXISTS "Reception Update Enquiries" ON public.contact_enquiries;
CREATE POLICY "Reception Update Enquiries" ON public.contact_enquiries
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('reception', 'admin'))
  WITH CHECK (public.get_auth_role() IN ('reception', 'admin'));

-- No DELETE policy: enquiries are closed, not removed.
REVOKE DELETE, TRUNCATE ON public.contact_enquiries FROM anon, authenticated;
GRANT INSERT ON public.contact_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_enquiries TO authenticated;
-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — ONLINE OPD BOOKING + RAZORPAY PAYMENTS
-- Migration: 20261025000004_opd_online_booking_payments.sql
-- Depends on: complete_satya_hospital_setup.sql, 20261024000003_staff_queue_desk.sql
--
-- Business rules (Asia/Kolkata, enforced here, never trusted from the browser):
--   * Patients may book any eligible OPD date up to `max_advance_booking_days`
--     ahead (replaces the old "opens 1 day before" window).
--   * Same-day online booking closes at `online_cutoff_time` (09:00) on that
--     date; at or after the cutoff the request is rejected.
--   * Dates outside `opd_days` or listed in `holidays` are closed.
--   * Reception/admin can still register walk-ins after the cutoff.
--
-- Payment flow (see supabase/functions):
--   prepare_opd_payment (patient JWT)  -> opd_payment_orders row (awaiting_payment)
--   Edge Function creates the Razorpay order from the DB amount -> attach_razorpay_order
--   Edge Function verifies signature / webhook -> confirm_opd_payment (service_role)
--   confirm_opd_payment inserts the appointment exactly once; the existing
--   insert trigger assigns the shared daily token atomically.
--   Payments that arrive after the date became ineligible, or that would
--   duplicate a booking, are kept as `needs_reconciliation` — never discarded.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Hospital clock. `app.test_now_ist` lets the SQL test harness freeze time;
--    PostgREST clients cannot set custom GUCs, so production always uses now().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hospital_now_ist()
RETURNS TIMESTAMP
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.test_now_ist', true), '')::TIMESTAMP, NOW() AT TIME ZONE 'Asia/Kolkata');
$$;

-- ----------------------------------------------------------------------------
-- 2. Schema additions
-- ----------------------------------------------------------------------------
ALTER TABLE public.hospital_settings
  ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER NOT NULL DEFAULT 30;

DO $$ BEGIN
  ALTER TABLE public.hospital_settings
    ADD CONSTRAINT chk_max_advance_booking_days CHECK (max_advance_booking_days BETWEEN 1 AND 180);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.hospital_settings.online_booking_window_days IS
  'Deprecated by max_advance_booking_days (20261025000004). Kept for compatibility.';

-- Gender is optional on the public booking form.
ALTER TABLE public.patient_profiles ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_reference TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS visit_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_booking_reference
  ON public.appointments(booking_reference) WHERE booking_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_payment_reference
  ON public.appointments(payment_reference) WHERE payment_reference IS NOT NULL;

-- One row per online booking attempt that needs payment.
CREATE TABLE IF NOT EXISTS public.opd_payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  patient_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  visit_reason TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid', 'cancelled', 'needs_reconciliation', 'refunded', 'resolved')),
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount_received_paise INTEGER,
  appointment_id UUID UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  last_payment_error TEXT,
  reconciliation_reason TEXT,
  resolution_note TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  confirmed_via TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_opd_order_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_opd_orders_status ON public.opd_payment_orders(status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_opd_orders_user ON public.opd_payment_orders(user_id);

ALTER TABLE public.opd_payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients view own OPD payments" ON public.opd_payment_orders;
CREATE POLICY "Patients view own OPD payments" ON public.opd_payment_orders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Reception view OPD payments" ON public.opd_payment_orders;
CREATE POLICY "Reception view OPD payments" ON public.opd_payment_orders FOR SELECT
  USING (public.get_auth_role() IN ('reception', 'admin'));
-- No INSERT/UPDATE/DELETE policies: rows change only through the functions below.

-- Processed webhook event ids (idempotency). Service role only.
CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  razorpay_order_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

-- Online bookings must go through the RPCs (payment / eligibility checks);
-- patients can no longer insert appointment rows directly.
DROP POLICY IF EXISTS "Patients book own appointment" ON public.appointments;

-- ----------------------------------------------------------------------------
-- 3. Eligibility (single source of truth for the cutoff / window rules)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opd_booking_eligibility(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now      TIMESTAMP := public.hospital_now_ist();
  v_today    DATE := (public.hospital_now_ist())::DATE;
  v_cutoff   TIME := '09:00';
  v_days     TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  v_holidays TEXT[] := ARRAY[]::TEXT[];
  v_enabled  BOOLEAN := true;
  v_max      INTEGER := 30;
  v_next     DATE;
  v_candidate DATE;
  v_allowed  BOOLEAN := true;
  v_code     TEXT := 'ok';
  v_reason   TEXT := NULL;
BEGIN
  SELECT COALESCE(online_cutoff_time, '09:00')::TIME, COALESCE(opd_days, v_days), COALESCE(holidays, v_holidays),
         COALESCE(is_online_booking_enabled, true), COALESCE(max_advance_booking_days, 30)
    INTO v_cutoff, v_days, v_holidays, v_enabled, v_max
    FROM public.hospital_settings ORDER BY updated_at DESC LIMIT 1;

  -- Next date that is bookable right now.
  FOR i IN 0..v_max LOOP
    v_candidate := v_today + i;
    CONTINUE WHEN i = 0 AND v_now::TIME >= v_cutoff;
    CONTINUE WHEN NOT (to_char(v_candidate, 'FMDay') = ANY (v_days)) OR v_candidate::TEXT = ANY (v_holidays);
    v_next := v_candidate;
    EXIT;
  END LOOP;

  IF NOT v_enabled THEN
    v_allowed := false; v_code := 'online_booking_disabled';
    v_reason := 'Online booking is currently paused. Please contact the reception desk.';
  ELSIF p_date IS NULL OR p_date < v_today THEN
    v_allowed := false; v_code := 'past_date';
    v_reason := 'Please choose today or a future date.';
  ELSIF p_date = v_today AND v_now::TIME >= v_cutoff THEN
    v_allowed := false; v_code := 'cutoff_passed';
    v_reason := format('Online booking for today closed at %s AM IST. Walk-in tokens are available at reception once OPD begins.', to_char(v_cutoff, 'HH24:MI'));
  ELSIF p_date > v_today + v_max THEN
    v_allowed := false; v_code := 'beyond_window';
    v_reason := format('Online booking is open up to %s days ahead.', v_max);
  ELSIF NOT (to_char(p_date, 'FMDay') = ANY (v_days)) OR p_date::TEXT = ANY (v_holidays) THEN
    v_allowed := false; v_code := 'opd_closed';
    v_reason := 'OPD is closed on the selected date.';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'code', v_code,
    'reason', v_reason,
    'today', v_today,
    'next_eligible_date', v_next,
    'max_date', v_today + v_max,
    'cutoff_time', to_char(v_cutoff, 'HH24:MI')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.opd_booking_eligibility(DATE) TO anon, authenticated, service_role;

-- Re-point the insert trigger's online-booking rules at the shared function.
CREATE OR REPLACE FUNCTION public.appointments_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (public.hospital_now_ist())::DATE;
  v_role  user_role := public.get_auth_role();
  v_check JSONB;
BEGIN
  IF NEW.queue_type = 'walk_in' THEN
    IF NEW.appointment_date <> v_today THEN
      RAISE EXCEPTION 'Walk-in tokens can only be issued for today''s OPD (%).', v_today
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_role IS DISTINCT FROM 'reception' AND v_role IS DISTINCT FROM 'admin' THEN
    v_check := public.opd_booking_eligibility(NEW.appointment_date);
    IF NOT (v_check ->> 'allowed')::BOOLEAN THEN
      RAISE EXCEPTION '%', v_check ->> 'reason' USING ERRCODE = 'check_violation';
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

-- ----------------------------------------------------------------------------
-- 4. Helpers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opd_validate_details(p_name TEXT, p_phone TEXT, p_gender TEXT, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF btrim(COALESCE(p_name, '')) = '' OR length(btrim(p_name)) > 120 THEN
    RAISE EXCEPTION 'Please enter the patient''s name.' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_phone, '') !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Please enter a valid 10-digit mobile number.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_gender IS NOT NULL AND p_gender NOT IN ('male', 'female', 'other') THEN
    RAISE EXCEPTION 'Invalid gender value.' USING ERRCODE = 'check_violation';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' OR length(btrim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'Please tell us the reason for the visit (up to 500 characters).' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Find the caller's patient record for this person, or create it. Matching on
-- name keeps one record per family member under a parent's Google account.
CREATE OR REPLACE FUNCTION public.opd_find_or_create_patient(p_user UUID, p_name TEXT, p_phone TEXT, p_gender TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.patient_profiles
   WHERE profile_id = p_user AND lower(btrim(full_name)) = lower(btrim(p_name))
   ORDER BY created_at LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.patient_profiles (profile_id, full_name, phone, gender)
    VALUES (p_user, btrim(p_name), p_phone, p_gender)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.patient_profiles
       SET phone = p_phone, gender = COALESCE(p_gender, gender), updated_at = NOW()
     WHERE id = v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.opd_find_or_create_patient(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.opd_new_booking_reference(p_date DATE)
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'SH-' || to_char(p_date, 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6));
$$;

CREATE OR REPLACE FUNCTION public.opd_payment_config()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'online_payment_enabled',
      COALESCE(is_online_payment_enabled, false) AND COALESCE(is_policy_approved_by_hospital, false)
      AND consultation_fee IS NOT NULL AND consultation_fee > 0,
    'consultation_fee', consultation_fee,
    'currency', 'INR'
  )
  FROM public.hospital_settings ORDER BY updated_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.opd_payment_config() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Patient-facing RPCs
-- ----------------------------------------------------------------------------

-- 5.1 Start (or resume) a paid online booking. Amount comes only from settings.
CREATE OR REPLACE FUNCTION public.prepare_opd_payment(
  p_date DATE,
  p_patient_name TEXT,
  p_phone TEXT,
  p_gender TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_check   JSONB;
  v_config  JSONB := public.opd_payment_config();
  v_patient UUID;
  v_order   public.opd_payment_orders;
  v_amount  INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in to book an appointment.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF btrim(COALESCE(p_idempotency_key, '')) = '' THEN
    RAISE EXCEPTION 'Missing request key.' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE((v_config ->> 'online_payment_enabled')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Online payment is not enabled yet.' USING ERRCODE = 'feature_not_supported';
  END IF;

  -- Same request replayed (double click / network retry): return it unchanged.
  SELECT * INTO v_order FROM public.opd_payment_orders WHERE user_id = v_user AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN to_jsonb(v_order) - 'user_id' - 'idempotency_key';
  END IF;

  PERFORM public.opd_validate_details(p_patient_name, p_phone, p_gender, p_reason);
  v_check := public.opd_booking_eligibility(p_date);
  IF NOT (v_check ->> 'allowed')::BOOLEAN THEN
    RAISE EXCEPTION '%', v_check ->> 'reason' USING ERRCODE = 'check_violation';
  END IF;

  v_patient := public.opd_find_or_create_patient(v_user, p_patient_name, p_phone, p_gender);

  IF EXISTS (
    SELECT 1 FROM public.appointments
     WHERE patient_profile_id = v_patient AND appointment_date = p_date AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION '% already has an appointment on this date.', btrim(p_patient_name) USING ERRCODE = 'unique_violation';
  END IF;

  -- One unpaid attempt per patient and date: reuse it so a second tab or a
  -- retry pays the same Razorpay order instead of creating a second charge.
  SELECT * INTO v_order FROM public.opd_payment_orders
   WHERE user_id = v_user AND patient_profile_id = v_patient AND appointment_date = p_date
     AND status IN ('awaiting_payment', 'cancelled')
   ORDER BY created_at DESC LIMIT 1
   FOR UPDATE;
  IF FOUND THEN
    UPDATE public.opd_payment_orders
       SET status = 'awaiting_payment', contact_phone = p_phone, gender = p_gender,
           visit_reason = btrim(p_reason), last_payment_error = NULL, updated_at = NOW()
     WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN to_jsonb(v_order) - 'user_id' - 'idempotency_key';
  END IF;

  v_amount := round((v_config ->> 'consultation_fee')::NUMERIC * 100)::INTEGER;

  FOR i IN 1..5 LOOP
    BEGIN
      INSERT INTO public.opd_payment_orders (
        booking_reference, user_id, patient_profile_id, appointment_date, patient_name,
        contact_phone, gender, visit_reason, amount_paise, idempotency_key
      ) VALUES (
        public.opd_new_booking_reference(p_date), v_user, v_patient, p_date, btrim(p_patient_name),
        p_phone, p_gender, btrim(p_reason), v_amount, p_idempotency_key
      )
      RETURNING * INTO v_order;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF i = 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN to_jsonb(v_order) - 'user_id' - 'idempotency_key';
END;
$$;

-- 5.2 Reserve without online payment (only while online payment is OFF;
--     the fee is collected at reception, as before).
CREATE OR REPLACE FUNCTION public.book_opd_pay_at_reception(
  p_date DATE,
  p_patient_name TEXT,
  p_phone TEXT,
  p_gender TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_key     TEXT := 'self:' || COALESCE(auth.uid()::TEXT, '') || ':' || COALESCE(p_idempotency_key, '');
  v_check   JSONB;
  v_patient UUID;
  v_appt    public.appointments;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in to book an appointment.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF btrim(COALESCE(p_idempotency_key, '')) = '' THEN
    RAISE EXCEPTION 'Missing request key.' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE((public.opd_payment_config() ->> 'online_payment_enabled')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Online payment is required for online bookings.' USING ERRCODE = 'feature_not_supported';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE idempotency_key = v_key;
  IF NOT FOUND THEN
    PERFORM public.opd_validate_details(p_patient_name, p_phone, p_gender, p_reason);
    v_check := public.opd_booking_eligibility(p_date);
    IF NOT (v_check ->> 'allowed')::BOOLEAN THEN
      RAISE EXCEPTION '%', v_check ->> 'reason' USING ERRCODE = 'check_violation';
    END IF;
    v_patient := public.opd_find_or_create_patient(v_user, p_patient_name, p_phone, p_gender);

    BEGIN
      INSERT INTO public.appointments (
        appointment_code, patient_profile_id, appointment_date, token_number, queue_type, status,
        booked_by_role, notes, visit_reason, contact_phone, booking_reference, idempotency_key, payment_status
      ) VALUES (
        'pending', v_patient, p_date, 0, 'online', 'booked',
        'patient', btrim(p_reason), btrim(p_reason), p_phone, public.opd_new_booking_reference(p_date), v_key, 'pay_at_reception'
      )
      RETURNING * INTO v_appt;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION '% already has an appointment on this date.', btrim(p_patient_name) USING ERRCODE = 'unique_violation';
    END;
  END IF;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'payment_status', v_appt.payment_status,
    'booking_reference', v_appt.booking_reference,
    'appointment_date', v_appt.appointment_date,
    'token_number', v_appt.token_number,
    'appointment_code', v_appt.appointment_code,
    'patient_name', btrim(p_patient_name)
  );
END;
$$;

-- 5.3 Status of the caller's own booking (polled by the confirmation screen).
CREATE OR REPLACE FUNCTION public.get_my_opd_booking(p_booking_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.opd_payment_orders;
  v_appt  public.appointments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_order FROM public.opd_payment_orders WHERE booking_reference = p_booking_reference AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_order.appointment_id IS NOT NULL THEN
    SELECT * INTO v_appt FROM public.appointments WHERE id = v_order.appointment_id;
  END IF;
  RETURN jsonb_build_object(
    'status', CASE WHEN v_appt.id IS NOT NULL THEN 'confirmed' ELSE v_order.status END,
    'payment_status', CASE WHEN v_order.razorpay_payment_id IS NOT NULL THEN 'paid' ELSE 'unpaid' END,
    'booking_reference', v_order.booking_reference,
    'appointment_date', v_order.appointment_date,
    'patient_name', v_order.patient_name,
    'amount_paise', v_order.amount_paise,
    'token_number', v_appt.token_number,
    'appointment_code', v_appt.appointment_code,
    'last_payment_error', v_order.last_payment_error,
    'reconciliation_reason', v_order.reconciliation_reason
  );
END;
$$;

-- 5.4 Patient abandons the checkout (can be resumed by preparing again).
CREATE OR REPLACE FUNCTION public.cancel_my_opd_payment(p_booking_reference TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.opd_payment_orders
     SET status = 'cancelled', updated_at = NOW()
   WHERE booking_reference = p_booking_reference AND user_id = auth.uid() AND status = 'awaiting_payment';
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_opd_payment(DATE, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_opd_pay_at_reception(DATE, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_opd_booking(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_my_opd_payment(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_opd_payment(DATE, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_opd_pay_at_reception(DATE, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_opd_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_opd_payment(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Server-only RPCs (Edge Functions with the service role key)
-- ----------------------------------------------------------------------------

-- 6.1 Link the Razorpay order created by the Edge Function.
CREATE OR REPLACE FUNCTION public.attach_razorpay_order(p_order_id UUID, p_razorpay_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.opd_payment_orders
     SET razorpay_order_id = p_razorpay_order_id, updated_at = NOW()
   WHERE id = p_order_id AND (razorpay_order_id IS NULL OR razorpay_order_id = p_razorpay_order_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking already linked to a different payment order.' USING ERRCODE = 'unique_violation';
  END IF;
END;
$$;

-- 6.2 Confirm a verified payment. Idempotent and race-safe: the row lock
--     serialises the browser verification and the webhook.
CREATE OR REPLACE FUNCTION public.confirm_opd_payment(
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_amount_paise INTEGER,
  p_source TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.opd_payment_orders;
  v_appt  public.appointments;
  v_check JSONB;
BEGIN
  SELECT * INTO v_order FROM public.opd_payment_orders WHERE razorpay_order_id = p_razorpay_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown payment order %', p_razorpay_order_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Already confirmed: return the same appointment (duplicate callback).
  IF v_order.appointment_id IS NOT NULL THEN
    SELECT * INTO v_appt FROM public.appointments WHERE id = v_order.appointment_id;
    RETURN jsonb_build_object('result', 'already_confirmed', 'booking_reference', v_order.booking_reference,
                              'token_number', v_appt.token_number, 'appointment_date', v_appt.appointment_date);
  END IF;
  IF v_order.status IN ('needs_reconciliation', 'refunded', 'resolved') THEN
    RETURN jsonb_build_object('result', v_order.status, 'booking_reference', v_order.booking_reference);
  END IF;

  -- Record the money first so it is never lost, whatever happens next.
  UPDATE public.opd_payment_orders
     SET razorpay_payment_id = COALESCE(razorpay_payment_id, p_razorpay_payment_id),
         amount_received_paise = p_amount_paise, paid_at = COALESCE(paid_at, NOW()),
         confirmed_via = p_source, updated_at = NOW()
   WHERE id = v_order.id
  RETURNING * INTO v_order;

  IF v_order.razorpay_payment_id <> p_razorpay_payment_id THEN
    UPDATE public.opd_payment_orders
       SET status = 'needs_reconciliation', updated_at = NOW(),
           reconciliation_reason = 'A second payment was received for the same order (' || p_razorpay_payment_id || '). Refund one payment.'
     WHERE id = v_order.id;
    RETURN jsonb_build_object('result', 'needs_reconciliation', 'booking_reference', v_order.booking_reference);
  END IF;

  IF p_amount_paise IS DISTINCT FROM v_order.amount_paise THEN
    UPDATE public.opd_payment_orders
       SET status = 'needs_reconciliation', updated_at = NOW(),
           reconciliation_reason = format('Amount received (%s paise) differs from the booking amount (%s paise).', p_amount_paise, v_order.amount_paise)
     WHERE id = v_order.id;
    RETURN jsonb_build_object('result', 'needs_reconciliation', 'booking_reference', v_order.booking_reference);
  END IF;

  v_check := public.opd_booking_eligibility(v_order.appointment_date);
  IF NOT (v_check ->> 'allowed')::BOOLEAN THEN
    UPDATE public.opd_payment_orders
       SET status = 'needs_reconciliation', updated_at = NOW(),
           reconciliation_reason = 'Payment completed after the booking closed: ' || (v_check ->> 'reason') || ' Refund or rebook manually.'
     WHERE id = v_order.id;
    RETURN jsonb_build_object('result', 'needs_reconciliation', 'booking_reference', v_order.booking_reference);
  END IF;

  BEGIN
    INSERT INTO public.appointments (
      appointment_code, patient_profile_id, appointment_date, token_number, queue_type, status, booked_by_role,
      notes, visit_reason, contact_phone, booking_reference, idempotency_key, payment_status,
      payment_provider, payment_reference, amount_paid, paid_at, consultation_fee_amount
    ) VALUES (
      'pending', v_order.patient_profile_id, v_order.appointment_date, 0, 'online', 'booked', 'patient',
      v_order.visit_reason, v_order.visit_reason, v_order.contact_phone, v_order.booking_reference,
      'razorpay:' || v_order.razorpay_order_id, 'paid',
      'razorpay', p_razorpay_payment_id, p_amount_paise / 100.0, v_order.paid_at, p_amount_paise / 100.0
    )
    RETURNING * INTO v_appt;
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.opd_payment_orders
       SET status = 'needs_reconciliation', updated_at = NOW(),
           reconciliation_reason = 'Patient already had an appointment on this date when the payment completed. Refund or adjust manually.'
     WHERE id = v_order.id;
    RETURN jsonb_build_object('result', 'needs_reconciliation', 'booking_reference', v_order.booking_reference);
  END;

  UPDATE public.opd_payment_orders
     SET status = 'paid', appointment_id = v_appt.id, last_payment_error = NULL, updated_at = NOW()
   WHERE id = v_order.id;

  RETURN jsonb_build_object('result', 'confirmed', 'booking_reference', v_order.booking_reference,
                            'token_number', v_appt.token_number, 'appointment_date', v_appt.appointment_date);
END;
$$;

-- 6.3 A failed attempt. The order stays payable (Razorpay allows retrying the
--     same order), so nothing is confirmed and no second order is created.
CREATE OR REPLACE FUNCTION public.record_opd_payment_failure(p_razorpay_order_id TEXT, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.opd_payment_orders
     SET last_payment_error = left(COALESCE(p_reason, 'Payment failed'), 300), updated_at = NOW()
   WHERE razorpay_order_id = p_razorpay_order_id AND status IN ('awaiting_payment', 'cancelled');
END;
$$;

-- 6.4 Webhook idempotency: returns false when the event was already processed.
CREATE OR REPLACE FUNCTION public.claim_razorpay_webhook_event(p_event_id TEXT, p_event_type TEXT, p_razorpay_order_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.razorpay_webhook_events (event_id, event_type, razorpay_order_id)
  VALUES (p_event_id, p_event_type, p_razorpay_order_id);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_razorpay_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_opd_payment(TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_opd_payment_failure(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_razorpay_webhook_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_razorpay_order(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_opd_payment(TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_opd_payment_failure(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_razorpay_webhook_event(TEXT, TEXT, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- 7. Staff: reconciliation and fee rules
-- ----------------------------------------------------------------------------

-- Admin records how an exceptional payment was settled (refund issued in the
-- Razorpay dashboard, or appointment arranged manually). Reception can view
-- these cases but cannot settle them or mark anything as paid.
CREATE OR REPLACE FUNCTION public.resolve_opd_payment_case(p_order_id UUID, p_resolution TEXT, p_note TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_auth_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only an administrator can resolve payment cases.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_resolution NOT IN ('refunded', 'resolved') THEN
    RAISE EXCEPTION 'Resolution must be refunded or resolved.' USING ERRCODE = 'check_violation';
  END IF;
  IF btrim(COALESCE(p_note, '')) = '' THEN
    RAISE EXCEPTION 'Add a note describing the resolution.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.opd_payment_orders
     SET status = p_resolution, resolution_note = btrim(p_note), resolved_by = auth.uid(), resolved_at = NOW(), updated_at = NOW()
   WHERE id = p_order_id AND status = 'needs_reconciliation';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only cases that need reconciliation can be resolved.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_opd_payment_case(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_opd_payment_case(UUID, TEXT, TEXT) TO authenticated;

-- Reception may record cash/UPI collected at the desk, but must not overwrite
-- a payment that was verified online.
CREATE OR REPLACE FUNCTION public.record_consultation_fee(p_appointment_id UUID, p_mode TEXT)
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

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_appt.payment_provider = 'razorpay' THEN
    RAISE EXCEPTION 'This consultation was paid online and cannot be changed at the desk.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.appointments
     SET fee_payment_mode = p_mode,
         payment_status   = CASE WHEN p_mode IS NULL THEN 'unpaid' ELSE 'paid' END,
         fee_collected_at = CASE WHEN p_mode IS NULL THEN NULL ELSE NOW() END,
         fee_collected_by = CASE WHEN p_mode IS NULL THEN NULL ELSE auth.uid() END
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  RETURN v_appt;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Realtime: reception sees payment exceptions as they happen
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'opd_payment_orders'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opd_payment_orders;
  END IF;
END $$;
