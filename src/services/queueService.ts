/**
 * Live OPD queue backed by Supabase RPCs (see
 * supabase/migrations/20261024000003_staff_queue_desk.sql). Token numbers are
 * assigned by the database trigger, never by the browser.
 */
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentStatus, FeePaymentMode } from '../types';

export interface ConsultationNotes {
  complaint: string;
  notes: string;
  diagnosis?: string;
}

export interface VisitSummary {
  id: string;
  visitDate: string;
  doctorName: string;
  diagnosis?: string;
  clinicalNotes: string;
}

export interface WalkInInput {
  fullName: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  dob?: string;
  notes?: string;
  idempotencyKey?: string;
}

const QUEUE_SELECT =
  '*, patient:patient_profiles(patient_id, full_name, phone), doctor:doctor_profiles(full_name)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAppointmentRow(row: any): Appointment {
  return {
    id: row.id,
    appointmentCode: row.appointment_code,
    patientProfileId: row.patient_profile_id,
    patientId: row.patient?.patient_id ?? '',
    patientName: row.patient?.full_name ?? 'Patient',
    patientPhone: row.contact_phone ?? row.patient?.phone ?? '',
    appointmentDate: row.appointment_date,
    tokenNumber: row.token_number,
    queueType: row.queue_type,
    status: row.status,
    doctorId: row.doctor_id ?? undefined,
    doctorName: row.doctor?.full_name ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    bookedByRole: row.booked_by_role,
    notes: row.notes ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    paymentStatus: row.payment_status,
    paymentReconciliationNotes: row.payment_reconciliation_notes ?? undefined,
    consultationFeeAmount: row.consultation_fee_amount != null ? Number(row.consultation_fee_amount) : undefined,
    feePaymentMode: row.fee_payment_mode ?? null,
    feeCollectedAt: row.fee_collected_at ?? undefined,
    checkedInAt: row.checked_in_at ?? undefined,
    calledAt: row.called_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    bookingReference: row.booking_reference ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    visitReason: row.visit_reason ?? undefined,
    paymentProvider: row.payment_provider ?? null,
    paymentReference: row.payment_reference ?? null,
    amountPaid: row.amount_paid != null ? Number(row.amount_paid) : null,
    paidAt: row.paid_at ?? undefined,
    receptionNotes: row.reception_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message || 'Queue request failed.');
}

export const queueService = {
  async listForDate(date: string): Promise<Appointment[]> {
    const { data, error } = await client()
      .from('appointments')
      .select(QUEUE_SELECT)
      .eq('appointment_date', date)
      .order('token_number', { ascending: true });
    if (error) fail(error);
    return (data || []).map(mapAppointmentRow);
  },

  /** Returns the new appointment's id; callers refetch to get joined fields. */
  async registerWalkIn(input: WalkInInput): Promise<{ id: string; tokenNumber: number }> {
    const { data, error } = await client().rpc('register_walk_in', {
      p_full_name: input.fullName,
      p_phone: input.phone,
      p_gender: input.gender,
      p_dob: input.dob || null,
      p_notes: input.notes || null,
      p_doctor_id: null,
      p_idempotency_key: input.idempotencyKey || null,
    });
    if (error) fail(error);
    return { id: data.id, tokenNumber: data.token_number };
  },

  /** Returns the called token number, or null when nobody is checked in. */
  async callNext(): Promise<number | null> {
    const { data, error } = await client().rpc('call_next_token');
    if (error) fail(error);
    return Array.isArray(data) && data.length > 0 ? data[0].token_number : null;
  },

  async setStatus(appointmentId: string, status: AppointmentStatus, reason?: string): Promise<void> {
    const { error } = await client().rpc('set_appointment_status', {
      p_appointment_id: appointmentId,
      p_status: status,
      p_reason: reason || null,
    });
    if (error) fail(error);
  },

  async setFee(appointmentId: string, mode: FeePaymentMode | null): Promise<void> {
    const { error } = await client().rpc('record_consultation_fee', {
      p_appointment_id: appointmentId,
      p_mode: mode,
    });
    if (error) fail(error);
  },

  /** Doctor/Super Admin: save visit notes and complete the appointment in one transaction. */
  async completeConsultation(appointmentId: string, n: ConsultationNotes): Promise<void> {
    const { error } = await client().rpc('complete_opd_consultation', {
      p_appointment_id: appointmentId,
      p_chief_complaint: n.complaint,
      p_clinical_notes: n.notes,
      p_diagnosis: n.diagnosis || null,
    });
    if (error) fail(error);
  },

  async visitsFor(patientProfileId: string): Promise<VisitSummary[]> {
    const { data, error } = await client()
      .from('patient_visits')
      .select('id, visit_date, clinical_notes, diagnosis, doctor_signature')
      .eq('patient_profile_id', patientProfileId)
      .order('visit_date', { ascending: false })
      .limit(10);
    if (error) fail(error);
    return (data || []).map(v => ({ id: v.id, visitDate: v.visit_date, doctorName: v.doctor_signature ?? 'Doctor', diagnosis: v.diagnosis ?? undefined, clinicalNotes: v.clinical_notes }));
  },

  /** Calls onChange whenever any appointment for the date changes. */
  subscribe(date: string, onChange: () => void): () => void {
    const sb = client();
    const channel = sb
      .channel(`opd-queue-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `appointment_date=eq.${date}` },
        () => onChange()
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  },
};
