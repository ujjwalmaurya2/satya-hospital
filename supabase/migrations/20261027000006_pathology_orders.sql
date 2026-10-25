-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — PATHOLOGY TEST BOOKING (orders, samples, reports)
-- Migration: 20261027000006_pathology_orders.sql
-- Depends on: complete_satya_hospital_setup.sql, 20261024000003, 20261025000004,
--             20261026000005 (get_auth_role ignores deactivated accounts)
--
-- Separate from OPD: lab orders never create appointments or tokens, and OPD
-- bookings never create lab orders. Every write goes through the RPCs below;
-- prices, roles, patient IDs and payment states are never taken from the browser.
--
-- Order state is split in three:
--   status          pending -> confirmed | cancelled            (the booking)
--   payment_status  unpaid -> paid | refund_due -> refunded, or needs_reconciliation
--   lab_status      awaiting_sample -> sample_collected -> processing -> completed
--
-- Roles: patient (own orders), reception (orders, payments, collection),
-- pathology (samples, reports, catalogue), admin = Super Admin (everything).
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Catalogue
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pathology_tests' AND column_name = 'is_demo') THEN
    ALTER TABLE public.pathology_tests ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
    -- The tests seeded by the setup script were never confirmed by the hospital.
    UPDATE public.pathology_tests SET is_demo = true WHERE test_code IN ('CBC', 'LFT', 'KFT', 'LIPID', 'HBA1C', 'TSH', 'URINE-RE');
  END IF;
END $$;

ALTER TABLE public.pathology_tests
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS preparation TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- Sample type and turnaround are shown only once pathology staff have verified them.
ALTER TABLE public.pathology_tests ALTER COLUMN specimen_type DROP NOT NULL;
ALTER TABLE public.pathology_tests ALTER COLUMN turnaround_hours DROP NOT NULL;
ALTER TABLE public.pathology_tests ALTER COLUMN turnaround_hours DROP DEFAULT;
DO $$ BEGIN
  ALTER TABLE public.pathology_tests ADD CONSTRAINT chk_pathology_tests_price CHECK (price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pathology_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  preparation TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pathology_package_tests (
  package_id UUID NOT NULL REFERENCES public.pathology_packages(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.pathology_tests(id) ON DELETE RESTRICT,
  PRIMARY KEY (package_id, test_id)
);

-- Demo package so the flow can be tried end to end; clearly flagged as demo.
INSERT INTO public.pathology_packages (package_code, name, description, price, is_demo)
VALUES ('DEMO-BASIC', 'Basic Health Check (Demo)', 'Demo package for testing the booking flow. Not a real hospital offer.', 500, true)
ON CONFLICT (package_code) DO NOTHING;
INSERT INTO public.pathology_package_tests (package_id, test_id)
SELECT p.id, t.id FROM public.pathology_packages p JOIN public.pathology_tests t ON t.test_code IN ('CBC', 'URINE-RE')
 WHERE p.package_code = 'DEMO-BASIC'
ON CONFLICT DO NOTHING;

-- Lab settings live with the other hospital settings (Super Admin managed).
ALTER TABLE public.hospital_settings
  ADD COLUMN IF NOT EXISTS lab_duplicate_test_rule TEXT NOT NULL DEFAULT 'skip_individual',
  ADD COLUMN IF NOT EXISTS lab_home_collection_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lab_online_payment_enabled BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE public.hospital_settings
    ADD CONSTRAINT chk_lab_duplicate_test_rule CHECK (lab_duplicate_test_rule IN ('skip_individual', 'reject'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. Orders, items, samples
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pathology_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),            -- account that booked online; NULL for walk-ins
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('online', 'walk_in')),
  collection_method TEXT NOT NULL DEFAULT 'hospital_lab' CHECK (collection_method IN ('hospital_lab', 'home')),
  preferred_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refund_due', 'refunded', 'needs_reconciliation')),
  payment_mode TEXT CHECK (payment_mode IN ('online', 'cash', 'upi')),
  lab_status TEXT NOT NULL DEFAULT 'awaiting_sample' CHECK (lab_status IN ('awaiting_sample', 'sample_collected', 'processing', 'completed')),
  subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
  idempotency_key TEXT NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount_received_paise INTEGER,
  paid_at TIMESTAMPTZ,
  payment_recorded_by UUID REFERENCES auth.users(id),
  last_payment_error TEXT,
  reconciliation_reason TEXT,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (created_by, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_user ON public.pathology_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_created ON public.pathology_orders(created_at DESC);

-- Name, price and package contents are snapshots: later catalogue edits never change an order.
CREATE TABLE IF NOT EXISTS public.pathology_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pathology_orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('test', 'package')),
  test_id UUID REFERENCES public.pathology_tests(id),
  package_id UUID REFERENCES public.pathology_packages(id),
  name TEXT NOT NULL,
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  test_ids UUID[] NOT NULL,
  test_names TEXT[] NOT NULL,
  CHECK ((item_type = 'test') = (test_id IS NOT NULL) AND (item_type = 'package') = (package_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_pathology_order_items_order ON public.pathology_order_items(order_id);

CREATE TABLE IF NOT EXISTS public.pathology_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pathology_orders(id) ON DELETE CASCADE,
  accession_number TEXT NOT NULL UNIQUE,
  specimen_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'collected' CHECK (status IN ('collected', 'received', 'rejected')),
  collected_by UUID NOT NULL REFERENCES auth.users(id),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ,
  rejection_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_pathology_samples_order ON public.pathology_samples(order_id);

-- Reports: reuse pathology_reports (versioning + verification columns already exist).
ALTER TABLE public.pathology_reports ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.pathology_tests(id);
DO $$ BEGIN
  ALTER TABLE public.pathology_reports
    ADD CONSTRAINT fk_pathology_reports_order FOREIGN KEY (order_id) REFERENCES public.pathology_orders(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_pathology_reports_order ON public.pathology_reports(order_id);

-- ----------------------------------------------------------------------------
-- 3. Row-level security (reads only; all writes go through the RPCs)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pathology_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_package_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lab staff manage tests" ON public.pathology_tests;
CREATE POLICY "Lab staff manage tests" ON public.pathology_tests FOR ALL
  USING (public.get_auth_role() IN ('pathology', 'admin')) WITH CHECK (public.get_auth_role() IN ('pathology', 'admin'));

DROP POLICY IF EXISTS "Public read active packages" ON public.pathology_packages;
CREATE POLICY "Public read active packages" ON public.pathology_packages FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "Lab staff manage packages" ON public.pathology_packages;
CREATE POLICY "Lab staff manage packages" ON public.pathology_packages FOR ALL
  USING (public.get_auth_role() IN ('pathology', 'admin')) WITH CHECK (public.get_auth_role() IN ('pathology', 'admin'));

DROP POLICY IF EXISTS "Public read package contents" ON public.pathology_package_tests;
CREATE POLICY "Public read package contents" ON public.pathology_package_tests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Lab staff manage package contents" ON public.pathology_package_tests;
CREATE POLICY "Lab staff manage package contents" ON public.pathology_package_tests FOR ALL
  USING (public.get_auth_role() IN ('pathology', 'admin')) WITH CHECK (public.get_auth_role() IN ('pathology', 'admin'));

DROP POLICY IF EXISTS "Patients view own lab orders" ON public.pathology_orders;
CREATE POLICY "Patients view own lab orders" ON public.pathology_orders FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Staff view lab orders" ON public.pathology_orders;
CREATE POLICY "Staff view lab orders" ON public.pathology_orders FOR SELECT
  USING (public.get_auth_role() IN ('reception', 'pathology', 'admin'));

-- Visible exactly when the parent order is visible to the caller.
DROP POLICY IF EXISTS "View items of visible lab orders" ON public.pathology_order_items;
CREATE POLICY "View items of visible lab orders" ON public.pathology_order_items FOR SELECT
  USING (order_id IN (SELECT id FROM public.pathology_orders));

DROP POLICY IF EXISTS "Staff view lab samples" ON public.pathology_samples;
CREATE POLICY "Staff view lab samples" ON public.pathology_samples FOR SELECT
  USING (public.get_auth_role() IN ('reception', 'pathology', 'admin'));

-- Doctors previously could read every report, including unverified ones.
DROP POLICY IF EXISTS "Doctor view published lab reports" ON public.pathology_reports;
CREATE POLICY "Doctor view published lab reports" ON public.pathology_reports FOR SELECT
  USING (public.get_auth_role() = 'doctor' AND status = 'published');

-- ----------------------------------------------------------------------------
-- 4. Helpers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lab_require_role(p_roles user_role[])
RETURNS user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role user_role := public.get_auth_role();
BEGIN
  IF v_role IS NULL OR NOT (v_role = ANY (p_roles)) THEN
    RAISE EXCEPTION 'You are not allowed to do this.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.lab_audit(p_action TEXT, p_entity TEXT, p_target UUID, p_description TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action_type, target_entity, target_id, description)
  SELECT p.id::TEXT, p.full_name, p.role, p_action, p_entity, p_target::TEXT, p_description
    FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.lab_config()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'duplicate_test_rule', lab_duplicate_test_rule,
    'home_collection_enabled', lab_home_collection_enabled,
    'online_payment_enabled', lab_online_payment_enabled AND COALESCE(is_policy_approved_by_hospital, false)
  )
  FROM public.hospital_settings ORDER BY updated_at DESC LIMIT 1;
$$;

-- Price a cart from the database. Input: [{"type":"test"|"package","id":"<uuid>"}, ...].
-- Applies the duplicate rule: a test that is also inside a selected package is
-- skipped ('skip_individual') or rejected ('reject'); overlapping packages are rejected.
CREATE OR REPLACE FUNCTION public.lab_price_cart(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule    TEXT := COALESCE(public.lab_config() ->> 'duplicate_test_rule', 'skip_individual');
  v_entry   RECORD;
  v_pkg     RECORD;
  v_test    RECORD;
  v_out     JSONB := '[]'::JSONB;
  v_covered UUID[] := '{}';
  v_owner   TEXT;
  v_ids     UUID[];
  v_names   TEXT[];
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Please choose at least one test.' USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in one order.' USING ERRCODE = 'check_violation';
  END IF;

  -- Packages first, so individual tests can be checked against their contents.
  FOR v_entry IN SELECT DISTINCT (e ->> 'id')::UUID AS id FROM jsonb_array_elements(p_items) e WHERE e ->> 'type' = 'package' LOOP
    SELECT * INTO v_pkg FROM public.pathology_packages WHERE id = v_entry.id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A selected package is no longer available. Please review your cart.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT array_agg(t.id ORDER BY t.name), array_agg(t.name ORDER BY t.name) INTO v_ids, v_names
      FROM public.pathology_package_tests pt JOIN public.pathology_tests t ON t.id = pt.test_id WHERE pt.package_id = v_pkg.id;
    IF v_ids IS NULL THEN
      RAISE EXCEPTION '% has no tests configured yet.', v_pkg.name USING ERRCODE = 'check_violation';
    END IF;
    IF v_covered && v_ids THEN
      RAISE EXCEPTION '% overlaps with another selected package. Please choose one of them.', v_pkg.name USING ERRCODE = 'check_violation';
    END IF;
    v_covered := v_covered || v_ids;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'item_type', 'package', 'id', v_pkg.id, 'name', v_pkg.name,
      'price_paise', round(v_pkg.price * 100)::INTEGER, 'test_ids', to_jsonb(v_ids), 'test_names', to_jsonb(v_names)));
  END LOOP;

  FOR v_entry IN SELECT DISTINCT (e ->> 'id')::UUID AS id FROM jsonb_array_elements(p_items) e WHERE e ->> 'type' = 'test' LOOP
    SELECT * INTO v_test FROM public.pathology_tests WHERE id = v_entry.id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A selected test is no longer available. Please review your cart.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_test.id = ANY (v_covered) THEN
      IF v_rule = 'reject' THEN
        SELECT elem ->> 'name' INTO v_owner FROM jsonb_array_elements(v_out) elem WHERE elem -> 'test_ids' ? v_test.id::TEXT LIMIT 1;
        RAISE EXCEPTION '% is already included in %. Please remove it from your cart.', v_test.name, v_owner USING ERRCODE = 'check_violation';
      END IF;
      CONTINUE; -- skip_individual: already paid for inside the package
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'item_type', 'test', 'id', v_test.id, 'name', v_test.name,
      'price_paise', round(v_test.price * 100)::INTEGER, 'test_ids', jsonb_build_array(v_test.id), 'test_names', jsonb_build_array(v_test.name)));
  END LOOP;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) e WHERE COALESCE(e ->> 'type', '') NOT IN ('test', 'package')) THEN
    RAISE EXCEPTION 'Invalid cart item.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.lab_order_json(p_order_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(o) - 'idempotency_key' - 'created_by' - 'payment_recorded_by'
         || jsonb_build_object('items', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.item_type DESC, i.name) FROM public.pathology_order_items i WHERE i.order_id = o.id), '[]'::JSONB))
    FROM public.pathology_orders o WHERE o.id = p_order_id;
$$;

-- Shared by online booking and walk-in registration. Caller has already been authorised.
CREATE OR REPLACE FUNCTION public.lab_insert_order(
  p_patient UUID, p_user UUID, p_name TEXT, p_phone TEXT, p_source TEXT, p_collection TEXT,
  p_preferred_date DATE, p_status TEXT, p_items JSONB, p_idempotency_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priced JSONB := public.lab_price_cart(p_items);
  v_total  INTEGER;
  v_id     UUID;
  v_item   JSONB;
BEGIN
  SELECT COALESCE(sum((e ->> 'price_paise')::INTEGER), 0) INTO v_total FROM jsonb_array_elements(v_priced) e;

  FOR i IN 1..5 LOOP
    BEGIN
      INSERT INTO public.pathology_orders (
        order_number, user_id, patient_profile_id, patient_name, contact_phone, source, collection_method,
        preferred_date, status, subtotal_paise, total_paise, idempotency_key, created_by
      ) VALUES (
        'LAB-' || to_char(public.hospital_now_ist(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)),
        p_user, p_patient, btrim(p_name), p_phone, p_source, p_collection, p_preferred_date, p_status, v_total, v_total,
        p_idempotency_key, auth.uid()
      ) RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Same request replayed concurrently: hand back the order the other call created.
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

CREATE OR REPLACE FUNCTION public.lab_validate_patient(p_name TEXT, p_phone TEXT, p_gender TEXT)
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
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Patient RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_lab_order(
  p_items JSONB, p_patient_name TEXT, p_phone TEXT, p_gender TEXT,
  p_collection_method TEXT, p_preferred_date DATE, p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_today   DATE := public.hospital_now_ist()::DATE;
  v_id      UUID;
  v_patient UUID;
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

  -- Same submission replayed (double click / retry): return it unchanged.
  SELECT id INTO v_id FROM public.pathology_orders WHERE created_by = v_user AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN public.lab_order_json(v_id); END IF;

  PERFORM public.lab_validate_patient(p_patient_name, p_phone, p_gender);
  IF COALESCE(p_collection_method, 'hospital_lab') = 'home' AND NOT COALESCE((public.lab_config() ->> 'home_collection_enabled')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Home sample collection is not available yet.' USING ERRCODE = 'check_violation';
  END IF;
  IF COALESCE(p_collection_method, 'hospital_lab') NOT IN ('hospital_lab', 'home') THEN
    RAISE EXCEPTION 'Invalid collection method.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_preferred_date IS NOT NULL AND (p_preferred_date < v_today OR p_preferred_date > v_today + 30) THEN
    RAISE EXCEPTION 'Please choose a visit date within the next 30 days.' USING ERRCODE = 'check_violation';
  END IF;

  -- Scoped to this account: never matched across accounts by email or phone.
  v_patient := public.opd_find_or_create_patient(v_user, p_patient_name, p_phone, p_gender);
  v_id := public.lab_insert_order(v_patient, v_user, p_patient_name, p_phone, 'online', COALESCE(p_collection_method, 'hospital_lab'),
                                  p_preferred_date, 'pending', p_items, p_idempotency_key);
  RETURN public.lab_order_json(v_id);
END;
$$;

-- Patients may cancel only before payment and before a sample is taken;
-- paid orders are cancelled by reception (refund handled by the hospital).
CREATE OR REPLACE FUNCTION public.cancel_lab_order(p_order_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  user_role := public.get_auth_role();
  v_order public.pathology_orders;
BEGIN
  SELECT * INTO v_order FROM public.pathology_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT (v_role IN ('reception', 'admin') OR (v_order.user_id = auth.uid() AND v_order.user_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Order not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_order.status = 'cancelled' THEN RETURN public.lab_order_json(v_order.id); END IF;
  IF v_order.lab_status <> 'awaiting_sample' THEN
    RAISE EXCEPTION 'This order can no longer be cancelled because the sample has been collected.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_role NOT IN ('reception', 'admin') AND v_order.payment_status <> 'unpaid' THEN
    RAISE EXCEPTION 'Paid orders are cancelled by the hospital. Please contact reception for a refund.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.pathology_orders
     SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = left(NULLIF(btrim(COALESCE(p_reason, '')), ''), 300),
         payment_status = CASE WHEN payment_status = 'paid' THEN 'refund_due' ELSE payment_status END, updated_at = NOW()
   WHERE id = v_order.id;
  PERFORM public.lab_audit('lab_order.cancelled', 'pathology_orders', v_order.id, 'Cancelled ' || v_order.order_number);
  RETURN public.lab_order_json(v_order.id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Reception RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_lab_walk_in(
  p_items JSONB, p_patient_name TEXT, p_phone TEXT, p_gender TEXT,
  p_patient_profile_id UUID, p_payment_mode TEXT, p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient UUID := p_patient_profile_id;
  v_id      UUID;
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'admin']::user_role[]);
  IF btrim(COALESCE(p_idempotency_key, '')) = '' THEN
    RAISE EXCEPTION 'Missing request key.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT id INTO v_id FROM public.pathology_orders WHERE created_by = auth.uid() AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN public.lab_order_json(v_id); END IF;

  PERFORM public.lab_validate_patient(p_patient_name, p_phone, p_gender);
  IF p_payment_mode IS NOT NULL AND p_payment_mode NOT IN ('cash', 'upi') THEN
    RAISE EXCEPTION 'Payment at the desk must be cash or UPI.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_patient IS NULL THEN
    INSERT INTO public.patient_profiles (full_name, phone, gender) VALUES (btrim(p_patient_name), p_phone, p_gender) RETURNING id INTO v_patient;
  ELSIF NOT EXISTS (SELECT 1 FROM public.patient_profiles WHERE id = v_patient) THEN
    RAISE EXCEPTION 'Patient record not found.' USING ERRCODE = 'no_data_found';
  END IF;

  v_id := public.lab_insert_order(v_patient, NULL, p_patient_name, p_phone, 'walk_in', 'hospital_lab', public.hospital_now_ist()::DATE,
                                  'confirmed', p_items, p_idempotency_key);
  IF p_payment_mode IS NOT NULL THEN
    UPDATE public.pathology_orders
       SET payment_status = 'paid', payment_mode = p_payment_mode, paid_at = NOW(), amount_received_paise = total_paise,
           payment_recorded_by = auth.uid(), updated_at = NOW()
     WHERE id = v_id;
  END IF;
  PERFORM public.lab_audit('lab_order.walk_in', 'pathology_orders', v_id, 'Registered walk-in lab order');
  RETURN public.lab_order_json(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_lab_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'admin']::user_role[]);
  UPDATE public.pathology_orders SET status = 'confirmed', updated_at = NOW() WHERE id = p_order_id AND status = 'pending';
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.pathology_orders WHERE id = p_order_id AND status = 'confirmed') THEN
    RAISE EXCEPTION 'Only pending orders can be confirmed.' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM public.lab_audit('lab_order.confirmed', 'pathology_orders', p_order_id, 'Confirmed lab order');
  RETURN public.lab_order_json(p_order_id);
END;
$$;

-- Desk payment (cash / UPI). Online payments are confirmed only by confirm_lab_payment.
CREATE OR REPLACE FUNCTION public.record_lab_payment(p_order_id UUID, p_mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.pathology_orders;
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'admin']::user_role[]);
  IF p_mode NOT IN ('cash', 'upi') THEN
    RAISE EXCEPTION 'Payment at the desk must be cash or UPI.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO v_order FROM public.pathology_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.' USING ERRCODE = 'no_data_found'; END IF;
  IF v_order.status = 'cancelled' OR v_order.payment_status <> 'unpaid' THEN
    RAISE EXCEPTION 'Payment can only be recorded for an unpaid, active order.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_orders
     SET payment_status = 'paid', payment_mode = p_mode, paid_at = NOW(), amount_received_paise = total_paise,
         payment_recorded_by = auth.uid(), status = 'confirmed', updated_at = NOW()
   WHERE id = v_order.id;
  PERFORM public.lab_audit('lab_order.payment_recorded', 'pathology_orders', v_order.id, format('Recorded %s payment of %s paise', p_mode, v_order.total_paise));
  RETURN public.lab_order_json(v_order.id);
END;
$$;

-- Super Admin settles refunds and payment exceptions (refund issued outside the app).
CREATE OR REPLACE FUNCTION public.resolve_lab_payment(p_order_id UUID, p_note TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.lab_require_role(ARRAY['admin']::user_role[]);
  UPDATE public.pathology_orders
     SET payment_status = 'refunded', reconciliation_reason = COALESCE(left(p_note, 300), reconciliation_reason), updated_at = NOW()
   WHERE id = p_order_id AND payment_status IN ('refund_due', 'needs_reconciliation');
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to resolve for this order.' USING ERRCODE = 'check_violation'; END IF;
  PERFORM public.lab_audit('lab_order.refunded', 'pathology_orders', p_order_id, 'Marked refunded: ' || COALESCE(p_note, ''));
  RETURN public.lab_order_json(p_order_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Samples (reception collects, pathology receives)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_lab_sample(p_order_id UUID, p_specimen_type TEXT)
RETURNS public.pathology_samples
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  public.pathology_orders;
  v_sample public.pathology_samples;
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'pathology', 'admin']::user_role[]);
  IF btrim(COALESCE(p_specimen_type, '')) = '' THEN
    RAISE EXCEPTION 'Enter the sample type.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO v_order FROM public.pathology_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Samples can only be collected for confirmed orders.' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.pathology_samples (order_id, accession_number, specimen_type, collected_by)
  VALUES (v_order.id, 'ACC-' || to_char(public.hospital_now_ist(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)),
          btrim(p_specimen_type), auth.uid())
  RETURNING * INTO v_sample;
  UPDATE public.pathology_orders SET lab_status = 'sample_collected', updated_at = NOW() WHERE id = v_order.id AND lab_status = 'awaiting_sample';
  PERFORM public.lab_audit('lab_sample.collected', 'pathology_samples', v_sample.id, v_sample.accession_number || ' for ' || v_order.order_number);
  RETURN v_sample;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_lab_sample(p_sample_id UUID, p_status TEXT, p_reason TEXT DEFAULT NULL)
RETURNS public.pathology_samples
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sample public.pathology_samples;
BEGIN
  PERFORM public.lab_require_role(ARRAY['pathology', 'admin']::user_role[]);
  IF p_status NOT IN ('received', 'rejected') THEN
    RAISE EXCEPTION 'Invalid sample status.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_status = 'rejected' AND btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Give a reason for rejecting the sample.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_samples
     SET status = p_status, received_by = auth.uid(), received_at = NOW(), rejection_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_reason) END
   WHERE id = p_sample_id AND status = 'collected'
  RETURNING * INTO v_sample;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only newly collected samples can be updated.' USING ERRCODE = 'check_violation'; END IF;

  IF p_status = 'received' THEN
    UPDATE public.pathology_orders SET lab_status = 'processing', updated_at = NOW() WHERE id = v_sample.order_id AND lab_status = 'sample_collected';
  ELSIF NOT EXISTS (SELECT 1 FROM public.pathology_samples WHERE order_id = v_sample.order_id AND status <> 'rejected') THEN
    -- Every sample rejected: the patient needs to give a new one.
    UPDATE public.pathology_orders SET lab_status = 'awaiting_sample', updated_at = NOW() WHERE id = v_sample.order_id AND lab_status <> 'completed';
  END IF;
  PERFORM public.lab_audit('lab_sample.' || p_status, 'pathology_samples', v_sample.id, v_sample.accession_number || COALESCE(': ' || v_sample.rejection_reason, ''));
  RETURN v_sample;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Reports: upload -> verify (different person) -> release to the patient
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_lab_report(
  p_order_id UUID, p_test_id UUID, p_storage_key TEXT, p_file_name TEXT, p_file_size INTEGER,
  p_checksum TEXT DEFAULT NULL, p_correction_reason TEXT DEFAULT NULL
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
BEGIN
  PERFORM public.lab_require_role(ARRAY['pathology', 'admin']::user_role[]);
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

  SELECT * INTO v_prev FROM public.pathology_reports
   WHERE order_id = v_order.id AND test_id = p_test_id AND status IN ('pending_verification', 'published')
   ORDER BY version_number DESC LIMIT 1;
  IF FOUND AND btrim(COALESCE(p_correction_reason, '')) = '' THEN
    RAISE EXCEPTION 'A report already exists for this test. Give a reason for the new version.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT accession_number INTO v_access FROM public.pathology_samples WHERE order_id = v_order.id AND status <> 'rejected' ORDER BY collected_at LIMIT 1;

  INSERT INTO public.pathology_reports (
    report_code, patient_profile_id, order_id, test_id, lab_accession_number, test_name, storage_key, file_name, file_size,
    checksum, status, version_number, correction_reason, uploaded_by
  ) VALUES (
    'REP-' || to_char(public.hospital_now_ist(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)),
    v_order.patient_profile_id, v_order.id, p_test_id, COALESCE(v_access, v_order.order_number), v_test, p_storage_key, p_file_name, p_file_size,
    p_checksum, 'pending_verification',
    COALESCE((SELECT max(version_number) FROM public.pathology_reports WHERE order_id = v_order.id AND test_id = p_test_id), 0) + 1,
    NULLIF(btrim(COALESCE(p_correction_reason, '')), ''), auth.uid()
  ) RETURNING * INTO v_report;

  -- An unreleased earlier draft is replaced straight away; a released one stays visible until this version is released.
  UPDATE public.pathology_reports SET status = 'superseded', superseded_by_id = v_report.id
   WHERE order_id = v_order.id AND test_id = p_test_id AND status = 'pending_verification' AND id <> v_report.id;
  PERFORM public.lab_audit('lab_report.uploaded', 'pathology_reports', v_report.id, format('%s v%s for %s', v_test, v_report.version_number, v_order.order_number));
  RETURN v_report;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_lab_report(p_report_id UUID)
RETURNS public.pathology_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_report public.pathology_reports;
BEGIN
  PERFORM public.lab_require_role(ARRAY['pathology', 'admin']::user_role[]);
  SELECT * INTO v_report FROM public.pathology_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND OR v_report.status <> 'pending_verification' OR v_report.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'Only reports awaiting verification can be verified.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_report.uploaded_by = auth.uid() THEN
    RAISE EXCEPTION 'A report must be verified by someone other than the person who uploaded it.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_reports SET verified_by = auth.uid(), verified_at = NOW() WHERE id = p_report_id RETURNING * INTO v_report;
  PERFORM public.lab_audit('lab_report.verified', 'pathology_reports', v_report.id, v_report.report_code);
  RETURN v_report;
END;
$$;

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
  IF NOT FOUND OR v_report.status <> 'pending_verification' OR v_report.verified_at IS NULL THEN
    RAISE EXCEPTION 'Only verified reports can be released.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_reports SET status = 'published', published_at = NOW() WHERE id = p_report_id RETURNING * INTO v_report;
  UPDATE public.pathology_reports SET status = 'superseded', superseded_by_id = v_report.id
   WHERE order_id = v_report.order_id AND test_id = v_report.test_id AND status = 'published' AND id <> v_report.id;

  -- Order is complete once every test it covers has a released report.
  UPDATE public.pathology_orders o SET lab_status = 'completed', updated_at = NOW()
   WHERE o.id = v_report.order_id AND NOT EXISTS (
     SELECT 1 FROM public.pathology_order_items i, unnest(i.test_ids) AS t(id)
      WHERE i.order_id = o.id
        AND NOT EXISTS (SELECT 1 FROM public.pathology_reports r WHERE r.order_id = o.id AND r.test_id = t.id AND r.status = 'published'));
  PERFORM public.lab_audit('lab_report.released', 'pathology_reports', v_report.id, v_report.report_code);
  RETURN v_report;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_lab_report(p_report_id UUID, p_reason TEXT)
RETURNS public.pathology_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_report public.pathology_reports;
BEGIN
  PERFORM public.lab_require_role(ARRAY['pathology', 'admin']::user_role[]);
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Give a reason for rejecting the report.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.pathology_reports SET status = 'rejected', correction_reason = btrim(p_reason)
   WHERE id = p_report_id AND status = 'pending_verification'
  RETURNING * INTO v_report;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only reports awaiting verification can be rejected.' USING ERRCODE = 'check_violation'; END IF;
  PERFORM public.lab_audit('lab_report.rejected', 'pathology_reports', v_report.id, v_report.report_code || ': ' || btrim(p_reason));
  RETURN v_report;
END;
$$;

-- Who may open a report file (used by the storage policy below).
CREATE OR REPLACE FUNCTION public.can_read_lab_report_file(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_auth_role() IN ('pathology', 'admin') THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.pathology_reports r
       WHERE r.storage_key = p_key AND r.status = 'published'
         AND (public.get_auth_role() = 'doctor'
              OR r.patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())))
  END;
$$;

-- ----------------------------------------------------------------------------
-- 9. Online payment (service role only; called by the lab Edge Functions)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attach_lab_razorpay_order(p_order_id UUID, p_razorpay_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pathology_orders SET razorpay_order_id = p_razorpay_order_id, updated_at = NOW()
   WHERE id = p_order_id AND razorpay_order_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order already has a payment order.' USING ERRCODE = 'unique_violation'; END IF;
END;
$$;

-- Idempotent and race-safe (row lock). Money received is always recorded; anything
-- unexpected becomes needs_reconciliation instead of being discarded.
CREATE OR REPLACE FUNCTION public.confirm_lab_payment(p_razorpay_order_id TEXT, p_razorpay_payment_id TEXT, p_amount_paise INTEGER, p_source TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.pathology_orders;
BEGIN
  SELECT * INTO v_order FROM public.pathology_orders WHERE razorpay_order_id = p_razorpay_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown lab payment order %', p_razorpay_order_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_order.razorpay_payment_id = p_razorpay_payment_id THEN
    RETURN jsonb_build_object('result', 'already_confirmed', 'order_number', v_order.order_number);
  END IF;
  IF v_order.razorpay_payment_id IS NOT NULL OR v_order.payment_status <> 'unpaid' THEN
    UPDATE public.pathology_orders SET payment_status = 'needs_reconciliation', updated_at = NOW(),
           reconciliation_reason = format('Extra payment %s received for an order that was already %s. Refund it.', p_razorpay_payment_id, v_order.payment_status)
     WHERE id = v_order.id;
    RETURN jsonb_build_object('result', 'needs_reconciliation', 'order_number', v_order.order_number);
  END IF;

  UPDATE public.pathology_orders
     SET razorpay_payment_id = p_razorpay_payment_id, amount_received_paise = p_amount_paise, paid_at = NOW(),
         payment_mode = 'online', last_payment_error = NULL, updated_at = NOW(),
         payment_status = CASE WHEN p_amount_paise IS DISTINCT FROM total_paise OR status = 'cancelled' THEN 'needs_reconciliation' ELSE 'paid' END,
         status = CASE WHEN status = 'pending' AND p_amount_paise = total_paise THEN 'confirmed' ELSE status END,
         reconciliation_reason = CASE
           WHEN p_amount_paise IS DISTINCT FROM total_paise THEN format('Amount received (%s paise) differs from the order total (%s paise).', p_amount_paise, total_paise)
           WHEN status = 'cancelled' THEN 'Payment arrived after the order was cancelled. Refund it.'
         END
   WHERE id = v_order.id
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('result', CASE WHEN v_order.payment_status = 'paid' THEN 'confirmed' ELSE v_order.payment_status END,
                            'order_number', v_order.order_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_lab_payment_failure(p_razorpay_order_id TEXT, p_reason TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pathology_orders SET last_payment_error = left(COALESCE(p_reason, 'Payment failed'), 300), updated_at = NOW()
   WHERE razorpay_order_id = p_razorpay_order_id AND payment_status = 'unpaid';
$$;

-- ----------------------------------------------------------------------------
-- 10. Grants
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lab_require_role(user_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lab_audit(TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lab_insert_order(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lab_order_json(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_lab_razorpay_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_lab_payment(TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_lab_payment_failure(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_lab_razorpay_order(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_lab_payment(TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_lab_payment_failure(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.lab_order_json(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.lab_config() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lab_price_cart(JSONB) TO anon, authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'create_lab_order(JSONB, TEXT, TEXT, TEXT, TEXT, DATE, TEXT)',
    'cancel_lab_order(UUID, TEXT)',
    'register_lab_walk_in(JSONB, TEXT, TEXT, TEXT, UUID, TEXT, TEXT)',
    'confirm_lab_order(UUID)',
    'record_lab_payment(UUID, TEXT)',
    'resolve_lab_payment(UUID, TEXT)',
    'record_lab_sample(UUID, TEXT)',
    'update_lab_sample(UUID, TEXT, TEXT)',
    'register_lab_report(UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT)',
    'verify_lab_report(UUID)',
    'release_lab_report(UUID)',
    'reject_lab_report(UUID, TEXT)',
    'can_read_lab_report_file(TEXT)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 11. Private report storage (Supabase Storage). Skipped where the storage
--     schema doesn't exist (local SQL tests). No update/delete policies:
--     files are immutable; corrections are uploaded as new versions.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('lab-reports', 'lab-reports', false, 10485760, ARRAY['application/pdf'])
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf'];

    EXECUTE 'DROP POLICY IF EXISTS "Lab staff upload report files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Lab staff upload report files" ON storage.objects FOR INSERT TO authenticated
             WITH CHECK (bucket_id = 'lab-reports' AND public.get_auth_role() IN ('pathology', 'admin'))$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Authorised read of report files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Authorised read of report files" ON storage.objects FOR SELECT TO authenticated
             USING (bucket_id = 'lab-reports' AND public.can_read_lab_report_file(name))$p$;
  END IF;
END $$;
