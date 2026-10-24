// POST /functions/v1/opd-verify-payment
// Called after Razorpay Checkout reports success. The browser callback is NOT
// trusted on its own: we check the HMAC signature, then fetch the payment from
// Razorpay to confirm order, currency and amount before confirming the booking.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';
import { capturePayment, fetchPayment, isSettledPaymentForOrder, verifyPaymentSignature } from '../_shared/razorpay.ts';

interface Body {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Please sign in.' }, 401);

  const body = (await req.json().catch(() => ({}))) as Body;
  const orderId = body.razorpay_order_id ?? '';
  const paymentId = body.razorpay_payment_id ?? '';
  const signature = body.razorpay_signature ?? '';

  const creds = { keyId: requireEnv('RAZORPAY_KEY_ID'), keySecret: requireEnv('RAZORPAY_KEY_SECRET') };
  const supabaseUrl = requireEnv('SUPABASE_URL');

  // The order must belong to the signed-in patient (RLS: own rows only).
  const asUser = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: own } = await asUser
    .from('opd_payment_orders')
    .select('id, booking_reference, amount_paise')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!own) return json({ error: 'Booking not found.' }, 404);

  if (!(await verifyPaymentSignature({ orderId, paymentId, signature, keySecret: creds.keySecret }))) {
    return json({ error: 'Payment could not be verified.', bookingReference: own.booking_reference }, 400);
  }

  let payment;
  try {
    payment = await fetchPayment(creds, paymentId);
    if (payment.status === 'authorized' && payment.order_id === orderId) {
      payment = await capturePayment(creds, paymentId, own.amount_paise);
    }
  } catch (e) {
    console.error('opd-verify-payment: Razorpay lookup failed', (e as Error).message);
    // Signature was valid; the webhook will confirm. Show a pending state.
    return json({ status: 'pending_verification', bookingReference: own.booking_reference }, 202);
  }

  if (!isSettledPaymentForOrder(payment, orderId)) {
    return json({ status: 'not_paid', bookingReference: own.booking_reference }, 402);
  }

  const asServer = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: result, error } = await asServer.rpc('confirm_opd_payment', {
    p_razorpay_order_id: orderId,
    p_razorpay_payment_id: payment.id,
    p_amount_paise: payment.amount,
    p_source: 'checkout_verify',
  });
  if (error) {
    console.error('opd-verify-payment: confirmation failed', error.code);
    return json({ status: 'pending_verification', bookingReference: own.booking_reference }, 202);
  }

  return json({
    status: result.result === 'confirmed' || result.result === 'already_confirmed' ? 'confirmed' : result.result,
    bookingReference: result.booking_reference,
    tokenNumber: result.token_number ?? null,
    appointmentDate: result.appointment_date ?? null,
  });
});
