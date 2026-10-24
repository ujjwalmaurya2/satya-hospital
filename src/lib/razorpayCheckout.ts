/**
 * Loads Razorpay Checkout (official script) on demand and wraps it in a promise.
 * The result only tells the UI what happened in the popup; payment is confirmed
 * exclusively by the server (signature + Razorpay API + webhook).
 */
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (resp: any) => void): void };
  }
}

let loading: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type CheckoutResult =
  | { kind: 'success'; response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string } }
  | { kind: 'dismissed' }
  | { kind: 'failed'; message: string };

export async function openRazorpayCheckout(params: {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  description: string;
  prefill: { name?: string; contact?: string; email?: string };
}): Promise<CheckoutResult> {
  await loadRazorpay();
  return new Promise(resolve => {
    let settled = false;
    let lastFailure: string | null = null;
    const done = (r: CheckoutResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const rzp = new window.Razorpay!({
      key: params.keyId,
      order_id: params.orderId,
      amount: params.amountPaise,
      currency: params.currency,
      name: 'Satya Hospital & Pathology',
      description: params.description,
      image: `${window.location.origin}/favicon.svg`,
      prefill: params.prefill,
      theme: { color: '#1E78A4' },
      handler: (response: any) => done({ kind: 'success', response }),
      modal: {
        // Closing after a failed attempt reports the failure, otherwise a dismissal.
        ondismiss: () => done(lastFailure ? { kind: 'failed', message: lastFailure } : { kind: 'dismissed' }),
      },
    });
    // Razorpay keeps the window open so the patient can retry; remember the reason.
    rzp.on('payment.failed', (resp: any) => {
      lastFailure = resp?.error?.description || 'The payment did not go through.';
    });
    rzp.open();
  });
}
