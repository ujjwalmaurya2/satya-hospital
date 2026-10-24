import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  hmacSha256Hex,
  isSettledPaymentForOrder,
  safeEqualHex,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../../supabase/functions/_shared/razorpay';

const SECRET = 'test_key_secret_not_real';

describe('Razorpay signature verification (Edge Function helpers)', () => {
  it('matches Node’s HMAC-SHA256 output', async () => {
    const expected = createHmac('sha256', SECRET).update('order_1|pay_1').digest('hex');
    expect(await hmacSha256Hex(SECRET, 'order_1|pay_1')).toBe(expected);
  });

  it('accepts a correct checkout signature and rejects tampered ones', async () => {
    const signature = createHmac('sha256', SECRET).update('order_ABC|pay_XYZ').digest('hex');
    expect(await verifyPaymentSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature, keySecret: SECRET })).toBe(true);
    expect(await verifyPaymentSignature({ orderId: 'order_ABC', paymentId: 'pay_OTHER', signature, keySecret: SECRET })).toBe(false);
    expect(await verifyPaymentSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature, keySecret: 'wrong' })).toBe(false);
    expect(await verifyPaymentSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature: '', keySecret: SECRET })).toBe(false);
  });

  it('verifies webhook signatures over the exact raw body', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });
    const signature = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(await verifyWebhookSignature({ rawBody: body, signature, webhookSecret: 'whsec' })).toBe(true);
    expect(await verifyWebhookSignature({ rawBody: body + ' ', signature, webhookSecret: 'whsec' })).toBe(false);
    expect(await verifyWebhookSignature({ rawBody: body, signature: null, webhookSecret: 'whsec' })).toBe(false);
  });

  it('compares in constant time and rejects length mismatches', () => {
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abce')).toBe(false);
    expect(safeEqualHex('abcd', 'abc')).toBe(false);
  });

  it('only treats captured/authorized INR payments for the same order as settled', () => {
    expect(isSettledPaymentForOrder({ order_id: 'o1', status: 'captured', currency: 'INR' }, 'o1')).toBe(true);
    expect(isSettledPaymentForOrder({ order_id: 'o1', status: 'authorized', currency: 'INR' }, 'o1')).toBe(true);
    expect(isSettledPaymentForOrder({ order_id: 'o1', status: 'failed', currency: 'INR' }, 'o1')).toBe(false);
    expect(isSettledPaymentForOrder({ order_id: 'o2', status: 'captured', currency: 'INR' }, 'o1')).toBe(false);
  });
});
