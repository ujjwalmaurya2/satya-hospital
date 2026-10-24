/**
 * Executes the real Supabase migrations in an embedded Postgres (PGlite) and
 * checks the online OPD booking + payment rules end to end at the SQL level.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser, setIstNow } from './sql/harness';

const PATIENT = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const RECEPTION = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';

const patient = { role: 'authenticated' as const, sub: PATIENT };
const other = { role: 'authenticated' as const, sub: OTHER };
const reception = { role: 'authenticated' as const, sub: RECEPTION };
const admin = { role: 'authenticated' as const, sub: ADMIN };
const server = { role: 'service_role' as const };
const anon = { role: 'anon' as const };

// 2026-10-24 is a Saturday, 2026-10-25 a Sunday (closed), 2026-10-26 a Monday.
const SAT = '2026-10-24';
const MON = '2026-10-26';

let db: PGlite;

async function eligibility(date: string) {
  const r = await as<{ e: { allowed: boolean; code: string; next_eligible_date: string } }>(db, anon, `SELECT public.opd_booking_eligibility($1::date) e`, [date]);
  return r.rows[0].e;
}

async function enablePayments(fee: number | null = 500) {
  await db.query(
    `UPDATE public.hospital_settings SET is_online_payment_enabled = $1, is_policy_approved_by_hospital = $1, consultation_fee = $2`,
    [fee !== null, fee]
  );
}

async function prepare(caller = patient, date = MON, key = 'k1', name = 'Aarav Mishra', reason = 'Fever since 2 days') {
  const r = await as<{ o: Record<string, any> }>(db, caller, `SELECT public.prepare_opd_payment($1::date, $2, '9876543210', NULL, $3, $4) o`, [date, name, reason, key]);
  return r.rows[0].o;
}

beforeAll(async () => {
  db = await createDb();
  await createUser(db, PATIENT, 'parent@example.com', 'patient', 'Priya Mishra');
  await createUser(db, OTHER, 'other@example.com', 'patient', 'Someone Else');
  await createUser(db, RECEPTION, 'desk@satya.test', 'reception', 'Desk');
  await createUser(db, ADMIN, 'admin@satya.test', 'admin', 'Admin');
}, 120_000);

describe('OPD eligibility (Asia/Kolkata, server clock)', () => {
  it('allows advance booking several days ahead', async () => {
    await setIstNow(db, '2026-10-20 15:00');
    expect((await eligibility('2026-10-24')).allowed).toBe(true);
    expect((await eligibility('2026-11-09')).allowed).toBe(true);
  });

  it('allows same-day booking before 09:00 and rejects it at and after 09:00', async () => {
    await setIstNow(db, `${SAT} 08:59:59`);
    expect((await eligibility(SAT)).allowed).toBe(true);
    await setIstNow(db, `${SAT} 09:00:00`);
    const at = await eligibility(SAT);
    expect(at.allowed).toBe(false);
    expect(at.code).toBe('cutoff_passed');
    await setIstNow(db, `${SAT} 11:30`);
    expect((await eligibility(SAT)).allowed).toBe(false);
  });

  it('moves the earliest date to the next operating day after the cutoff (skips Sunday)', async () => {
    await setIstNow(db, `${SAT} 09:00`);
    expect((await eligibility(SAT)).next_eligible_date).toBe(MON);
  });

  it('rejects closed days, holidays, past dates and dates beyond the window', async () => {
    await setIstNow(db, `${SAT} 08:00`);
    expect((await eligibility('2026-10-25')).code).toBe('opd_closed');
    expect((await eligibility('2026-10-23')).code).toBe('past_date');
    expect((await eligibility('2027-01-30')).code).toBe('beyond_window');
    await db.query(`UPDATE public.hospital_settings SET holidays = ARRAY['2026-10-27']`);
    expect((await eligibility('2026-10-27')).code).toBe('opd_closed');
    await db.query(`UPDATE public.hospital_settings SET holidays = ARRAY[]::text[]`);
  });
});

describe('Paid online booking', () => {
  it('refuses to start a payment while the fee is not configured and approved', async () => {
    await setIstNow(db, `${SAT} 08:00`);
    await enablePayments(null);
    await expect(prepare()).rejects.toThrow(/not enabled/);
  });

  it('requires sign-in and validates phone and reason on the server', async () => {
    await enablePayments(500);
    await expect(as(db, anon, `SELECT public.prepare_opd_payment('${MON}', 'A', '9876543210', NULL, 'x', 'k')`)).rejects.toThrow();
    await expect(as(db, patient, `SELECT public.prepare_opd_payment('${MON}', 'A', '12345', NULL, 'x', 'kp')`)).rejects.toThrow(/mobile/);
    await expect(as(db, patient, `SELECT public.prepare_opd_payment('${MON}', 'A', '9876543210', NULL, '  ', 'kr')`)).rejects.toThrow(/reason/);
  });

  it('takes the amount from hospital settings, never from the browser', async () => {
    const o = await prepare();
    expect(o.amount_paise).toBe(50000);
    expect(o.status).toBe('awaiting_payment');
    expect(o.booking_reference).toMatch(/^SH-261026-[0-9A-F]{6}$/);
  });

  it('returns the same pending order on a retry or second tab (no second charge)', async () => {
    const a = await prepare(patient, MON, 'k1');
    const b = await prepare(patient, MON, 'k2-other-tab');
    expect(b.id).toBe(a.id);
  });

  it('confirms exactly once and assigns a token even with duplicate callbacks', async () => {
    const o = await prepare();
    await as(db, server, `SELECT public.attach_razorpay_order($1, 'order_A')`, [o.id]);

    // Only the server role may confirm.
    await expect(as(db, patient, `SELECT public.confirm_opd_payment('order_A', 'pay_A', 50000, 'client')`)).rejects.toThrow();

    const first = await as<{ r: any }>(db, server, `SELECT public.confirm_opd_payment('order_A', 'pay_A', 50000, 'verify') r`);
    const again = await as<{ r: any }>(db, server, `SELECT public.confirm_opd_payment('order_A', 'pay_A', 50000, 'webhook') r`);
    expect(first.rows[0].r.result).toBe('confirmed');
    expect(again.rows[0].r.result).toBe('already_confirmed');
    expect(again.rows[0].r.token_number).toBe(first.rows[0].r.token_number);

    const count = await db.query<{ n: number }>(`SELECT count(*)::int n FROM public.appointments WHERE booking_reference = $1`, [o.booking_reference]);
    expect(count.rows[0].n).toBe(1);

    const appt = await db.query<any>(`SELECT payment_status, payment_provider, payment_reference, contact_phone, visit_reason, queue_type FROM public.appointments WHERE booking_reference = $1`, [o.booking_reference]);
    expect(appt.rows[0]).toMatchObject({ payment_status: 'paid', payment_provider: 'razorpay', payment_reference: 'pay_A', contact_phone: '9876543210', queue_type: 'online' });
  });

  it('patients see only their own booking status', async () => {
    const ref = (await db.query<{ r: string }>(`SELECT booking_reference r FROM public.opd_payment_orders WHERE razorpay_order_id = 'order_A'`)).rows[0].r;
    const mine = await as<{ b: any }>(db, patient, `SELECT public.get_my_opd_booking($1) b`, [ref]);
    expect(mine.rows[0].b.status).toBe('confirmed');
    expect(mine.rows[0].b.token_number).toBeGreaterThan(0);
    const theirs = await as<{ b: any }>(db, other, `SELECT public.get_my_opd_booking($1) b`, [ref]);
    expect(theirs.rows[0].b).toBeNull();
    const rows = await as(db, other, `SELECT * FROM public.opd_payment_orders`);
    expect(rows.rows).toHaveLength(0);
  });

  it('blocks a second booking for the same patient and date', async () => {
    await expect(prepare(patient, MON, 'k-dup')).rejects.toThrow(/already has an appointment/);
  });

  it('keeps a late payment for reconciliation instead of confirming or discarding it', async () => {
    await setIstNow(db, `${SAT} 08:50`);
    const o = await prepare(patient, SAT, 'late-1', 'Diya Mishra');
    await as(db, server, `SELECT public.attach_razorpay_order($1, 'order_LATE')`, [o.id]);
    await setIstNow(db, `${SAT} 09:02`);
    const r = await as<{ r: any }>(db, server, `SELECT public.confirm_opd_payment('order_LATE', 'pay_LATE', 50000, 'webhook') r`);
    expect(r.rows[0].r.result).toBe('needs_reconciliation');
    const row = await db.query<any>(`SELECT status, razorpay_payment_id, appointment_id, reconciliation_reason FROM public.opd_payment_orders WHERE id = $1`, [o.id]);
    expect(row.rows[0]).toMatchObject({ status: 'needs_reconciliation', razorpay_payment_id: 'pay_LATE', appointment_id: null });
    expect(row.rows[0].reconciliation_reason).toMatch(/after the booking closed/);
  });

  it('flags an amount mismatch for reconciliation', async () => {
    await setIstNow(db, `${SAT} 08:00`);
    const o = await prepare(patient, MON, 'amt-1', 'Kabir Mishra');
    await as(db, server, `SELECT public.attach_razorpay_order($1, 'order_AMT')`, [o.id]);
    const r = await as<{ r: any }>(db, server, `SELECT public.confirm_opd_payment('order_AMT', 'pay_AMT', 100, 'verify') r`);
    expect(r.rows[0].r.result).toBe('needs_reconciliation');
  });

  it('lets reception view exceptions but only an admin can resolve them', async () => {
    const cases = await as<{ status: string }>(db, reception, `SELECT status FROM public.opd_payment_orders WHERE status = 'needs_reconciliation'`);
    expect(cases.rows.length).toBe(2);
    const id = (await db.query<{ id: string }>(`SELECT id FROM public.opd_payment_orders WHERE razorpay_order_id = 'order_LATE'`)).rows[0].id;
    await expect(as(db, reception, `SELECT public.resolve_opd_payment_case($1, 'refunded', 'Refunded via dashboard')`, [id])).rejects.toThrow(/administrator/);
    await as(db, admin, `SELECT public.resolve_opd_payment_case($1, 'refunded', 'Refunded via dashboard')`, [id]);
    const s = await db.query<{ status: string }>(`SELECT status FROM public.opd_payment_orders WHERE id = $1`, [id]);
    expect(s.rows[0].status).toBe('refunded');
  });

  it('does not let reception overwrite an online payment at the desk', async () => {
    const id = (await db.query<{ id: string }>(`SELECT id FROM public.appointments WHERE payment_reference = 'pay_A'`)).rows[0].id;
    await expect(as(db, reception, `SELECT public.record_consultation_fee($1, NULL)`, [id])).rejects.toThrow(/paid online/);
  });

  it('webhook events are processed once', async () => {
    const a = await as<{ ok: boolean }>(db, server, `SELECT public.claim_razorpay_webhook_event('evt_1', 'payment.captured', 'order_A') ok`);
    const b = await as<{ ok: boolean }>(db, server, `SELECT public.claim_razorpay_webhook_event('evt_1', 'payment.captured', 'order_A') ok`);
    expect(a.rows[0].ok).toBe(true);
    expect(b.rows[0].ok).toBe(false);
  });
});

describe('Shared queue and direct-write protection', () => {
  it('patients can no longer insert appointments directly', async () => {
    const pp = (await db.query<{ id: string }>(`SELECT id FROM public.patient_profiles WHERE profile_id = $1 LIMIT 1`, [PATIENT])).rows[0].id;
    await expect(
      as(db, patient, `INSERT INTO public.appointments (appointment_code, patient_profile_id, appointment_date, token_number, queue_type, booked_by_role, payment_status) VALUES ('x', $1, $2, 0, 'online', 'patient', 'paid')`, [pp, MON])
    ).rejects.toThrow();
  });

  it('online (paid and pay-at-reception) and walk-in tokens share one daily sequence', async () => {
    await setIstNow(db, null);
    const today = (await db.query<{ d: string }>(`SELECT (public.hospital_now_ist())::date::text d`)).rows[0].d;
    // Make today bookable regardless of the real clock / weekday.
    await db.query(`UPDATE public.hospital_settings SET online_cutoff_time = '23:59', opd_days = ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']`);
    await enablePayments(null); // pay-at-reception mode

    const online = await as<{ r: any }>(db, other, `SELECT public.book_opd_pay_at_reception($1::date, 'Online Child', '9123456780', NULL, 'Cough', 'pr-1') r`, [today]);
    const replay = await as<{ r: any }>(db, other, `SELECT public.book_opd_pay_at_reception($1::date, 'Online Child', '9123456780', NULL, 'Cough', 'pr-1') r`, [today]);
    expect(replay.rows[0].r.token_number).toBe(online.rows[0].r.token_number);

    const walkIn = await as<{ r: any }>(db, reception, `SELECT (public.register_walk_in('Walk In Child', '9988776655', 'female')).token_number r`);
    expect(walkIn.rows[0].r).toBe(online.rows[0].r.token_number + 1);
  });

  it('the pay-at-reception path is refused once online payment is switched on', async () => {
    await enablePayments(500);
    await expect(as(db, other, `SELECT public.book_opd_pay_at_reception(CURRENT_DATE, 'X Y', '9123456780', NULL, 'Cough', 'pr-2')`)).rejects.toThrow(/required/);
  });
});
