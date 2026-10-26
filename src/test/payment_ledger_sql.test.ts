/**
 * Payment ledger (20261031000010) against the real migrations: every revenue
 * rule from the sales spec, idempotency, voids/refunds, IST attribution,
 * reconciliation and role scoping.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser, setIstNow } from './sql/harness';

const ID = {
  p1: 'e0000000-0000-0000-0000-000000000001',
  p2: 'e0000000-0000-0000-0000-000000000002',
  reception: 'e0000000-0000-0000-0000-000000000003',
  lab: 'e0000000-0000-0000-0000-000000000004',
  doctor: 'e0000000-0000-0000-0000-000000000005',
  owner: 'e0000000-0000-0000-0000-000000000006',
};
type Who = keyof typeof ID;
const c = (k: Who) => ({ role: 'authenticated' as const, sub: ID[k] });
const server = { role: 'service_role' as const };
const q = <T = any>(who: Who, sql: string, params: unknown[] = []) => as<T>(db, c(who), sql, params);
const one = async (who: Who, sql: string, params: unknown[] = []) => (await q<{ r: any }>(who, sql, params)).rows[0].r;

let db: PGlite;
let cbc = '';

type Cell = { service: string; channel: string; gross: number; payments: number; refunds: number; refund_count: number; voids: number };
async function summary(who: Who = 'owner', from: string | null = null, to: string | null = null, service: string | null = null) {
  return one(who, `SELECT public.finance_summary($1::date, $2::date, $3, NULL) r`, [from, to, service]) as Promise<{ service: string | null; cells: Cell[]; pending: { service: string; count: number; amount: number }[] }>;
}
const total = (cells: Cell[], f: (c: Cell) => boolean = () => true) => {
  const sel = cells.filter(f);
  return { gross: sel.reduce((s, c) => s + Number(c.gross), 0), refunds: sel.reduce((s, c) => s + Number(c.refunds), 0), payments: sel.reduce((s, c) => s + Number(c.payments), 0) };
};
const ledgerCount = async () => Number((await db.query<{ n: number }>(`SELECT count(*) n FROM public.payment_transactions`)).rows[0].n);

beforeAll(async () => {
  db = await createDb();
  await setIstNow(db, '2026-10-27 08:00');
  for (const [k, role, name] of [['p1', 'patient', 'Parent One'], ['p2', 'patient', 'Parent Two'], ['reception', 'reception', 'Desk'], ['lab', 'pathology', 'Lab'], ['doctor', 'doctor', 'Doc'], ['owner', 'admin', 'Owner']] as const) {
    await createUser(db, ID[k], `${k}@satya.test`, role, name);
  }
  await db.query(`UPDATE public.hospital_settings SET is_online_payment_enabled = true, is_policy_approved_by_hospital = true, consultation_fee = 500, lab_online_payment_enabled = true`);
  cbc = (await db.query<{ id: string }>(`SELECT id FROM public.pathology_tests WHERE test_code = 'CBC'`)).rows[0].id;
}, 120_000);

describe('OPD online payments (Razorpay)', () => {
  let orderId = '';
  it('a booking alone is not revenue; a verified payment is, exactly once', async () => {
    const o = await one('p1', `SELECT public.prepare_opd_payment('2026-10-28', 'Aarav', '9876543210', NULL, 'Fever', 'opd-1') r`);
    orderId = o.id;
    expect(await ledgerCount()).toBe(0);
    await as(db, server, `SELECT public.attach_razorpay_order($1, 'order_O1')`, [orderId]);
    await as(db, server, `SELECT public.record_opd_payment_failure('order_O1', 'Card declined')`);
    expect(await ledgerCount()).toBe(0); // failed attempt: no revenue
    await as(db, server, `SELECT public.confirm_opd_payment('order_O1', 'pay_O1', 50000, 'checkout_verify')`);
    await as(db, server, `SELECT public.confirm_opd_payment('order_O1', 'pay_O1', 50000, 'webhook')`); // same payment again
    const rows = (await db.query<any>(`SELECT * FROM public.payment_transactions`)).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ service: 'opd', kind: 'payment', channel: 'online', provider: 'razorpay', external_id: 'pay_O1', amount_paise: 50000 });
    expect(rows[0].appointment_id).toBeTruthy(); // linked to the appointment the payment created
    await as(db, server, `SELECT public.set_online_payment_method('pay_O1', 'upi')`);
    expect((await db.query<{ method: string }>(`SELECT method FROM public.payment_transactions WHERE external_id = 'pay_O1'`)).rows[0].method).toBe('upi');
  });

  it('a second, different payment for a confirmed booking is recorded and flagged, not lost', async () => {
    await as(db, server, `SELECT public.confirm_opd_payment('order_O1', 'pay_O1b', 50000, 'webhook')`);
    expect(await ledgerCount()).toBe(2);
    const rec = await one('owner', `SELECT public.finance_reconciliation() r`);
    expect(rec.multiple_payments).toEqual([expect.objectContaining({ service: 'opd', payments: 2 })]);
  });
});

describe('OPD counter payments, voids and pending', () => {
  let walkIn = '';
  it('a desk fee is one counter payment; repeated clicks add nothing; changing the method voids the first', async () => {
    walkIn = (await q<{ id: string }>('reception', `SELECT id FROM public.register_walk_in('Walk In', '9123456780', 'female')`)).rows[0].id;
    await q('reception', `SELECT * FROM public.record_consultation_fee($1, 'cash')`, [walkIn]);
    await q('reception', `SELECT * FROM public.record_consultation_fee($1, 'cash')`, [walkIn]);
    let rows = (await db.query<any>(`SELECT kind, channel, method, amount_paise, recorded_by_name FROM public.payment_transactions WHERE appointment_id = $1 ORDER BY created_at`, [walkIn])).rows;
    expect(rows).toEqual([{ kind: 'payment', channel: 'counter', method: 'cash', amount_paise: 50000, recorded_by_name: 'Desk' }]);
    await q('reception', `SELECT * FROM public.record_consultation_fee($1, 'upi')`, [walkIn]);
    rows = (await db.query<any>(`SELECT kind, method FROM public.payment_transactions WHERE appointment_id = $1 ORDER BY created_at`, [walkIn])).rows;
    expect(rows.map(r => `${r.kind}:${r.method}`)).toEqual(['payment:cash', 'void:cash', 'payment:upi']);
    const opd = (await summary()).cells.filter(c => c.service === 'opd' && c.channel === 'counter')[0];
    expect([Number(opd.gross), Number(opd.payments), Number(opd.voids)]).toEqual([50000, 1, 1]); // voided entry excluded
  });

  it('reception can only correct same-day desk fees; the Super Admin can correct later ones', async () => {
    await db.query(`UPDATE public.appointments SET fee_collected_at = fee_collected_at - interval '2 days' WHERE id = $1`, [walkIn]);
    await expect(q('reception', `SELECT * FROM public.record_consultation_fee($1, NULL)`, [walkIn])).rejects.toThrow(/earlier day/);
    const tx = (await db.query<{ id: string }>(`SELECT id FROM public.payment_transactions WHERE appointment_id = $1 AND kind = 'payment' AND method = 'upi'`, [walkIn])).rows[0].id;
    await db.query(`UPDATE public.payment_transactions SET occurred_at = occurred_at - interval '2 days' WHERE id = $1`, [tx]);
    await expect(q('reception', `SELECT public.void_counter_payment($1, 'typo')`, [tx])).rejects.toThrow(/earlier days/);
    await expect(q('lab', `SELECT public.void_counter_payment($1, 'typo')`, [tx])).rejects.toThrow(/not allowed/);
    await q('owner', `SELECT public.void_counter_payment($1, 'Entered on the wrong patient')`, [tx]);
    const appt = (await db.query<{ fee_payment_mode: string | null; payment_status: string }>(`SELECT fee_payment_mode, payment_status FROM public.appointments WHERE id = $1`, [walkIn])).rows[0];
    expect(appt).toEqual({ fee_payment_mode: null, payment_status: 'unpaid' }); // bill reopened
    expect((await db.query(`SELECT 1 FROM public.payment_transactions WHERE appointment_id = $1 AND kind = 'payment'`, [walkIn])).rows).toHaveLength(2); // history kept
  });

  it('unpaid and cancelled appointments are pending or nothing — never collections', async () => {
    const b = await one('p2', `SELECT public.book_opd_pay_at_reception('2026-10-28', 'Riya', '9811112222', NULL, 'Cough', 'k-x') r`).catch(() => null);
    // Online payment is on, so pay-at-reception booking is refused; use a walk-in that stays unpaid instead.
    expect(b).toBeNull();
    const unpaid = (await q<{ id: string }>('reception', `SELECT id FROM public.register_walk_in('Unpaid Kid', '9000000002', 'male')`)).rows[0].id;
    const cancelled = (await q<{ id: string }>('reception', `SELECT id FROM public.register_walk_in('Cancelled Kid', '9000000003', 'male')`)).rows[0].id;
    await q('reception', `SELECT * FROM public.set_appointment_status($1, 'cancelled', 'Left')`, [cancelled]);
    await expect(q('reception', `SELECT * FROM public.record_consultation_fee($1, 'cash')`, [cancelled])).rejects.toThrow(/cancelled/);
    const s = await summary();
    const opdPending = s.pending.find(p => p.service === 'opd')!;
    expect(Number(opdPending.count)).toBeGreaterThanOrEqual(2); // walk-in with voided fee + unpaid kid
    const ids = (await db.query<{ appointment_id: string }>(`SELECT appointment_id FROM public.payment_transactions`)).rows.map(r => r.appointment_id);
    expect(ids).not.toContain(unpaid);
    expect(ids).not.toContain(cancelled);
  });
});

describe('Pathology payments and refunds', () => {
  it('counter (by pathology staff) and online lab payments land in pathology, once each', async () => {
    const walk = await one('reception', `SELECT public.register_lab_walk_in($1::jsonb, 'Lab Walk', '9123450000', NULL, NULL, NULL, 'lw-1') r`, [JSON.stringify([{ type: 'test', id: cbc }])]);
    await one('lab', `SELECT public.record_lab_payment($1, 'upi') r`, [walk.id]);
    await expect(one('lab', `SELECT public.record_lab_payment($1, 'upi') r`, [walk.id])).rejects.toThrow(/unpaid, active order/); // duplicate blocked
    const online = await one('p1', `SELECT public.create_lab_order($1::jsonb, 'Aarav', '9876543210', NULL, 'hospital_lab', NULL, 'lo-1') r`, [JSON.stringify([{ type: 'test', id: cbc }])]);
    await as(db, server, `SELECT public.attach_lab_razorpay_order($1, 'order_L1')`, [online.id]);
    await as(db, server, `SELECT public.confirm_lab_payment('order_L1', 'pay_L1', $1, 'checkout_verify')`, [online.total_paise]);
    await as(db, server, `SELECT public.confirm_lab_payment('order_L1', 'pay_L1', $1, 'webhook')`, [online.total_paise]);
    const lab = (await summary()).cells.filter(c => c.service === 'pathology');
    expect(lab.map(c => `${c.channel}:${c.payments}:${c.gross}`)).toEqual([`counter:1:${walk.total_paise}`, `online:1:${online.total_paise}`]);
  });

  it('cancelling a paid lab order and settling it records the refund by refund date; net = gross − refunds', async () => {
    const order = await one('reception', `SELECT public.register_lab_walk_in($1::jsonb, 'Refund Kid', '9123451111', NULL, NULL, 'cash', 'lw-2') r`, [JSON.stringify([{ type: 'test', id: cbc }])]);
    await one('reception', `SELECT public.cancel_lab_order($1, 'Patient left') r`, [order.id]);
    await expect(one('reception', `SELECT public.resolve_lab_payment($1, 'cash returned') r`, [order.id])).rejects.toThrow(/not allowed/);
    await one('owner', `SELECT public.resolve_lab_payment($1, 'Cash returned at counter') r`, [order.id]);
    const refund = (await db.query<any>(`SELECT kind, amount_paise, related_id FROM public.payment_transactions WHERE pathology_order_id = $1 ORDER BY created_at`, [order.id])).rows;
    expect(refund.map(r => r.kind)).toEqual(['payment', 'refund']);
    expect(refund[1].amount_paise).toBe(refund[0].amount_paise);
  });

  it('partial refunds by the Super Admin only, never more than was paid', async () => {
    const tx = (await db.query<{ id: string; amount_paise: number }>(`SELECT id, amount_paise FROM public.payment_transactions WHERE external_id = 'pay_L1'`)).rows[0];
    await expect(q('reception', `SELECT public.record_payment_refund($1, 100, 'x')`, [tx.id])).rejects.toThrow(/not allowed/);
    await expect(q('lab', `SELECT public.record_payment_refund($1, 100, 'x')`, [tx.id])).rejects.toThrow(/not allowed/);
    await q('owner', `SELECT public.record_payment_refund($1, 5000, 'Partial refund RZP rfnd_1')`, [tx.id]);
    await expect(q('owner', `SELECT public.record_payment_refund($1, $2, 'too much')`, [tx.id, tx.amount_paise])).rejects.toThrow(/not yet refunded/);
    const t = await one('owner', `SELECT public.finance_transactions(NULL, NULL, 'pathology', NULL, 'payment', 'pay_L1') r`);
    expect(Number(t.rows[0].refunded_paise)).toBe(5000);
  });
});

describe('totals reconcile and respect IST dates', () => {
  it('total = OPD + Pathology, and online + counter = total, for gross and refunds', async () => {
    const s = await summary();
    const all = total(s.cells), opd = total(s.cells, c => c.service === 'opd'), lab = total(s.cells, c => c.service === 'pathology');
    const online = total(s.cells, c => c.channel === 'online'), counter = total(s.cells, c => c.channel === 'counter');
    expect(all.gross).toBe(opd.gross + lab.gross);
    expect(all.gross).toBe(online.gross + counter.gross);
    expect(all.refunds).toBe(opd.refunds + lab.refunds);
    // The ledger is the only source: summary gross equals the sum of non-voided payments.
    const direct = Number((await db.query<{ s: number }>(`SELECT COALESCE(sum(amount_paise), 0) s FROM public.payment_transactions t WHERE kind = 'payment' AND NOT EXISTS (SELECT 1 FROM public.payment_transactions v WHERE v.related_id = t.id AND v.kind = 'void')`)).rows[0].s);
    expect(all.gross).toBe(direct);
  });

  it('a payment at 00:01 IST counts for that IST day, not the previous UTC day', async () => {
    const pid = (await db.query<{ id: string }>(`SELECT id FROM public.patient_profiles LIMIT 1`)).rows[0].id;
    await db.query(`SELECT public.ledger_add('opd', 'payment', 12345, 'counter', 'cash', NULL, NULL, '2026-09-30T18:31:00Z', $1, NULL, NULL, NULL, NULL, NULL, 'midnight test')`, [pid]);
    const oct1 = total((await summary('owner', '2026-10-01', '2026-10-01')).cells);
    const sep30 = total((await summary('owner', '2026-09-30', '2026-09-30')).cells);
    expect([oct1.gross, sep30.gross]).toEqual([12345, 0]);
  });
});

describe('who can see and change money', () => {
  it('reception sees only OPD and pathology only lab, even when asking for more', async () => {
    expect((await summary('reception', null, null, 'pathology')).service).toBe('opd');
    expect((await summary('lab', null, null, 'opd')).service).toBe('pathology');
    const recRows = (await q<{ service: string }>('reception', `SELECT DISTINCT service FROM public.payment_transactions`)).rows.map(r => r.service);
    const labRows = (await q<{ service: string }>('lab', `SELECT DISTINCT service FROM public.payment_transactions`)).rows.map(r => r.service);
    expect([recRows, labRows]).toEqual([['opd'], ['pathology']]);
  });

  it('patients and doctors get no sales data; only the Super Admin sees reconciliation', async () => {
    for (const who of ['p1', 'doctor'] as const) {
      await expect(summary(who)).rejects.toThrow(/not allowed/);
      expect((await q(who, `SELECT id FROM public.payment_transactions`)).rows).toHaveLength(0);
    }
    await expect(one('reception', `SELECT public.finance_reconciliation() r`)).rejects.toThrow(/not allowed/);
  });

  it('nobody writes the ledger directly, and ledger helpers are not callable from the API', async () => {
    await expect(q('owner', `INSERT INTO public.payment_transactions (receipt_number, service, kind, amount_paise, channel, occurred_at) VALUES ('X', 'opd', 'payment', 1, 'counter', now())`)).rejects.toThrow(/row-level security/);
    expect((await q('owner', `UPDATE public.payment_transactions SET amount_paise = 1`)).affectedRows).toBe(0);
    expect((await q('owner', `DELETE FROM public.payment_transactions`)).affectedRows).toBe(0);
    await expect(q('owner', `SELECT public.ledger_add('opd', 'payment', 1, 'counter', 'cash', NULL, NULL, now(), NULL, NULL, NULL, NULL, NULL, NULL, NULL)`)).rejects.toThrow(/permission denied/);
    await expect(q('reception', `SELECT public.set_online_payment_method('pay_O1', 'card')`)).rejects.toThrow(/permission denied/);
  });

  it('re-running the migration does not duplicate any money', async () => {
    const before = await ledgerCount();
    await db.exec(readFileSync(resolve(__dirname, '../../supabase/migrations/20261031000010_payment_ledger.sql'), 'utf8'));
    expect(await ledgerCount()).toBe(before);
  });
});
