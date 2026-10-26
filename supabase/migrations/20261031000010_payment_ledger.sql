-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — PAYMENT LEDGER & SALES REPORTING
-- Migration: 20261031000010_payment_ledger.sql
-- Depends on: 20261025000004 (OPD payments), 20261027000006 (lab orders),
--             20261030000009 (lab_audit, roles)
--
-- One append-only ledger (`payment_transactions`) holds every real money
-- movement for OPD and Pathology. Every panel reports from it, so the three
-- Super Admin categories, the reception OPD view and the pathology view always
-- reconcile.
--
-- Rows are written by triggers on the existing payment columns (so every
-- existing write path — Razorpay confirmation, desk fees, lab counter payments,
-- refunds — records money automatically) and by the explicit RPCs below.
--
--   kind = payment  money received            (counted in gross)
--   kind = refund   money returned            (subtracted in net, by refund date)
--   kind = void     data-entry correction of a counter payment: the original
--                   payment is excluded from gross and counts, as if never taken
--
-- Reporting policy (Asia/Kolkata):
--   gross   = payments by IST date of the actual collection (occurred_at)
--   refunds = refunds by IST date the refund was made (original payment date kept on the original row)
--   net     = gross − refunds
--   pending = unpaid, not-cancelled OPD appointments (by appointment date) and
--             lab orders (by order date); never part of collections
--
-- Backfill: existing payments with a real payment timestamp are copied in
-- once; anything without reliable timing is listed by finance_reconciliation()
-- instead of being guessed. Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  service TEXT NOT NULL CHECK (service IN ('opd', 'pathology')),
  kind TEXT NOT NULL CHECK (kind IN ('payment', 'refund', 'void')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  channel TEXT NOT NULL CHECK (channel IN ('online', 'counter')),
  method TEXT NOT NULL DEFAULT 'unknown' CHECK (method IN ('cash', 'upi', 'card', 'netbanking', 'wallet', 'emi', 'unknown')),
  provider TEXT,
  external_id TEXT UNIQUE,           -- Razorpay payment id: makes webhook/callback retries idempotent
  occurred_at TIMESTAMPTZ NOT NULL,  -- when the money actually moved
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  opd_payment_order_id UUID REFERENCES public.opd_payment_orders(id) ON DELETE SET NULL,
  pathology_order_id UUID REFERENCES public.pathology_orders(id) ON DELETE SET NULL,
  related_id UUID REFERENCES public.payment_transactions(id),  -- refund/void → the payment it applies to
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((kind = 'payment') = (related_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_occurred ON public.payment_transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_payment_tx_service ON public.payment_transactions(service, occurred_at);
CREATE INDEX IF NOT EXISTS idx_payment_tx_appointment ON public.payment_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_lab_order ON public.payment_transactions(pathology_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_related ON public.payment_transactions(related_id);
-- A payment can be voided at most once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_tx_one_void ON public.payment_transactions(related_id) WHERE kind = 'void';

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
-- Read-only for staff, scoped by service. No write policies: rows come only from triggers/RPCs.
DROP POLICY IF EXISTS "Super Admin reads all payments" ON public.payment_transactions;
CREATE POLICY "Super Admin reads all payments" ON public.payment_transactions FOR SELECT USING (public.get_auth_role() = 'admin');
DROP POLICY IF EXISTS "Reception reads OPD payments" ON public.payment_transactions;
CREATE POLICY "Reception reads OPD payments" ON public.payment_transactions FOR SELECT USING (public.get_auth_role() = 'reception' AND service = 'opd');
DROP POLICY IF EXISTS "Pathology reads lab payments" ON public.payment_transactions;
CREATE POLICY "Pathology reads lab payments" ON public.payment_transactions FOR SELECT USING (public.get_auth_role() = 'pathology' AND service = 'pathology');

-- Money already returned or voided against a payment.
CREATE OR REPLACE FUNCTION public.ledger_settled(p_payment UUID)
RETURNS TABLE (refunded INTEGER, voided BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sum(amount_paise) FILTER (WHERE kind = 'refund'), 0)::INTEGER, bool_or(kind = 'void') IS TRUE
    FROM public.payment_transactions WHERE related_id = p_payment;
$$;

-- Single insert point. Duplicate external ids (callback + webhook) are ignored.
CREATE OR REPLACE FUNCTION public.ledger_add(
  p_service TEXT, p_kind TEXT, p_amount INTEGER, p_channel TEXT, p_method TEXT, p_provider TEXT, p_external_id TEXT,
  p_occurred_at TIMESTAMPTZ, p_patient UUID, p_appointment UUID, p_opd_order UUID, p_lab_order UUID,
  p_related UUID, p_recorded_by UUID, p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_by UUID := COALESCE(p_recorded_by, auth.uid());
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN RETURN NULL; END IF;
  FOR i IN 1..5 LOOP
    BEGIN
      INSERT INTO public.payment_transactions (
        receipt_number, service, kind, amount_paise, channel, method, provider, external_id, occurred_at,
        patient_profile_id, appointment_id, opd_payment_order_id, pathology_order_id, related_id, recorded_by, recorded_by_name, notes
      ) VALUES (
        CASE p_kind WHEN 'payment' THEN 'RCPT' WHEN 'refund' THEN 'RFND' ELSE 'VOID' END || '-' ||
          to_char(p_occurred_at AT TIME ZONE 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::TEXT), 1, 6)),
        p_service, p_kind, p_amount, p_channel, COALESCE(p_method, 'unknown'), p_provider, p_external_id, p_occurred_at,
        p_patient, p_appointment, p_opd_order, p_lab_order, p_related, v_by,
        (SELECT full_name FROM public.profiles WHERE id = v_by), p_notes
      )
      ON CONFLICT (external_id) DO NOTHING
      RETURNING id INTO v_id;
      RETURN v_id;
    EXCEPTION WHEN unique_violation THEN
      IF i = 5 THEN RAISE; END IF; -- receipt number collision: try another
    END;
  END LOOP;
  RETURN v_id;
END;
$$;

-- Refund everything still unrefunded on the given payments (used when an order is marked refunded).
CREATE OR REPLACE FUNCTION public.ledger_refund_remaining(p_payments UUID[], p_note TEXT, p_at TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.payment_transactions;
  v_s RECORD;
BEGIN
  FOR v_p IN SELECT * FROM public.payment_transactions WHERE id = ANY (p_payments) AND kind = 'payment' LOOP
    SELECT * INTO v_s FROM public.ledger_settled(v_p.id);
    IF NOT v_s.voided AND v_p.amount_paise - v_s.refunded > 0 THEN
      PERFORM public.ledger_add(v_p.service, 'refund', v_p.amount_paise - v_s.refunded, v_p.channel, v_p.method, v_p.provider, NULL,
                                p_at, v_p.patient_profile_id, v_p.appointment_id, v_p.opd_payment_order_id, v_p.pathology_order_id,
                                v_p.id, NULL, p_note);
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Triggers on the existing payment columns
-- ----------------------------------------------------------------------------
-- OPD online: the Razorpay payment is recorded on opd_payment_orders (also for
-- payments that never became an appointment), so that is the money source.
CREATE OR REPLACE FUNCTION public.ledger_opd_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.razorpay_payment_id IS NOT NULL AND NEW.amount_received_paise IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.razorpay_payment_id IS DISTINCT FROM NEW.razorpay_payment_id) THEN
    PERFORM public.ledger_add('opd', 'payment', NEW.amount_received_paise, 'online', NULL, 'razorpay', NEW.razorpay_payment_id,
                              COALESCE(NEW.paid_at, NOW()), NEW.patient_profile_id, NEW.appointment_id, NEW.id, NULL, NULL, NULL, NULL);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.appointment_id IS NOT NULL AND OLD.appointment_id IS DISTINCT FROM NEW.appointment_id THEN
    UPDATE public.payment_transactions SET appointment_id = NEW.appointment_id WHERE opd_payment_order_id = NEW.id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    PERFORM public.ledger_refund_remaining(ARRAY(SELECT id FROM public.payment_transactions WHERE opd_payment_order_id = NEW.id AND kind = 'payment'),
                                           NEW.resolution_note, COALESCE(NEW.resolved_at, NOW()));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ledger_opd_orders ON public.opd_payment_orders;
CREATE TRIGGER trg_ledger_opd_orders AFTER INSERT OR UPDATE ON public.opd_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.ledger_opd_order_changes();

-- OPD counter fee (cash / UPI at the desk). Changing or clearing an already
-- recorded fee voids the earlier entry instead of erasing it.
CREATE OR REPLACE FUNCTION public.ledger_appointment_fee_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old TEXT := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.fee_payment_mode END;
  v_active UUID;
BEGIN
  IF v_old IS NOT DISTINCT FROM NEW.fee_payment_mode THEN RETURN NEW; END IF;
  IF v_old IS NOT NULL THEN
    SELECT t.id INTO v_active FROM public.payment_transactions t
     WHERE t.appointment_id = NEW.id AND t.kind = 'payment' AND t.channel = 'counter'
       AND NOT EXISTS (SELECT 1 FROM public.payment_transactions v WHERE v.related_id = t.id AND v.kind = 'void')
     ORDER BY t.occurred_at DESC LIMIT 1;
    IF v_active IS NOT NULL THEN
      PERFORM public.ledger_add('opd', 'void', (SELECT amount_paise FROM public.payment_transactions WHERE id = v_active), 'counter',
                                v_old, NULL, NULL, NOW(), NEW.patient_profile_id, NEW.id, NULL, NULL, v_active, NULL,
                                CASE WHEN NEW.fee_payment_mode IS NULL THEN 'Desk fee cleared' ELSE 'Desk fee changed to ' || NEW.fee_payment_mode END);
    END IF;
  END IF;
  IF NEW.fee_payment_mode IS NOT NULL THEN
    PERFORM public.ledger_add('opd', 'payment', round(COALESCE(NEW.consultation_fee_amount, 0) * 100)::INTEGER, 'counter', NEW.fee_payment_mode,
                              NULL, NULL, COALESCE(NEW.fee_collected_at, NOW()), NEW.patient_profile_id, NEW.id, NULL, NULL, NULL,
                              NEW.fee_collected_by, NULL);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ledger_appointment_fee ON public.appointments;
CREATE TRIGGER trg_ledger_appointment_fee AFTER INSERT OR UPDATE OF fee_payment_mode ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.ledger_appointment_fee_changes();

-- Pathology: online (Razorpay id) and counter (cash/UPI) payments, and refunds.
CREATE OR REPLACE FUNCTION public.ledger_lab_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.razorpay_payment_id IS NOT NULL AND NEW.amount_received_paise IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.razorpay_payment_id IS DISTINCT FROM NEW.razorpay_payment_id) THEN
    PERFORM public.ledger_add('pathology', 'payment', NEW.amount_received_paise, 'online', NULL, 'razorpay', NEW.razorpay_payment_id,
                              COALESCE(NEW.paid_at, NOW()), NEW.patient_profile_id, NULL, NULL, NEW.id, NULL, NULL, NULL);
  ELSIF NEW.payment_status = 'paid' AND NEW.payment_mode IN ('cash', 'upi') AND NEW.razorpay_payment_id IS NULL
        AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    PERFORM public.ledger_add('pathology', 'payment', COALESCE(NEW.amount_received_paise, NEW.total_paise), 'counter', NEW.payment_mode, NULL, NULL,
                              COALESCE(NEW.paid_at, NOW()), NEW.patient_profile_id, NULL, NULL, NEW.id, NULL, NEW.payment_recorded_by, NULL);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.payment_status = 'refunded' AND OLD.payment_status IS DISTINCT FROM 'refunded' THEN
    PERFORM public.ledger_refund_remaining(ARRAY(SELECT id FROM public.payment_transactions WHERE pathology_order_id = NEW.id AND kind = 'payment'),
                                           NEW.reconciliation_reason, NOW());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ledger_lab_orders ON public.pathology_orders;
CREATE TRIGGER trg_ledger_lab_orders AFTER INSERT OR UPDATE ON public.pathology_orders
  FOR EACH ROW EXECUTE FUNCTION public.ledger_lab_order_changes();

-- ----------------------------------------------------------------------------
-- 3. Write paths
-- ----------------------------------------------------------------------------
-- Desk fee: reception may only change or clear a recorded fee on the same IST
-- day it was collected (as an audited void); later corrections need the Super Admin.
CREATE OR REPLACE FUNCTION public.record_consultation_fee(p_appointment_id UUID, p_mode TEXT)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := public.lab_require_role(ARRAY['reception', 'admin']::user_role[]);
  v_appt public.appointments;
BEGIN
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
  IF v_appt.fee_payment_mode IS NOT DISTINCT FROM p_mode THEN
    RETURN v_appt; -- repeated click: nothing new to record
  END IF;
  IF p_mode IS NOT NULL AND v_appt.status IN ('cancelled') THEN
    RAISE EXCEPTION 'This appointment is cancelled; no fee can be recorded.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_appt.fee_payment_mode IS NOT NULL AND v_role <> 'admin'
     AND (v_appt.fee_collected_at AT TIME ZONE 'Asia/Kolkata')::DATE <> (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN
    RAISE EXCEPTION 'This fee was recorded on an earlier day. Ask the Super Admin to correct it.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.appointments
     SET fee_payment_mode = p_mode,
         payment_status   = CASE WHEN p_mode IS NULL THEN 'unpaid' ELSE 'paid' END,
         fee_collected_at = CASE WHEN p_mode IS NULL THEN NULL ELSE NOW() END,
         fee_collected_by = CASE WHEN p_mode IS NULL THEN NULL ELSE auth.uid() END
   WHERE id = p_appointment_id
  RETURNING * INTO v_appt;
  PERFORM public.lab_audit('payment.opd_counter', 'appointments', v_appt.id,
    format('Token #%s on %s: desk fee %s', v_appt.token_number, v_appt.appointment_date, COALESCE(p_mode, 'cleared')));
  RETURN v_appt;
END;
$$;

-- Pathology staff may now take lab payments at the counter too (OPD stays with reception).
CREATE OR REPLACE FUNCTION public.record_lab_payment(p_order_id UUID, p_mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.pathology_orders;
BEGIN
  PERFORM public.lab_require_role(ARRAY['reception', 'pathology', 'admin']::user_role[]);
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

-- Void a counter payment entered by mistake. Same IST day for staff of that
-- service; any day for the Super Admin. The original stays in the ledger.
CREATE OR REPLACE FUNCTION public.void_counter_payment(p_transaction_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := public.get_auth_role();
  v_tx public.payment_transactions;
  v_s RECORD;
  v_void UUID;
BEGIN
  SELECT * INTO v_tx FROM public.payment_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_tx.kind <> 'payment' OR v_tx.channel <> 'counter' THEN
    RAISE EXCEPTION 'Only counter payments can be voided.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_role IS NULL OR NOT (v_role = 'admin'
     OR (v_tx.service = 'opd' AND v_role = 'reception')
     OR (v_tx.service = 'pathology' AND v_role IN ('reception', 'pathology'))) THEN
    RAISE EXCEPTION 'You are not allowed to void this payment.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_role <> 'admin' AND (v_tx.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE <> (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN
    RAISE EXCEPTION 'Payments from earlier days can only be corrected by the Super Admin.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Give a reason for voiding this payment.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO v_s FROM public.ledger_settled(v_tx.id);
  IF v_s.voided THEN RAISE EXCEPTION 'This payment is already voided.' USING ERRCODE = 'check_violation'; END IF;
  IF v_s.refunded > 0 THEN RAISE EXCEPTION 'This payment has refunds; it cannot be voided.' USING ERRCODE = 'check_violation'; END IF;

  v_void := public.ledger_add(v_tx.service, 'void', v_tx.amount_paise, 'counter', v_tx.method, NULL, NULL, NOW(), v_tx.patient_profile_id,
                              v_tx.appointment_id, NULL, v_tx.pathology_order_id, v_tx.id, NULL, btrim(p_reason));
  -- Reopen the bill on the source record (the trigger sees no active payment left, so it adds nothing).
  IF v_tx.service = 'opd' AND v_tx.appointment_id IS NOT NULL THEN
    UPDATE public.appointments SET fee_payment_mode = NULL, payment_status = 'unpaid', fee_collected_at = NULL, fee_collected_by = NULL
     WHERE id = v_tx.appointment_id AND fee_payment_mode IS NOT NULL;
  ELSIF v_tx.service = 'pathology' AND v_tx.pathology_order_id IS NOT NULL THEN
    UPDATE public.pathology_orders SET payment_status = 'unpaid', payment_mode = NULL, paid_at = NULL, amount_received_paise = NULL,
           payment_recorded_by = NULL, updated_at = NOW()
     WHERE id = v_tx.pathology_order_id AND payment_status = 'paid' AND razorpay_payment_id IS NULL;
  END IF;
  PERFORM public.lab_audit('payment.voided', 'payment_transactions', v_tx.id, v_tx.receipt_number || ': ' || btrim(p_reason));
  RETURN v_void;
END;
$$;

-- Super Admin records a refund that was actually made (in the Razorpay dashboard
-- or in cash). Partial refunds allowed up to the amount still unrefunded.
-- This does not move money by itself.
CREATE OR REPLACE FUNCTION public.record_payment_refund(p_transaction_id UUID, p_amount_paise INTEGER, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions;
  v_s RECORD;
  v_id UUID;
BEGIN
  PERFORM public.lab_require_role(ARRAY['admin']::user_role[]);
  SELECT * INTO v_tx FROM public.payment_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_tx.kind <> 'payment' THEN RAISE EXCEPTION 'Choose a payment to refund.' USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO v_s FROM public.ledger_settled(v_tx.id);
  IF v_s.voided THEN RAISE EXCEPTION 'This payment was voided.' USING ERRCODE = 'check_violation'; END IF;
  IF COALESCE(p_amount_paise, 0) <= 0 OR p_amount_paise > v_tx.amount_paise - v_s.refunded THEN
    RAISE EXCEPTION 'Refund must be between ₹0.01 and ₹% (the amount not yet refunded).', round((v_tx.amount_paise - v_s.refunded) / 100.0, 2) USING ERRCODE = 'check_violation';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN RAISE EXCEPTION 'Give a reason or the refund reference.' USING ERRCODE = 'check_violation'; END IF;
  v_id := public.ledger_add(v_tx.service, 'refund', p_amount_paise, v_tx.channel, v_tx.method, v_tx.provider, NULL, NOW(), v_tx.patient_profile_id,
                            v_tx.appointment_id, v_tx.opd_payment_order_id, v_tx.pathology_order_id, v_tx.id, NULL, btrim(p_reason));
  PERFORM public.lab_audit('payment.refunded', 'payment_transactions', v_tx.id, format('%s: refund of %s paise — %s', v_tx.receipt_number, p_amount_paise, btrim(p_reason)));
  RETURN v_id;
END;
$$;

-- Edge Functions record how an online payment was made (UPI, card, …). Service role only.
CREATE OR REPLACE FUNCTION public.set_online_payment_method(p_external_id TEXT, p_method TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.payment_transactions SET method = p_method
   WHERE external_id = p_external_id AND method = 'unknown' AND p_method IN ('upi', 'card', 'netbanking', 'wallet', 'emi');
$$;

-- ----------------------------------------------------------------------------
-- 4. A second online payment for an already-paid order is real money: record it
--    (the order is still flagged for reconciliation/refund as before).
-- ----------------------------------------------------------------------------
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

  -- A different Razorpay payment for an order that already has one is extra money:
  -- record it (idempotent on the payment id) so it can be refunded, not lost.
  IF v_order.razorpay_payment_id IS NOT NULL AND v_order.razorpay_payment_id <> p_razorpay_payment_id THEN
    PERFORM public.ledger_add('opd', 'payment', p_amount_paise, 'online', NULL, 'razorpay', p_razorpay_payment_id, NOW(),
                              v_order.patient_profile_id, v_order.appointment_id, v_order.id, NULL, NULL, NULL,
                              'Additional payment for an already-paid booking — refund or reconcile');
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
    PERFORM public.ledger_add('pathology', 'payment', p_amount_paise, 'online', NULL, 'razorpay', p_razorpay_payment_id, NOW(),
                              v_order.patient_profile_id, NULL, NULL, v_order.id, NULL, NULL,
                              'Additional payment for an order that was already ' || v_order.payment_status || ' — refund or reconcile');
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

-- ----------------------------------------------------------------------------
-- 5. Reports (SECURITY INVOKER: ledger RLS scopes reception→OPD, pathology→lab)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_scope(p_service TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role user_role := public.get_auth_role();
BEGIN
  IF v_role = 'admin' THEN RETURN NULLIF(p_service, ''); END IF;
  IF v_role = 'reception' THEN RETURN 'opd'; END IF;
  IF v_role = 'pathology' THEN RETURN 'pathology'; END IF;
  RAISE EXCEPTION 'You are not allowed to view sales.' USING ERRCODE = 'insufficient_privilege';
END;
$$;

-- p_from/p_to: inclusive IST dates (NULL = open). p_channel: 'online' | 'counter' | NULL.
CREATE OR REPLACE FUNCTION public.finance_summary(p_from DATE, p_to DATE, p_service TEXT DEFAULT NULL, p_channel TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_service TEXT := public.finance_scope(p_service);
  v_result JSONB;
BEGIN
  WITH tx AS (
    SELECT t.*, (t.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE AS day,
           EXISTS (SELECT 1 FROM public.payment_transactions v WHERE v.related_id = t.id AND v.kind = 'void') AS is_voided
      FROM public.payment_transactions t
     WHERE (v_service IS NULL OR t.service = v_service)
       AND (p_channel IS NULL OR t.channel = p_channel)
       AND (p_from IS NULL OR (t.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE >= p_from)
       AND (p_to IS NULL OR (t.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE <= p_to)
  ),
  cells AS (
    SELECT s.service, c.channel,
           COALESCE(sum(tx.amount_paise) FILTER (WHERE tx.kind = 'payment' AND NOT tx.is_voided), 0) AS gross,
           count(*) FILTER (WHERE tx.kind = 'payment' AND NOT tx.is_voided) AS payments,
           COALESCE(sum(tx.amount_paise) FILTER (WHERE tx.kind = 'refund'), 0) AS refunds,
           count(*) FILTER (WHERE tx.kind = 'refund') AS refund_count,
           count(*) FILTER (WHERE tx.kind = 'void') AS voids
      FROM (VALUES ('opd'), ('pathology')) s(service)
      CROSS JOIN (VALUES ('online'), ('counter')) c(channel)
      LEFT JOIN tx ON tx.service = s.service AND tx.channel = c.channel
     WHERE v_service IS NULL OR s.service = v_service
     GROUP BY s.service, c.channel
  ),
  daily AS (
    SELECT day, service,
           COALESCE(sum(amount_paise) FILTER (WHERE kind = 'payment' AND NOT is_voided), 0) AS gross,
           COALESCE(sum(amount_paise) FILTER (WHERE kind = 'refund'), 0) AS refunds
      FROM tx GROUP BY day, service
  ),
  pending AS (
    SELECT 'opd' AS service, count(*) AS cnt, COALESCE(sum(round(COALESCE(a.consultation_fee_amount, 0) * 100)), 0) AS amount
      FROM public.appointments a
     WHERE (v_service IS NULL OR v_service = 'opd')
       AND a.status NOT IN ('cancelled', 'no_show') AND a.payment_status <> 'paid' AND a.fee_payment_mode IS NULL
       AND (p_from IS NULL OR a.appointment_date >= p_from) AND (p_to IS NULL OR a.appointment_date <= p_to)
    UNION ALL
    SELECT 'pathology', count(*), COALESCE(sum(o.total_paise), 0)
      FROM public.pathology_orders o
     WHERE (v_service IS NULL OR v_service = 'pathology')
       AND o.status <> 'cancelled' AND o.payment_status = 'unpaid'
       AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Asia/Kolkata')::DATE >= p_from)
       AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Asia/Kolkata')::DATE <= p_to)
  )
  SELECT jsonb_build_object(
    'service', v_service,
    'cells', (SELECT COALESCE(jsonb_agg(to_jsonb(cells) ORDER BY service, channel), '[]'::JSONB) FROM cells),
    'daily', (SELECT COALESCE(jsonb_agg(to_jsonb(daily) ORDER BY day, service), '[]'::JSONB) FROM daily),
    'pending', (SELECT COALESCE(jsonb_agg(jsonb_build_object('service', service, 'count', cnt, 'amount', amount)), '[]'::JSONB) FROM pending WHERE v_service IS NULL OR service = v_service)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_transactions(
  p_from DATE, p_to DATE, p_service TEXT DEFAULT NULL, p_channel TEXT DEFAULT NULL, p_kind TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'desc', p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_service TEXT := public.finance_scope(p_service);
  v_q TEXT := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_result JSONB;
BEGIN
  WITH rows AS (
    SELECT t.id, t.receipt_number, t.service, t.kind, t.amount_paise, t.channel, t.method, t.provider, t.external_id, t.occurred_at,
           t.related_id, t.recorded_by_name, t.notes, t.appointment_id, t.pathology_order_id, t.opd_payment_order_id,
           p.full_name AS patient_name, p.patient_id AS patient_code,
           COALESCE(a.booking_reference, a.appointment_code, oo.booking_reference, lo.order_number) AS reference,
           a.token_number, a.appointment_date,
           (SELECT COALESCE(sum(r.amount_paise), 0) FROM public.payment_transactions r WHERE r.related_id = t.id AND r.kind = 'refund') AS refunded_paise,
           EXISTS (SELECT 1 FROM public.payment_transactions v WHERE v.related_id = t.id AND v.kind = 'void') AS voided,
           (SELECT o.receipt_number FROM public.payment_transactions o WHERE o.id = t.related_id) AS related_receipt
      FROM public.payment_transactions t
      LEFT JOIN public.patient_profiles p ON p.id = t.patient_profile_id
      LEFT JOIN public.appointments a ON a.id = t.appointment_id
      LEFT JOIN public.opd_payment_orders oo ON oo.id = t.opd_payment_order_id
      LEFT JOIN public.pathology_orders lo ON lo.id = t.pathology_order_id
     WHERE (v_service IS NULL OR t.service = v_service)
       AND (p_channel IS NULL OR t.channel = p_channel)
       AND (p_kind IS NULL OR t.kind = p_kind)
       AND (p_from IS NULL OR (t.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE >= p_from)
       AND (p_to IS NULL OR (t.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE <= p_to)
       AND (v_q IS NULL OR t.receipt_number ILIKE '%' || v_q || '%' OR t.external_id ILIKE '%' || v_q || '%'
            OR p.full_name ILIKE '%' || v_q || '%' OR p.patient_id ILIKE '%' || v_q || '%'
            OR a.booking_reference ILIKE '%' || v_q || '%' OR oo.booking_reference ILIKE '%' || v_q || '%' OR lo.order_number ILIKE '%' || v_q || '%')
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM rows),
    'rows', COALESCE((
      SELECT jsonb_agg(to_jsonb(page) ORDER BY ord) FROM (
        SELECT r.*, row_number() OVER (ORDER BY CASE WHEN p_sort = 'asc' THEN NULL ELSE r.occurred_at END DESC,
                                                 CASE WHEN p_sort = 'asc' THEN r.occurred_at END ASC, r.receipt_number) AS ord
          FROM rows r ORDER BY ord
         LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 5000) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
      ) page
    ), '[]'::JSONB)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Super Admin: records that can't be reconciled automatically.
CREATE OR REPLACE FUNCTION public.finance_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.lab_require_role(ARRAY['admin']::user_role[]);
  RETURN jsonb_build_object(
    'opd_fee_without_ledger', (SELECT COALESCE(jsonb_agg(jsonb_build_object('appointment_id', a.id, 'date', a.appointment_date, 'token', a.token_number, 'mode', a.fee_payment_mode, 'reason', CASE WHEN a.fee_collected_at IS NULL THEN 'Fee marked paid without a collection time' ELSE 'No ledger entry' END)), '[]'::JSONB)
       FROM public.appointments a
      WHERE a.fee_payment_mode IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.appointment_id = a.id AND t.kind = 'payment' AND t.channel = 'counter'
                         AND NOT EXISTS (SELECT 1 FROM public.payment_transactions v WHERE v.related_id = t.id AND v.kind = 'void'))),
    'online_without_ledger', (SELECT COALESCE(jsonb_agg(jsonb_build_object('service', s, 'reference', ref, 'reason', 'Online payment without amount or time')), '[]'::JSONB) FROM (
        SELECT 'opd' AS s, booking_reference AS ref FROM public.opd_payment_orders o
         WHERE razorpay_payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.external_id = o.razorpay_payment_id)
        UNION ALL
        SELECT 'pathology', order_number FROM public.pathology_orders o
         WHERE razorpay_payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.external_id = o.razorpay_payment_id)) x),
    'lab_paid_without_ledger', (SELECT COALESCE(jsonb_agg(jsonb_build_object('reference', o.order_number, 'mode', o.payment_mode)), '[]'::JSONB)
       FROM public.pathology_orders o
      WHERE o.payment_status IN ('paid', 'refund_due') AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.pathology_order_id = o.id AND t.kind = 'payment')),
    'multiple_payments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('service', service, 'reference', COALESCE(oo.booking_reference, lo.order_number), 'payments', n)), '[]'::JSONB) FROM (
        SELECT service, opd_payment_order_id, pathology_order_id, count(*) AS n FROM public.payment_transactions t
         WHERE kind = 'payment' AND channel = 'online'
           AND NOT EXISTS (SELECT 1 FROM public.payment_transactions v WHERE v.related_id = t.id AND v.kind = 'void')
         GROUP BY service, opd_payment_order_id, pathology_order_id HAVING count(*) > 1) d
        LEFT JOIN public.opd_payment_orders oo ON oo.id = d.opd_payment_order_id
        LEFT JOIN public.pathology_orders lo ON lo.id = d.pathology_order_id),
    'open_cases', (SELECT COALESCE(jsonb_agg(jsonb_build_object('service', s, 'reference', ref, 'status', st, 'reason', why)), '[]'::JSONB) FROM (
        SELECT 'opd' AS s, booking_reference AS ref, status AS st, reconciliation_reason AS why FROM public.opd_payment_orders WHERE status = 'needs_reconciliation'
        UNION ALL
        SELECT 'pathology', order_number, payment_status, reconciliation_reason FROM public.pathology_orders WHERE payment_status IN ('needs_reconciliation', 'refund_due')) y)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Grants
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.ledger_add(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, UUID, UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_refund_remaining(UUID[], TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_settled(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_online_payment_method(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_online_payment_method(TEXT, TEXT) TO service_role;
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'void_counter_payment(UUID, TEXT)', 'record_payment_refund(UUID, INTEGER, TEXT)', 'finance_scope(TEXT)',
    'finance_summary(DATE, DATE, TEXT, TEXT)', 'finance_transactions(DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER)',
    'finance_reconciliation()', 'record_lab_payment(UUID, TEXT)', 'record_consultation_fee(UUID, TEXT)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 7. One-time backfill from existing records (only where a real payment time exists)
-- ----------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.opd_payment_orders
            WHERE razorpay_payment_id IS NOT NULL AND amount_received_paise IS NOT NULL AND paid_at IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.external_id = opd_payment_orders.razorpay_payment_id) LOOP
    PERFORM public.ledger_add('opd', 'payment', r.amount_received_paise, 'online', NULL, 'razorpay', r.razorpay_payment_id, r.paid_at,
                              r.patient_profile_id, r.appointment_id, r.id, NULL, NULL, NULL, 'Backfilled from existing records');
    IF r.status = 'refunded' THEN
      PERFORM public.ledger_refund_remaining(ARRAY(SELECT id FROM public.payment_transactions WHERE external_id = r.razorpay_payment_id),
                                             'Backfilled: ' || COALESCE(r.resolution_note, 'refunded'), COALESCE(r.resolved_at, r.updated_at));
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM public.appointments a
            WHERE a.fee_payment_mode IS NOT NULL AND a.fee_collected_at IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.appointment_id = a.id AND t.channel = 'counter') LOOP
    PERFORM public.ledger_add('opd', 'payment', round(COALESCE(r.consultation_fee_amount, 0) * 100)::INTEGER, 'counter', r.fee_payment_mode, NULL, NULL,
                              r.fee_collected_at, r.patient_profile_id, r.id, NULL, NULL, NULL, r.fee_collected_by, 'Backfilled from existing records');
  END LOOP;

  FOR r IN SELECT * FROM public.pathology_orders o
            WHERE o.paid_at IS NOT NULL AND o.payment_status IN ('paid', 'refund_due', 'refunded', 'needs_reconciliation')
              AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.pathology_order_id = o.id AND t.kind = 'payment') LOOP
    IF r.razorpay_payment_id IS NOT NULL AND r.amount_received_paise IS NOT NULL THEN
      PERFORM public.ledger_add('pathology', 'payment', r.amount_received_paise, 'online', NULL, 'razorpay', r.razorpay_payment_id, r.paid_at,
                                r.patient_profile_id, NULL, NULL, r.id, NULL, NULL, 'Backfilled from existing records');
    ELSIF r.payment_mode IN ('cash', 'upi') THEN
      PERFORM public.ledger_add('pathology', 'payment', COALESCE(r.amount_received_paise, r.total_paise), 'counter', r.payment_mode, NULL, NULL, r.paid_at,
                                r.patient_profile_id, NULL, NULL, r.id, NULL, r.payment_recorded_by, 'Backfilled from existing records');
    END IF;
    IF r.payment_status = 'refunded' THEN
      PERFORM public.ledger_refund_remaining(ARRAY(SELECT id FROM public.payment_transactions WHERE pathology_order_id = r.id AND kind = 'payment'),
                                             'Backfilled: refund date taken from the order''s last update', r.updated_at);
    END IF;
  END LOOP;
END $$;
