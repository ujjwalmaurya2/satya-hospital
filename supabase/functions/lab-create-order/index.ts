// POST /functions/v1/lab-create-order   { orderNumber }
// Signed-in patient pays for their own pending lab order. The amount comes from
// the order row (priced by the database), never from the browser.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';
import { createOrder } from '../_shared/razorpay.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Please sign in.' }, 401);

  let creds;
  try {
    creds = { keyId: requireEnv('RAZORPAY_KEY_ID'), keySecret: requireEnv('RAZORPAY_KEY_SECRET') };
  } catch {
    return json({ error: 'Online payment is not configured yet. Please pay at the lab.' }, 503);
  }

  const { orderNumber } = (await req.json().catch(() => ({}))) as { orderNumber?: string };
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const asUser = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: config } = await asUser.rpc('lab_config');
  if (!config?.online_payment_enabled) return json({ error: 'Online payment is not enabled. Please pay at the lab.' }, 409);

  // RLS: patients can only read their own orders.
  const { data: order } = await asUser
    .from('pathology_orders')
    .select('id, order_number, status, payment_status, total_paise, razorpay_order_id, patient_name, contact_phone')
    .eq('order_number', orderNumber ?? '')
    .maybeSingle();
  if (!order) return json({ error: 'Order not found.' }, 404);
  if (order.payment_status === 'paid') return json({ alreadyPaid: true, orderNumber: order.order_number });
  if (order.status !== 'pending' || order.payment_status !== 'unpaid' || order.total_paise <= 0) {
    return json({ error: 'This order cannot be paid online. Please contact reception.' }, 409);
  }

  let razorpayOrderId: string = order.razorpay_order_id;
  if (!razorpayOrderId) {
    try {
      const created = await createOrder(creds, {
        amountPaise: order.total_paise,
        receipt: order.order_number,
        notes: { kind: 'lab', order_number: order.order_number },
      });
      razorpayOrderId = created.id;
    } catch (e) {
      console.error('lab-create-order: Razorpay order creation failed', (e as Error).message);
      return json({ error: 'Could not start the payment. Please try again in a moment.' }, 502);
    }
    const asServer = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const { error } = await asServer.rpc('attach_lab_razorpay_order', { p_order_id: order.id, p_razorpay_order_id: razorpayOrderId });
    if (error) {
      // A parallel request attached its order first; pay that one instead.
      const { data: current } = await asServer.from('pathology_orders').select('razorpay_order_id').eq('id', order.id).single();
      if (!current?.razorpay_order_id) return json({ error: 'Could not start the payment. Please try again.' }, 409);
      razorpayOrderId = current.razorpay_order_id;
    }
  }

  return json({
    keyId: creds.keyId,
    razorpayOrderId,
    amountPaise: order.total_paise,
    currency: 'INR',
    orderNumber: order.order_number,
    patientName: order.patient_name,
    phone: order.contact_phone,
  });
});
