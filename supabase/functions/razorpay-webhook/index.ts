// POST /functions/v1/razorpay-webhook   (deploy with --no-verify-jwt)
// Razorpay -> server notification. Verifies X-Razorpay-Signature against the
// raw body, processes each event id once, and confirms bookings whose browser
// callback never arrived (closed tab, network drop, delayed payment).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireEnv } from '../_shared/http.ts';
import { verifyWebhookSignature } from '../_shared/razorpay.ts';

const ok = (msg = 'ok') => new Response(msg, { status: 200 });

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  const valid = await verifyWebhookSignature({
    rawBody,
    signature: req.headers.get('x-razorpay-signature'),
    webhookSecret: requireEnv('RAZORPAY_WEBHOOK_SECRET'),
  });
  if (!valid) return new Response('Invalid signature', { status: 401 });

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const payment = event?.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id ?? event?.payload?.order?.entity?.id;
  const eventId = req.headers.get('x-razorpay-event-id') ?? `${event?.event}:${payment?.id ?? orderId}`;

  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  const { data: fresh, error: claimError } = await db.rpc('claim_razorpay_webhook_event', {
    p_event_id: eventId,
    p_event_type: String(event?.event ?? 'unknown'),
    p_razorpay_order_id: orderId ?? null,
  });
  if (claimError) return new Response('Retry later', { status: 500 });
  if (!fresh) return ok('duplicate');
  if (!orderId) return ok('ignored');

  switch (event.event) {
    case 'payment.captured':
    case 'order.paid': {
      if (!payment || payment.status !== 'captured' || payment.currency !== 'INR') return ok('ignored');
      const args = { p_razorpay_order_id: orderId, p_razorpay_payment_id: payment.id, p_amount_paise: payment.amount, p_source: 'webhook' };
      let { error } = await db.rpc('confirm_opd_payment', args);
      // Not an OPD booking: try lab orders (P0002 = unknown order in that table).
      if (error?.code === 'P0002') ({ error } = await db.rpc('confirm_lab_payment', args));
      // Unknown everywhere: acknowledge so Razorpay stops retrying.
      if (error && error.code !== 'P0002') {
        console.error('razorpay-webhook: confirmation failed', error.code);
        await db.from('razorpay_webhook_events').delete().eq('event_id', eventId); // allow Razorpay's retry
        return new Response('Retry later', { status: 500 });
      }
      return ok();
    }
    case 'payment.failed': {
      const failure = { p_razorpay_order_id: orderId, p_reason: payment?.error_description ?? 'Payment failed' };
      await db.rpc('record_opd_payment_failure', failure);
      await db.rpc('record_lab_payment_failure', failure);
      return ok();
    }
    default:
      return ok('ignored');
  }
});
