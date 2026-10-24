/**
 * Online-payment exceptions for reception/admin (RLS: staff roles only).
 * Reception can view; only an administrator can record a resolution, and no
 * one can mark an unverified payment as paid from the browser.
 */
import { supabase } from '../lib/supabase';

export interface PaymentCase {
  id: string;
  bookingReference: string;
  appointmentDate: string;
  patientName: string;
  contactPhone: string;
  amountPaise: number;
  status: 'awaiting_payment' | 'needs_reconciliation' | 'cancelled' | 'paid' | 'refunded' | 'resolved';
  razorpayPaymentId: string | null;
  lastPaymentError: string | null;
  reconciliationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): PaymentCase => ({
  id: r.id,
  bookingReference: r.booking_reference,
  appointmentDate: r.appointment_date,
  patientName: r.patient_name,
  contactPhone: r.contact_phone,
  amountPaise: r.amount_paise,
  status: r.status,
  razorpayPaymentId: r.razorpay_payment_id,
  lastPaymentError: r.last_payment_error,
  reconciliationReason: r.reconciliation_reason,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const paymentCasesService = {
  /** Cases needing attention: unreconciled payments, and failed attempts for upcoming dates. */
  async list(fromDate: string): Promise<PaymentCase[]> {
    const { data, error } = await client()
      .from('opd_payment_orders')
      .select('id, booking_reference, appointment_date, patient_name, contact_phone, amount_paise, status, razorpay_payment_id, last_payment_error, reconciliation_reason, created_at, updated_at')
      .or(`status.eq.needs_reconciliation,and(status.eq.awaiting_payment,last_payment_error.not.is.null,appointment_date.gte.${fromDate})`)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data || []).map(map);
  },

  async resolve(id: string, resolution: 'refunded' | 'resolved', note: string) {
    const { error } = await client().rpc('resolve_opd_payment_case', { p_order_id: id, p_resolution: resolution, p_note: note });
    if (error) throw new Error(error.message);
  },

  subscribe(onChange: () => void): () => void {
    const sb = client();
    const channel = sb
      .channel('opd-payment-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opd_payment_orders' }, () => onChange())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  },
};
