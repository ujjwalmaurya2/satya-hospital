/**
 * Razorpay helpers shared by the Edge Functions. Runtime-agnostic (Web Crypto +
 * fetch), so the same code runs in Deno and in the Vitest suite.
 *
 * Secrets (RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) are passed in by the
 * caller from server-side environment variables and are never logged.
 */

const encoder = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time comparison of two hex strings. */
export function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout success signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string; keySecret: string }): Promise<boolean> {
  const { orderId, paymentId, signature, keySecret } = params;
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret). */
export async function verifyWebhookSignature(params: { rawBody: string; signature: string | null; webhookSecret: string }): Promise<boolean> {
  const { rawBody, signature, webhookSecret } = params;
  if (!rawBody || !signature || !webhookSecret) return false;
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return safeEqualHex(expected, signature);
}

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

function authHeader({ keyId, keySecret }: RazorpayCredentials) {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

async function call<T>(creds: RazorpayCredentials, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { Authorization: authHeader(creds), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Razorpay error descriptions contain no secrets; keep them short in logs.
    const description = (body as { error?: { description?: string } })?.error?.description || res.statusText;
    throw new Error(`Razorpay ${path} failed: ${res.status} ${description}`);
  }
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method?: string; // upi | card | netbanking | wallet | emi
  error_description?: string | null;
}

export function createOrder(creds: RazorpayCredentials, params: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  return call<RazorpayOrder>(creds, '/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: params.amountPaise, currency: 'INR', receipt: params.receipt.slice(0, 40), notes: params.notes }),
  });
}

export function fetchPayment(creds: RazorpayCredentials, paymentId: string) {
  return call<RazorpayPayment>(creds, `/payments/${encodeURIComponent(paymentId)}`);
}

export function capturePayment(creds: RazorpayCredentials, paymentId: string, amountPaise: number) {
  return call<RazorpayPayment>(creds, `/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: 'POST',
    body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
  });
}

/** Decide whether a fetched payment proves money was received for this order. */
export function isSettledPaymentForOrder(payment: Pick<RazorpayPayment, 'order_id' | 'status' | 'currency'>, orderId: string) {
  return payment.order_id === orderId && payment.currency === 'INR' && (payment.status === 'captured' || payment.status === 'authorized');
}
