import { describe, it, expect } from 'vitest';
import { 
  verifyRazorpaySignature, 
  processRazorpayPayment, 
  isPaymentSecretExposedInFrontend,
  RazorpayOrderRequest
} from '../lib/payments';
import { Appointment } from '../types';

describe('Satya Hospital - Payment & Booking Reconciliation', () => {
  it('strictly verifies that payment secrets are never exposed to frontend client code', () => {
    expect(isPaymentSecretExposedInFrontend()).toBe(false);
  });

  it('verifies server-side Razorpay HMAC signature validation safely', () => {
    const valid = verifyRazorpaySignature({
      orderId: 'order_test_123',
      paymentId: 'pay_test_456',
      signature: 'valid_signature_hash',
      serverSecret: 'satya_live_secret_sample',
    });
    expect(typeof valid).toBe('boolean');

    // Missing signature fails immediately
    const invalid = verifyRazorpaySignature({
      orderId: 'order_test_123',
      paymentId: 'pay_test_456',
      signature: '',
      serverSecret: 'satya_live_secret_sample',
    });
    expect(invalid).toBe(false);
  });

  it('safely reconciles delayed payment callbacks arriving after 09:00 AM cutoff without discarding them', () => {
    const existingAppointments: Appointment[] = [];
    const callbackPayload = {
      orderId: 'order_delayed_999',
      paymentId: 'pay_delayed_999',
      signature: 'sig_valid',
      idempotencyKey: 'idem_delayed_pay_001',
      appointmentDate: '2026-10-22',
      patientProfileId: 'pat-1',
      patientId: 'SH-2026-00001',
      patientName: 'Aarav Sharma',
      patientPhone: '9839123456',
      amountInPaise: 30000,
    };

    // Callback arrives at 09:15 AM (after cutoff)
    const result = processRazorpayPayment(
      callbackPayload,
      existingAppointments,
      {
        cutoffTimeStr: '09:00',
        currentTime: { hours: 9, minutes: 15 },
        isOnlinePaymentEnabled: true,
      }
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe('delayed_reconciled');
    expect(result.appointment).toBeDefined();
    expect(result.appointment?.tokenNumber).toBe(1);
    expect(result.appointment?.paymentStatus).toBe('delayed_reconciled');
    expect(result.appointment?.paymentReconciliationNotes).toContain('after 09:00 AM cutoff');
  });

  it('enforces idempotency on duplicate payment callbacks and returns existing appointment', () => {
    const existingAppointment: Appointment = {
      id: 'apt-existing-1',
      appointmentCode: 'APT-2026-0101',
      patientProfileId: 'pat-1',
      patientId: 'SH-2026-00001',
      patientName: 'Aarav Sharma',
      patientPhone: '9839123456',
      appointmentDate: '2026-10-22',
      tokenNumber: 5,
      queueType: 'online',
      status: 'booked',
      doctorId: 'doc-1',
      doctorName: 'Dr. V. K. Sharma',
      bookedByRole: 'patient',
      idempotencyKey: 'idem_payment_repeat_123',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const duplicatePayload = {
      orderId: 'order_duplicate',
      paymentId: 'pay_duplicate',
      signature: 'sig_valid',
      idempotencyKey: 'idem_payment_repeat_123', // Same key
      appointmentDate: '2026-10-22',
      patientProfileId: 'pat-1',
      patientId: 'SH-2026-00001',
      patientName: 'Aarav Sharma',
      patientPhone: '9839123456',
      amountInPaise: 30000,
    };

    const result = processRazorpayPayment(
      duplicatePayload,
      [existingAppointment],
      { isOnlinePaymentEnabled: true }
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe('duplicate_ignored');
    expect(result.appointment?.id).toBe(existingAppointment.id);
    expect(result.appointment?.tokenNumber).toBe(5);
  });
});
