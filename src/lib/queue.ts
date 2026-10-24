/**
 * Satya Hospital OPD Queue Rules (pure, framework-free)
 *
 * Shared by the local demo store (HospitalContext) and mirrored server-side in
 * supabase/migrations/20261024000003_staff_queue_desk.sql:
 * - One daily token sequence shared by online bookings and walk-ins.
 * - Tokens are monotonic: a cancelled or no-show token is never reissued.
 * - "Call Next" always takes the lowest checked-in token.
 * - Status changes follow QUEUE_TRANSITIONS (keep in sync with
 *   public.is_valid_queue_transition in SQL).
 */
import { Appointment, AppointmentStatus, FeePaymentMode } from '../types';

export const DEFAULT_CONSULTATION_FEE_INR = 500;

export const QUEUE_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['checked_in', 'no_show', 'cancelled'],
  checked_in: ['in_consultation', 'completed', 'no_show', 'cancelled'],
  in_consultation: ['completed', 'checked_in', 'no_show'],
  no_show: ['checked_in'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return from === to || QUEUE_TRANSITIONS[from].includes(to);
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  checked_in: 'Checked-in',
  in_consultation: 'In Consultation',
  completed: 'Completed',
  no_show: 'No-Show',
  cancelled: 'Cancelled',
};

export type QueueResult =
  | { ok: true; appointments: Appointment[]; appointment: Appointment }
  | { ok: false; error: string };

/**
 * Next token for a date. Takes the max of the persisted counter and any token
 * already present, so a stale counter can never cause a duplicate.
 */
export function nextTokenNumber(
  appointments: Pick<Appointment, 'appointmentDate' | 'tokenNumber'>[],
  date: string,
  lastCounter = 0
): number {
  const maxExisting = appointments
    .filter(a => a.appointmentDate === date)
    .reduce((max, a) => Math.max(max, a.tokenNumber || 0), 0);
  return Math.max(lastCounter, maxExisting) + 1;
}

export function todaysQueue(appointments: Appointment[], date: string): Appointment[] {
  return appointments
    .filter(a => a.appointmentDate === date)
    .sort((a, b) => a.tokenNumber - b.tokenNumber);
}

/** Lowest checked-in token for the date, or undefined if nobody is waiting. */
export function pickNextToCall(appointments: Appointment[], date: string): Appointment | undefined {
  return todaysQueue(appointments, date).find(a => a.status === 'checked_in');
}

function stampStatus(appt: Appointment, status: AppointmentStatus, nowIso: string, reason?: string): Appointment {
  return {
    ...appt,
    status,
    checkedInAt: status === 'checked_in' ? appt.checkedInAt || nowIso : appt.checkedInAt,
    calledAt: status === 'in_consultation' ? nowIso : appt.calledAt,
    completedAt: status === 'completed' ? nowIso : appt.completedAt,
    cancellationReason: status === 'cancelled' ? reason || 'Cancelled at reception' : appt.cancellationReason,
    updatedAt: nowIso,
  };
}

export function applyStatusChange(
  appointments: Appointment[],
  appointmentId: string,
  status: AppointmentStatus,
  options: { now?: Date; reason?: string } = {}
): QueueResult {
  const target = appointments.find(a => a.id === appointmentId);
  if (!target) return { ok: false, error: 'Appointment not found.' };
  if (!canTransition(target.status, status)) {
    return {
      ok: false,
      error: `Token #${target.tokenNumber} cannot move from ${STATUS_LABELS[target.status]} to ${STATUS_LABELS[status]}.`,
    };
  }
  const updated = stampStatus(target, status, (options.now || new Date()).toISOString(), options.reason);
  return {
    ok: true,
    appointment: updated,
    appointments: appointments.map(a => (a.id === appointmentId ? updated : a)),
  };
}

export function applyCallNext(appointments: Appointment[], date: string, now = new Date()): QueueResult {
  const next = pickNextToCall(appointments, date);
  if (!next) return { ok: false, error: 'No checked-in patients are waiting.' };
  return applyStatusChange(appointments, next.id, 'in_consultation', { now });
}

export function applyFeePayment(
  appointments: Appointment[],
  appointmentId: string,
  mode: FeePaymentMode | null,
  now = new Date()
): QueueResult {
  const target = appointments.find(a => a.id === appointmentId);
  if (!target) return { ok: false, error: 'Appointment not found.' };
  const updated: Appointment = {
    ...target,
    feePaymentMode: mode,
    paymentStatus: mode ? 'paid' : 'unpaid',
    consultationFeeAmount: target.consultationFeeAmount ?? DEFAULT_CONSULTATION_FEE_INR,
    feeCollectedAt: mode ? now.toISOString() : undefined,
    updatedAt: now.toISOString(),
  };
  return {
    ok: true,
    appointment: updated,
    appointments: appointments.map(a => (a.id === appointmentId ? updated : a)),
  };
}

export interface QueueSummary {
  total: number;
  online: number;
  walkIn: number;
  booked: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  noShow: number;
  nowServing?: Appointment;
  nextUp?: Appointment;
  fees: { paidCount: number; cash: number; upi: number; totalInr: number };
}

export function summarizeQueue(appointments: Appointment[], date: string): QueueSummary {
  const list = todaysQueue(appointments, date).filter(a => a.status !== 'cancelled');
  const count = (s: AppointmentStatus) => list.filter(a => a.status === s).length;

  // Most recently called patient still in the room.
  const inRoom = list
    .filter(a => a.status === 'in_consultation')
    .sort((a, b) => (b.calledAt || b.updatedAt).localeCompare(a.calledAt || a.updatedAt));

  const paid = list.filter(a => a.feePaymentMode);
  const feeOf = (a: Appointment) => a.consultationFeeAmount ?? DEFAULT_CONSULTATION_FEE_INR;

  return {
    total: list.length,
    online: list.filter(a => a.queueType === 'online').length,
    walkIn: list.filter(a => a.queueType === 'walk_in').length,
    booked: count('booked'),
    waiting: count('checked_in'),
    inConsultation: count('in_consultation'),
    completed: count('completed'),
    noShow: count('no_show'),
    nowServing: inRoom[0],
    nextUp: pickNextToCall(list, date),
    fees: {
      paidCount: paid.length,
      cash: paid.filter(a => a.feePaymentMode === 'cash').length,
      upi: paid.filter(a => a.feePaymentMode === 'upi').length,
      totalInr: paid.reduce((sum, a) => sum + feeOf(a), 0),
    },
  };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
