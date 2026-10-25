/**
 * Pathology test booking against the real migrations (PGlite): pricing from the
 * database, duplicate rules, idempotency, payment confirmation, the sample and
 * report workflow, and who can see or do what.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser, setIstNow } from './sql/harness';

const ID = {
  patient: 'b0000000-0000-0000-0000-000000000001',
  other: 'b0000000-0000-0000-0000-000000000002',
  reception: 'b0000000-0000-0000-0000-000000000003',
  lab1: 'b0000000-0000-0000-0000-000000000004',
  lab2: 'b0000000-0000-0000-0000-000000000005',
  doctor: 'b0000000-0000-0000-0000-000000000006',
  owner: 'b0000000-0000-0000-0000-000000000007',
};
type Who = keyof typeof ID;
const c = (k: Who) => ({ role: 'authenticated' as const, sub: ID[k] });
const server = { role: 'service_role' as const };

let db: PGlite;
let T: Record<string, string> = {}; // test_code -> id
let PKG = '';

type Order = { id: string; order_number: string; status: string; payment_status: string; lab_status: string; total_paise: number; subtotal_paise: number; items: { name: string; price_paise: number; item_type: string; test_ids: string[] }[] };

async function order(who: Who, items: unknown[], key: string, name = 'Aarav Mishra') {
  const r = await as<{ o: Order }>(db, c(who), `SELECT public.create_lab_order($1::jsonb, $2, '9876543210', NULL, 'hospital_lab', NULL, $3) o`, [JSON.stringify(items), name, key]);
  return r.rows[0].o;
}
const rpc = (who: Who | 'server', sql: string, params: unknown[] = []) => as<{ r: any }>(db, who === 'server' ? server : c(who), sql, params);
const count = async (sql: string, params: unknown[] = []) => Number((await db.query<{ n: number }>(sql, params)).rows[0].n);

beforeAll(async () => {
  db = await createDb();
  await setIstNow(db, '2026-10-27 10:00');
  await createUser(db, ID.patient, 'parent@example.com', 'patient', 'Parent');
  await createUser(db, ID.other, 'other@example.com', 'patient', 'Other');
  await createUser(db, ID.reception, 'desk@satya.test', 'reception', 'Desk');
  await createUser(db, ID.lab1, 'lab1@satya.test', 'pathology', 'Lab One');
  await createUser(db, ID.lab2, 'lab2@satya.test', 'pathology', 'Lab Two');
  await createUser(db, ID.doctor, 'doc@satya.test', 'doctor', 'Doc');
  await createUser(db, ID.owner, 'owner@satya.test', 'admin', 'Owner');
  for (const row of (await db.query<{ id: string; test_code: string }>(`SELECT id, test_code FROM public.pathology_tests`)).rows) T[row.test_code] = row.id;
  PKG = (await db.query<{ id: string }>(`SELECT id FROM public.pathology_packages WHERE package_code = 'DEMO-BASIC'`)).rows[0].id;
}, 120_000);

describe('catalogue', () => {
  it('flags seeded tests and the seeded package as demo data', async () => {
    expect(await count(`SELECT count(*) n FROM public.pathology_tests WHERE NOT is_demo`)).toBe(0);
    expect(await count(`SELECT count(*) n FROM public.pathology_packages WHERE is_demo`)).toBe(1);
  });

  it('only pathology staff and the Super Admin can change prices', async () => {
    for (const who of ['patient', 'reception', 'doctor'] as const) {
      expect((await rpc(who, `UPDATE public.pathology_tests SET price = 1 WHERE id = $1`, [T.TSH])).affectedRows).toBe(0);
    }
    expect((await rpc('lab1', `UPDATE public.pathology_tests SET price = 360 WHERE id = $1`, [T.TSH])).affectedRows).toBe(1);
  });
});

describe('placing an order', () => {
  it('prices from the database, skips a test already in a package, and creates no OPD appointment', async () => {
    const appts = await count(`SELECT count(*) n FROM public.appointments`);
    const o = await order('patient', [{ type: 'package', id: PKG }, { type: 'test', id: T.CBC }, { type: 'test', id: T.TSH }, { type: 'test', id: T.TSH }], 'k1');
    expect(o.status).toBe('pending');
    expect(o.payment_status).toBe('unpaid');
    expect(o.order_number).toMatch(/^LAB-261027-[0-9A-F]{6}$/);
    expect(o.items.map(i => i.name).sort()).toEqual(['Basic Health Check (Demo)', 'Thyroid Stimulating Hormone (TSH, Ultrasensitive)']);
    expect(o.total_paise).toBe(50000 + 36000);
    expect(o.subtotal_paise).toBe(o.total_paise);
    expect(await count(`SELECT count(*) n FROM public.appointments`)).toBe(appts);
  });

  it('an OPD booking creates an appointment but no lab order', async () => {
    const before = await count(`SELECT count(*) n FROM public.pathology_orders`);
    const r = await rpc('other', `SELECT public.book_opd_pay_at_reception('2026-10-28', 'Riya', '9876501234', NULL, 'Fever', 'opd-1') r`);
    expect(r.rows[0].r.token_number).toBeGreaterThan(0);
    expect(await count(`SELECT count(*) n FROM public.pathology_orders`)).toBe(before);
  });

  it('returns the same order for a repeated submission', async () => {
    const again = await order('patient', [{ type: 'test', id: T.LFT }], 'k1');
    expect(again.items).toHaveLength(2); // original order, not the new cart
    expect(await count(`SELECT count(*) n FROM public.pathology_orders WHERE created_by = $1 AND idempotency_key = 'k1'`, [ID.patient])).toBe(1);
  });

  it('keeps historical prices when the catalogue changes', async () => {
    const o = await order('patient', [{ type: 'test', id: T.KFT }], 'k-price');
    await db.query(`UPDATE public.pathology_tests SET price = 999 WHERE id = $1`, [T.KFT]);
    const item = (await db.query<{ price_paise: number }>(`SELECT price_paise FROM public.pathology_order_items WHERE order_id = $1`, [o.id])).rows[0];
    const total = (await db.query<{ total_paise: number }>(`SELECT total_paise FROM public.pathology_orders WHERE id = $1`, [o.id])).rows[0];
    expect(item.price_paise).toBe(65000);
    expect(total.total_paise).toBe(65000);
  });

  it('rejects duplicates when the hospital chooses the reject rule, and unavailable tests always', async () => {
    await db.query(`UPDATE public.hospital_settings SET lab_duplicate_test_rule = 'reject'`);
    await expect(order('patient', [{ type: 'package', id: PKG }, { type: 'test', id: T.CBC }], 'k-dup')).rejects.toThrow(/already included in Basic Health Check/);
    await db.query(`UPDATE public.hospital_settings SET lab_duplicate_test_rule = 'skip_individual'`);
    await db.query(`UPDATE public.pathology_tests SET is_active = false WHERE id = $1`, [T.HBA1C]);
    await expect(order('patient', [{ type: 'test', id: T.HBA1C }], 'k-off')).rejects.toThrow(/no longer available/);
    await expect(order('patient', [], 'k-empty')).rejects.toThrow(/at least one test/);
  });

  it('only patients book online, and home collection stays off until enabled', async () => {
    await expect(order('reception', [{ type: 'test', id: T.TSH }], 'k-staff')).rejects.toThrow(/reception desk/);
    await expect(
      rpc('patient', `SELECT public.create_lab_order($1::jsonb, 'A', '9876543210', NULL, 'home', NULL, 'k-home')`, [JSON.stringify([{ type: 'test', id: T.TSH }])])
    ).rejects.toThrow(/Home sample collection is not available/);
  });
});

describe('privacy between patients and roles', () => {
  it('patients see only their own orders, items and cannot act on others', async () => {
    const mine = await order('patient', [{ type: 'test', id: T.TSH }], 'k-priv');
    expect((await rpc('other', `SELECT id FROM public.pathology_orders`)).rows).toHaveLength(0);
    expect((await rpc('other', `SELECT id FROM public.pathology_order_items`)).rows).toHaveLength(0);
    await expect(rpc('other', `SELECT public.cancel_lab_order($1, 'x')`, [mine.id])).rejects.toThrow(/not found/);
    for (const sql of [
      `SELECT public.confirm_lab_order($1) r`,
      `SELECT public.record_lab_payment($1, 'cash') r`,
      `SELECT public.record_lab_sample($1, 'Blood') r`,
    ]) {
      await expect(rpc('patient', sql, [mine.id])).rejects.toThrow(/not allowed/);
    }
    await expect(rpc('patient', `SELECT public.confirm_lab_payment('x', 'y', 1, 'z') r`)).rejects.toThrow(/permission denied/);
    expect((await rpc('patient', `SELECT id FROM public.pathology_samples`)).rows).toHaveLength(0);
  });

  it('doctors have no access to lab orders', async () => {
    expect((await rpc('doctor', `SELECT id FROM public.pathology_orders`)).rows).toHaveLength(0);
  });
});

describe('online payment confirmation (server only)', () => {
  it('confirms once, ignores the duplicate callback, and flags a second payment', async () => {
    const o = await order('patient', [{ type: 'test', id: T.TSH }], 'k-pay');
    await rpc('server', `SELECT public.attach_lab_razorpay_order($1, 'order_RZP1')`, [o.id]);
    expect((await rpc('server', `SELECT public.confirm_lab_payment('order_RZP1', 'pay_1', $1, 'checkout_verify') r`, [o.total_paise])).rows[0].r.result).toBe('confirmed');
    expect((await rpc('server', `SELECT public.confirm_lab_payment('order_RZP1', 'pay_1', $1, 'webhook') r`, [o.total_paise])).rows[0].r.result).toBe('already_confirmed');
    const row = (await db.query<Order>(`SELECT * FROM public.pathology_orders WHERE id = $1`, [o.id])).rows[0];
    expect([row.status, row.payment_status]).toEqual(['confirmed', 'paid']);
    expect((await rpc('server', `SELECT public.confirm_lab_payment('order_RZP1', 'pay_2', $1, 'webhook') r`, [o.total_paise])).rows[0].r.result).toBe('needs_reconciliation');
    await expect(rpc('patient', `SELECT public.cancel_lab_order($1, 'x')`, [o.id])).rejects.toThrow(/Paid orders/);
  });

  it('never marks a wrong amount as paid', async () => {
    const o = await order('patient', [{ type: 'test', id: T.CBC }], 'k-amount');
    await rpc('server', `SELECT public.attach_lab_razorpay_order($1, 'order_RZP2')`, [o.id]);
    expect((await rpc('server', `SELECT public.confirm_lab_payment('order_RZP2', 'pay_3', 100, 'webhook') r`)).rows[0].r.result).toBe('needs_reconciliation');
    const row = (await db.query<Order>(`SELECT * FROM public.pathology_orders WHERE id = $1`, [o.id])).rows[0];
    expect([row.status, row.payment_status]).toEqual(['pending', 'needs_reconciliation']);
  });

  it('lets a patient cancel an unpaid order before collection', async () => {
    const o = await order('patient', [{ type: 'test', id: T.CBC }], 'k-cancel');
    expect((await rpc('patient', `SELECT public.cancel_lab_order($1, 'Changed plans') r`, [o.id])).rows[0].r.status).toBe('cancelled');
  });
});

describe('reception and pathology workflow', () => {
  let orderId = '';
  let reportId = '';

  it('reception registers a paid walk-in and collects the sample; pathology cannot take payments', async () => {
    const r = await rpc('reception', `SELECT public.register_lab_walk_in($1::jsonb, 'Walk In Child', '9123456780', 'female', NULL, 'cash', 'w1') r`, [
      JSON.stringify([{ type: 'test', id: T.TSH }, { type: 'test', id: T.CBC }]),
    ]);
    const o = r.rows[0].r as Order;
    orderId = o.id;
    expect([o.status, o.payment_status]).toEqual(['confirmed', 'paid']);
    await expect(rpc('lab1', `SELECT public.record_lab_payment($1, 'cash') r`, [orderId])).rejects.toThrow(/not allowed/);
    await expect(rpc('lab1', `SELECT public.register_lab_walk_in('[]'::jsonb, 'X', '9123456780', NULL, NULL, NULL, 'w2') r`)).rejects.toThrow(/not allowed/);
    await rpc('reception', `SELECT public.record_lab_sample($1, 'Blood (EDTA)') r`, [orderId]);
    expect((await db.query<Order>(`SELECT lab_status FROM public.pathology_orders WHERE id = $1`, [orderId])).rows[0].lab_status).toBe('sample_collected');
  });

  it('only pathology receives samples and uploads reports, and only for tests in the order', async () => {
    const sample = (await db.query<{ id: string }>(`SELECT id FROM public.pathology_samples WHERE order_id = $1`, [orderId])).rows[0].id;
    await expect(rpc('reception', `SELECT public.update_lab_sample($1, 'received') r`, [sample])).rejects.toThrow(/not allowed/);
    await rpc('lab1', `SELECT public.update_lab_sample($1, 'received') r`, [sample]);
    expect((await db.query<Order>(`SELECT lab_status FROM public.pathology_orders WHERE id = $1`, [orderId])).rows[0].lab_status).toBe('processing');

    const upload = (who: Who, test: string, key = `orders/${orderId}/tsh.pdf`, reason: string | null = null) =>
      rpc(who, `SELECT (public.register_lab_report($1, $2, $3, 'tsh.pdf', 2048, NULL, $4)).id r`, [orderId, test, key, reason]);
    await expect(upload('doctor', T.TSH)).rejects.toThrow(/not allowed/);
    await expect(upload('patient', T.TSH)).rejects.toThrow(/not allowed/);
    await expect(upload('lab1', T.LFT)).rejects.toThrow(/not part of the order/);
    await expect(upload('lab1', T.TSH, 'orders/elsewhere/x.pdf')).rejects.toThrow(/PDF report/);
    reportId = (await upload('lab1', T.TSH)).rows[0].r;
    await expect(upload('lab1', T.TSH, `orders/${orderId}/tsh2.pdf`)).rejects.toThrow(/reason for the new version/);
  });

  it('enforces independent verification when the hospital turns it on, and only releases verified reports', async () => {
    await expect(rpc('lab1', `SELECT public.release_lab_report($1) r`, [reportId])).rejects.toThrow(/Only verified/);
    await db.query(`UPDATE public.hospital_settings SET lab_require_independent_verification = true`);
    await expect(rpc('lab1', `SELECT public.verify_lab_report($1) r`, [reportId])).rejects.toThrow(/different staff member/);
    await db.query(`UPDATE public.hospital_settings SET lab_require_independent_verification = false`);
    await rpc('lab2', `SELECT public.verify_lab_report($1) r`, [reportId]);
    await rpc('lab2', `SELECT public.release_lab_report($1) r`, [reportId]);
    const r = (await db.query<{ status: string }>(`SELECT status FROM public.pathology_reports WHERE id = $1`, [reportId])).rows[0];
    expect(r.status).toBe('published');
    // CBC has no report yet, so the order is not complete.
    expect((await db.query<Order>(`SELECT lab_status FROM public.pathology_orders WHERE id = $1`, [orderId])).rows[0].lab_status).toBe('processing');
  });

  it('a corrected version replaces the released one only once it is released', async () => {
    const v2 = (await rpc('lab1', `SELECT (public.register_lab_report($1, $2, $3, 'tsh-v2.pdf', 2048, NULL, 'Typo in units')).id r`, [orderId, T.TSH, `orders/${orderId}/tsh-v2.pdf`])).rows[0].r;
    expect((await db.query<{ status: string }>(`SELECT status FROM public.pathology_reports WHERE id = $1`, [reportId])).rows[0].status).toBe('published');
    await rpc('owner', `SELECT public.verify_lab_report($1) r`, [v2]);
    await rpc('owner', `SELECT public.release_lab_report($1) r`, [v2]);
    expect((await db.query<{ status: string }>(`SELECT status FROM public.pathology_reports WHERE id = $1`, [reportId])).rows[0].status).toBe('superseded');
    expect(await count(`SELECT count(*) n FROM public.audit_logs WHERE action_type LIKE 'lab_%'`)).toBeGreaterThan(5);
  });
});

describe('report visibility', () => {
  it('patients see only released reports of their own orders; doctors see released only', async () => {
    const o = await order('patient', [{ type: 'test', id: T.TSH }], 'k-report');
    await db.query(`UPDATE public.pathology_orders SET status = 'confirmed' WHERE id = $1`, [o.id]);
    const key = `orders/${o.id}/r.pdf`;
    const id = (await rpc('lab1', `SELECT (public.register_lab_report($1, $2, $3, 'r.pdf', 1000)).id r`, [o.id, T.TSH, key])).rows[0].r;

    const sees = async (who: Who) => (await rpc(who, `SELECT id FROM public.pathology_reports WHERE id = $1`, [id])).rows.length === 1;
    const file = async (who: Who) => (await rpc(who, `SELECT public.can_read_lab_report_file($1) r`, [key])).rows[0].r;
    expect([await sees('patient'), await sees('doctor'), await file('patient'), await file('doctor')]).toEqual([false, false, false, false]);
    expect(await file('lab2')).toBe(true);

    await rpc('lab2', `SELECT public.verify_lab_report($1) r`, [id]);
    await rpc('lab2', `SELECT public.release_lab_report($1) r`, [id]);
    expect([await sees('patient'), await sees('doctor'), await file('patient')]).toEqual([true, true, true]);
    expect([await sees('other'), await file('other'), await file('reception')]).toEqual([false, false, true]);
    expect((await db.query<Order>(`SELECT lab_status FROM public.pathology_orders WHERE id = $1`, [o.id])).rows[0].lab_status).toBe('completed');
  });
});
