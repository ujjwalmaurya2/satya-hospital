/**
 * Online OPD booking client. All rules (date eligibility, IST cutoff, amount,
 * idempotency, token assignment) are enforced in Postgres and the Edge
 * Functions; this module only calls them and normalises their results.
 */
import { supabase } from '../lib/supabase';

export interface OpdBookingInput {
  appointmentDate: string;
  patientName: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | null;
  reason: string;
  idempotencyKey: string;
}

export interface Eligibility {
  allowed: boolean;
  code: string;
  reason: string | null;
  today: string;
  nextEligibleDate: string | null;
  maxDate: string;
  cutoffTime: string;
}

export interface PaymentConfig {
  onlinePaymentEnabled: boolean;
  consultationFee: number | null;
  currency: 'INR';
}

export interface CheckoutOrder {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  bookingReference: string;
  appointmentDate: string;
  patientName: string;
  phone: string;
}

export type BookingStatus = 'confirmed' | 'awaiting_payment' | 'cancelled' | 'needs_reconciliation' | 'refunded' | 'resolved' | 'pending_verification';

export interface MyBooking {
  status: BookingStatus;
  paymentStatus: 'paid' | 'unpaid' | 'pay_at_reception';
  bookingReference: string;
  appointmentDate: string;
  patientName: string;
  amountPaise?: number;
  tokenNumber: number | null;
  lastPaymentError?: string | null;
}

function client() {
  if (!supabase) throw new Error('Online booking is unavailable right now. Please call the reception desk.');
  return supabase;
}

/** Turn an Edge Function error into the server's own message where possible. */
async function functionError(error: unknown): Promise<Error> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return new Error(body.error);
    } catch {
      /* fall through */
    }
  }
  return new Error((error as Error)?.message || 'Something went wrong. Please try again.');
}

export const opdBookingService = {
  async eligibility(date: string): Promise<Eligibility> {
    const { data, error } = await client().rpc('opd_booking_eligibility', { p_date: date });
    if (error) throw new Error(error.message);
    return {
      allowed: data.allowed,
      code: data.code,
      reason: data.reason,
      today: data.today,
      nextEligibleDate: data.next_eligible_date,
      maxDate: data.max_date,
      cutoffTime: data.cutoff_time,
    };
  },

  async paymentConfig(): Promise<PaymentConfig> {
    const { data, error } = await client().rpc('opd_payment_config');
    if (error || !data) return { onlinePaymentEnabled: false, consultationFee: null, currency: 'INR' };
    return {
      onlinePaymentEnabled: Boolean(data.online_payment_enabled),
      consultationFee: data.consultation_fee != null ? Number(data.consultation_fee) : null,
      currency: 'INR',
    };
  },

  async createOrder(input: OpdBookingInput): Promise<CheckoutOrder | { alreadyPaid: true; bookingReference: string }> {
    const { data, error } = await client().functions.invoke('opd-create-order', { body: input });
    if (error) throw await functionError(error);
    return data;
  },

  async verifyPayment(response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const { data, error } = await client().functions.invoke('opd-verify-payment', { body: response });
    if (error) {
      // 202 (pending) is not an error; anything else surfaces the server message.
      throw await functionError(error);
    }
    return data as { status: string; bookingReference: string; tokenNumber: number | null; appointmentDate: string | null };
  },

  async bookPayAtReception(input: OpdBookingInput): Promise<MyBooking> {
    const { data, error } = await client().rpc('book_opd_pay_at_reception', {
      p_date: input.appointmentDate,
      p_patient_name: input.patientName,
      p_phone: input.phone,
      p_gender: input.gender,
      p_reason: input.reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return {
      status: 'confirmed',
      paymentStatus: 'pay_at_reception',
      bookingReference: data.booking_reference,
      appointmentDate: data.appointment_date,
      patientName: data.patient_name,
      tokenNumber: data.token_number,
    };
  },

  async myBooking(bookingReference: string): Promise<MyBooking | null> {
    const { data, error } = await client().rpc('get_my_opd_booking', { p_booking_reference: bookingReference });
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      status: data.status,
      paymentStatus: data.payment_status,
      bookingReference: data.booking_reference,
      appointmentDate: data.appointment_date,
      patientName: data.patient_name,
      amountPaise: data.amount_paise,
      tokenNumber: data.token_number ?? null,
      lastPaymentError: data.last_payment_error,
    };
  },

  async cancelPending(bookingReference: string) {
    await client().rpc('cancel_my_opd_payment', { p_booking_reference: bookingReference });
  },
};
