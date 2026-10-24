import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyCallNext,
  applyFeePayment,
  applyStatusChange,
  canTransition,
  nextTokenNumber,
  pickNextToCall,
  QUEUE_TRANSITIONS,
  summarizeQueue,
} from '../lib/queue';
import { homePathForRole, resolveAccess, ROUTE_ROLES } from '../lib/access';
import { checkOnlineBookingCutoff } from '../lib/tokens';
import { mapAppointmentRow } from '../services/queueService';
import { Appointment, AppointmentStatus, QueueType } from '../types';

const DAY = '2026-10-24'; // Saturday (OPD day)

let seq = 0;
function appt(token: number, status: AppointmentStatus, queueType: QueueType = 'online', date = DAY): Appointment {
  seq += 1;
  return {
    id: `apt-${seq}`,
    appointmentCode: `APT-${token}`,
    patientProfileId: `pat-${seq}`,
    patientId: `SH-2026-${String(seq).padStart(5, '0')}`,
    patientName: `Patient ${token}`,
    patientPhone: '9876543210',
    appointmentDate: date,
    tokenNumber: token,
    queueType,
    status,
    bookedByRole: queueType === 'online' ? 'patient' : 'reception',
    createdAt: '2026-10-24T03:00:00.000Z',
    updatedAt: '2026-10-24T03:00:00.000Z',
  };
}

describe('Queue desk - shared atomic token sequence', () => {
  it('online bookings and walk-ins draw from one sequence for the day', () => {
    const list = [appt(1, 'booked', 'online'), appt(2, 'checked_in', 'walk_in'), appt(3, 'booked', 'online')];
    expect(nextTokenNumber(list, DAY)).toBe(4);
  });

  it('never reissues a cancelled or no-show token number', () => {
    const list = [appt(1, 'cancelled'), appt(2, 'no_show')];
    expect(nextTokenNumber(list, DAY)).toBe(3);
  });

  it('a persisted counter ahead of stored rows wins, so deleted rows cannot cause duplicates', () => {
    expect(nextTokenNumber([appt(2, 'booked')], DAY, 7)).toBe(8);
  });

  it('a stale counter behind stored rows is ignored', () => {
    expect(nextTokenNumber([appt(9, 'booked')], DAY, 3)).toBe(10);
  });

  it('sequences are per OPD date and start at 1', () => {
    const list = [appt(5, 'booked', 'online', '2026-10-23')];
    expect(nextTokenNumber(list, DAY)).toBe(1);
  });

  it('back-to-back issuing yields unique consecutive tokens', () => {
    const list: Appointment[] = [];
    for (let i = 0; i < 25; i++) {
      list.push(appt(nextTokenNumber(list, DAY), 'checked_in', i % 2 ? 'walk_in' : 'online'));
    }
    const tokens = list.map(a => a.tokenNumber);
    expect(new Set(tokens).size).toBe(25);
    expect(tokens).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
});

describe('Queue desk - status transitions', () => {
  it('allows the reception workflow booked -> checked-in -> in consultation -> completed', () => {
    let list = [appt(1, 'booked')];
    const id = list[0].id;
    for (const next of ['checked_in', 'in_consultation', 'completed'] as AppointmentStatus[]) {
      const res = applyStatusChange(list, id, next);
      expect(res.ok).toBe(true);
      if (res.ok) list = res.appointments;
    }
    expect(list[0].status).toBe('completed');
    expect(list[0].checkedInAt).toBeDefined();
    expect(list[0].calledAt).toBeDefined();
    expect(list[0].completedAt).toBeDefined();
  });

  it('rejects skipping check-in and reopening completed tokens', () => {
    expect(canTransition('booked', 'in_consultation')).toBe(false);
    expect(canTransition('booked', 'completed')).toBe(false);
    expect(canTransition('completed', 'checked_in')).toBe(false);
    const res = applyStatusChange([appt(4, 'completed')], 'apt-missing', 'checked_in');
    expect(res.ok).toBe(false);
  });

  it('returns a readable error for an invalid move and leaves the list untouched', () => {
    const list = [appt(6, 'booked')];
    const res = applyStatusChange(list, list[0].id, 'completed');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Token #6 cannot move from Booked to Completed.');
    expect(list[0].status).toBe('booked');
  });

  it('a no-show can be re-checked-in when the family arrives late', () => {
    const list = [appt(3, 'no_show')];
    const res = applyStatusChange(list, list[0].id, 'checked_in');
    expect(res.ok).toBe(true);
  });

  it('mark no-show works from booked, checked-in and in-consultation', () => {
    for (const from of ['booked', 'checked_in', 'in_consultation'] as AppointmentStatus[]) {
      expect(canTransition(from, 'no_show')).toBe(true);
    }
  });

  it('matches the SQL transition function in the migration', () => {
    const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261024000003_staff_queue_desk.sql'), 'utf8');
    for (const [from, targets] of Object.entries(QUEUE_TRANSITIONS)) {
      if (targets.length === 0) continue;
      const line = sql.split('\n').find(l => l.includes(`WHEN '${from}'`));
      expect(line, `SQL case for ${from}`).toBeDefined();
      const sqlTargets = [...line!.matchAll(/'([a-z_]+)'/g)].map(m => m[1]).slice(1).sort();
      expect(sqlTargets).toEqual([...targets].sort());
    }
  });
});

describe('Queue desk - Call Next Token', () => {
  it('calls the lowest checked-in token, skipping booked patients who have not arrived', () => {
    const list = [appt(1, 'completed'), appt(2, 'booked'), appt(4, 'checked_in'), appt(3, 'checked_in')];
    expect(pickNextToCall(list, DAY)?.tokenNumber).toBe(3);

    const res = applyCallNext(list, DAY);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appointment.tokenNumber).toBe(3);
      expect(res.appointment.status).toBe('in_consultation');
      expect(pickNextToCall(res.appointments, DAY)?.tokenNumber).toBe(4);
    }
  });

  it('ignores other dates and reports when nobody is waiting', () => {
    const list = [appt(1, 'checked_in', 'online', '2026-10-23'), appt(1, 'booked')];
    const res = applyCallNext(list, DAY);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/No checked-in patients/);
  });
});

describe('Queue desk - consultation fee and summary', () => {
  it('records Cash / UPI and can be toggled back to unpaid', () => {
    const list = [appt(1, 'checked_in')];
    const paid = applyFeePayment(list, list[0].id, 'upi');
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.appointment.feePaymentMode).toBe('upi');
    expect(paid.appointment.paymentStatus).toBe('paid');
    expect(paid.appointment.consultationFeeAmount).toBe(500);

    const unpaid = applyFeePayment(paid.appointments, list[0].id, null);
    expect(unpaid.ok && unpaid.appointment.paymentStatus).toBe('unpaid');
    expect(unpaid.ok && unpaid.appointment.feePaymentMode).toBeNull();
  });

  it('summarises counts, now serving, next up and ₹500 fee totals', () => {
    const list = [
      { ...appt(1, 'completed'), feePaymentMode: 'cash' as const },
      { ...appt(2, 'in_consultation', 'walk_in'), feePaymentMode: 'upi' as const, calledAt: '2026-10-24T04:10:00.000Z' },
      appt(3, 'checked_in', 'walk_in'),
      appt(4, 'booked'),
      appt(5, 'no_show'),
      appt(6, 'cancelled'),
    ];
    const s = summarizeQueue(list, DAY);
    expect(s.total).toBe(5); // cancelled excluded
    expect(s.online).toBe(3);
    expect(s.walkIn).toBe(2);
    expect(s.waiting).toBe(1);
    expect(s.booked).toBe(1);
    expect(s.completed).toBe(1);
    expect(s.noShow).toBe(1);
    expect(s.nowServing?.tokenNumber).toBe(2);
    expect(s.nextUp?.tokenNumber).toBe(3);
    expect(s.fees).toEqual({ paidCount: 2, cash: 1, upi: 1, totalInr: 1000 });
  });
});

describe('Queue desk - IST booking window', () => {
  const opts = (hours: number, minutes: number) => ({ currentTime: { hours, minutes }, baseDate: DAY });

  it('online booking for today is open at 08:59 IST and closed from 09:00 IST', () => {
    expect(checkOnlineBookingCutoff(DAY, opts(8, 59)).allowed).toBe(true);
    expect(checkOnlineBookingCutoff(DAY, opts(9, 0)).allowed).toBe(false);
  });

  it('the server trigger enforces the same cutoff and assigns tokens itself', () => {
    const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261024000003_staff_queue_desk.sql'), 'utf8');
    expect(sql).toMatch(/NEW\.token_number := public\.allocate_daily_opd_token\(NEW\.appointment_date\)/);
    expect(sql).toMatch(/v_now_ist::TIME >= v_cutoff/);
    expect(sql).toMatch(/AT TIME ZONE 'Asia\/Kolkata'/);
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.allocate_daily_opd_token/);
  });
});

describe('Staff route guard', () => {
  const auth = (role: Appointment['bookedByRole'], isAuthenticated = true, isLoading = false) => ({ role, isAuthenticated, isLoading });

  it('lets reception and admin into /staff, and only admin into /admin', () => {
    expect(resolveAccess(auth('reception'), ROUTE_ROLES.staffDesk)).toBe('allow');
    expect(resolveAccess(auth('admin'), ROUTE_ROLES.staffDesk)).toBe('allow');
    expect(resolveAccess(auth('reception'), ROUTE_ROLES.admin)).toBe('forbidden');
    expect(resolveAccess(auth('admin'), ROUTE_ROLES.admin)).toBe('allow');
  });

  it('blocks patients and other staff from the queue desk', () => {
    expect(resolveAccess(auth('patient'), ROUTE_ROLES.staffDesk)).toBe('forbidden');
    expect(resolveAccess(auth('doctor'), ROUTE_ROLES.staffDesk)).toBe('forbidden');
    expect(resolveAccess(auth('pathology'), ROUTE_ROLES.staffDesk)).toBe('forbidden');
  });

  it('waits for the session to load, then sends anonymous users to login', () => {
    expect(resolveAccess(auth('patient', false, true), ROUTE_ROLES.staffDesk)).toBe('loading');
    expect(resolveAccess(auth('patient', false), ROUTE_ROLES.staffDesk)).toBe('login');
  });

  it('sends reception staff to the queue desk after sign-in', () => {
    expect(homePathForRole('reception')).toBe('/staff');
    expect(homePathForRole('admin')).toBe('/admin');
  });
});

describe('Supabase row mapping', () => {
  it('maps joined appointment rows including fee fields', () => {
    const a = mapAppointmentRow({
      id: 'u1',
      appointment_code: 'APT-20261024-007',
      patient_profile_id: 'p1',
      appointment_date: DAY,
      token_number: 7,
      queue_type: 'walk_in',
      status: 'checked_in',
      booked_by_role: 'reception',
      payment_status: 'paid',
      consultation_fee_amount: '500.00',
      fee_payment_mode: 'cash',
      created_at: 'x',
      updated_at: 'y',
      patient: { patient_id: 'SH-2026-00009', full_name: 'Aarav Mishra', phone: '9876500000' },
      doctor: null,
    });
    expect(a.tokenNumber).toBe(7);
    expect(a.patientName).toBe('Aarav Mishra');
    expect(a.consultationFeeAmount).toBe(500);
    expect(a.feePaymentMode).toBe('cash');
    expect(a.doctorName).toBeUndefined();
  });
});
