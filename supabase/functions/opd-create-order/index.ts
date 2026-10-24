// POST /functions/v1/opd-create-order
// Signed-in patient submits booking details; the database validates them,
// fixes the amount from hospital_settings, and this function creates (or
// reuses) the Razorpay order for that amount. The browser never sends a price.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, fromDbError, json, requireEnv } from '../_shared/http.ts';
import { createOrder } from '../_shared/razorpay.ts';

interface Body {
  appointmentDate?: string;
  patientName?: string;
  phone?: string;
  gender?: string | null;
  reason?: string;
  idempotencyKey?: string;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Please sign in to book an appointment.' }, 401);

  let creds;
  try {
    creds = { keyId: requireEnv('RAZORPAY_KEY_ID'), keySecret: requireEnv('RAZORPAY_KEY_SECRET') };
  } catch {
    return json({ error: 'Online payment is not configured yet. Please book at the reception desk.' }, 503);
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const supabaseUrl = requireEnv('SUPABASE_URL');

  // Runs as the patient: auth.uid(), RLS and all booking rules apply.
  const asUser = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: order, error } = await asUser.rpc('prepare_opd_payment', {
    p_date: body.appointmentDate,
    p_patient_name: body.patientName,
    p_phone: body.phone,
    p_gender: body.gender || null,
    p_reason: body.reason,
    p_idempotency_key: body.idempotencyKey,
  });
  if (error) return fromDbError(error);

  if (order.status === 'paid' || order.appointment_id) {
    return json({ alreadyPaid: true, bookingReference: order.booking_reference });
  }
  if (order.status === 'needs_reconciliation') {
    return json({ error: 'A payment for this booking needs attention. Please contact reception.', bookingReference: order.booking_reference }, 409);
  }

  const asServer = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  let razorpayOrderId: string = order.razorpay_order_id;
  if (!razorpayOrderId) {
    try {
      const created = await createOrder(creds, {
        amountPaise: order.amount_paise,
        receipt: order.booking_reference,
        notes: { booking_reference: order.booking_reference, appointment_date: order.appointment_date },
      });
      razorpayOrderId = created.id;
    } catch (e) {
      console.error('opd-create-order: Razorpay order creation failed', (e as Error).message);
      return json({ error: 'Could not start the payment. Please try again in a moment.' }, 502);
    }
    const { error: attachError } = await asServer.rpc('attach_razorpay_order', { p_order_id: order.id, p_razorpay_order_id: razorpayOrderId });
    if (attachError) {
      // A parallel request linked its own order first; use that one.
      const { data: current } = await asServer.from('opd_payment_orders').select('razorpay_order_id').eq('id', order.id).single();
      if (!current?.razorpay_order_id) return json({ error: 'Could not start the payment. Please try again.' }, 409);
      razorpayOrderId = current.razorpay_order_id;
    }
  }

  return json({
    keyId: creds.keyId,
    razorpayOrderId,
    amountPaise: order.amount_paise,
    currency: order.currency,
    bookingReference: order.booking_reference,
    appointmentDate: order.appointment_date,
    patientName: order.patient_name,
    phone: order.contact_phone,
  });
});
