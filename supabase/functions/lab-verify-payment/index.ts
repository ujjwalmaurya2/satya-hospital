// POST /functions/v1/lab-verify-payment
// After Razorpay Checkout reports success: verify the HMAC signature, fetch the
// payment from Razorpay, then confirm the lab order in the database. The browser
// callback alone never marks an order paid; the webhook covers missed callbacks.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';
import { capturePayment, fetchPayment, isSettledPaymentForOrder, verifyPaymentSignature } from '../_shared/razorpay.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Please sign in.' }, 401);

  let creds;
  try {
    creds = { keyId: requireEnv('RAZORPAY_KEY_ID'), keySecret: requireEnv('RAZORPAY_KEY_SECRET') };
  } catch {
    return json({ error: 'Online payment is not configured.' }, 503);
  }

  const body = (await req.json().catch(() => ({}))) as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  const orderId = body.razorpay_order_id ?? '';
  const paymentId = body.razorpay_payment_id ?? '';
  const supabaseUrl = requireEnv('SUPABASE_URL');

  const asUser = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: own } = await asUser.from('pathology_orders').select('id, order_number, total_paise').eq('razorpay_order_id', orderId).maybeSingle();
  if (!own) return json({ error: 'Order not found.' }, 404);

  if (!(await verifyPaymentSignature({ orderId, paymentId, signature: body.razorpay_signature ?? '', keySecret: creds.keySecret }))) {
    return json({ error: 'Payment could not be verified.', orderNumber: own.order_number }, 400);
  }

  let payment;
  try {
    payment = await fetchPayment(creds, paymentId);
    if (payment.status === 'authorized' && payment.order_id === orderId) payment = await capturePayment(creds, paymentId, own.total_paise);
  } catch (e) {
    console.error('lab-verify-payment: Razorpay lookup failed', (e as Error).message);
    return json({ status: 'pending_verification', orderNumber: own.order_number }, 202);
  }
  if (!isSettledPaymentForOrder(payment, orderId)) return json({ status: 'not_paid', orderNumber: own.order_number }, 402);

  const asServer = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: result, error } = await asServer.rpc('confirm_lab_payment', {
    p_razorpay_order_id: orderId,
    p_razorpay_payment_id: payment.id,
    p_amount_paise: payment.amount,
    p_source: 'checkout_verify',
  });
  // Ledger: record how the patient paid (UPI, card, …) for sales reporting.
  if (!error && payment.method) await asServer.rpc('set_online_payment_method', { p_external_id: payment.id, p_method: payment.method });
  if (error) {
    console.error('lab-verify-payment: confirmation failed', error.code);
    return json({ status: 'pending_verification', orderNumber: own.order_number }, 202);
  }
  return json({ status: result.result === 'already_confirmed' ? 'confirmed' : result.result, orderNumber: result.order_number });
});
