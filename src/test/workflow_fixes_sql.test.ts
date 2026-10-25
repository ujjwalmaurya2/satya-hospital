/**
 * End-to-end SQL checks for 20261029000008 against the real migrations:
 * one shared OPD record across Reception and Doctor, report upload/verify/
 * release by role, and home sample collection validation.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser, setIstNow } from './sql/harness';

const ID = {
  patient: 'c0000000-0000-0000-0000-000000000001',
  patient2: 'c0000000-0000-0000-0000-000000000002',
  reception: 'c0000000-0000-0000-0000-000000000003',
  doctor: 'c0000000-0000-0000-0000-000000000004',
  lab: 'c0000000-0000-0000-0000-000000000005',
  owner: 'c0000000-0000-0000-0000-000000000006',
};
type Who = keyof typeof ID;
const c = (k: Who) => ({ role: 'authenticated' as const, sub: ID[k] });
const q = <T = any>(who: Who, sql: string, params: unknown[] = []) => as<T>(db, c(who), sql, params);
const one = async (who: Who, sql: string, params: unknown[] = []) => (await q<{ r: any }>(who, sql, params)).rows[0].r;

// 2026-10-27 is a Tuesday; 2026-11-01 a Sunday (OPD closed).
const TUE = '2026-10-27';
const WED = '2026-10-28';
let db: PGlite;

beforeAll(async () => {
  db = await createDb();
  await setIstNow(db, `${TUE} 08:00`);
  await createUser(db, ID.patient, 'p1@example.com', 'patient', 'Parent One');
  await createUser(db, ID.patient2, 'p2@example.com', 'patient', 'Parent Two');
  await createUser(db, ID.reception, 'desk@satya.test', 'reception', 'Desk');
  await createUser(db, ID.doctor, 'doc@satya.test', 'doctor', 'Dr Doc');
  await createUser(db, ID.lab, 'lab@satya.test', 'pathology', 'Lab');
  await createUser(db, ID.owner, 'owner@satya.test', 'admin', 'Owner');
}, 120_000);

describe('OPD: one record shared by Reception and Doctor', () => {
  let apptId = '';

  it('an online booking is the same row for Reception and the Doctor', async () => {
    const b = await one('patient', `SELECT public.book_opd_pay_at_reception($1, 'Aarav', '9876543210', NULL, 'Fever', 'opd-k1') r`, [TUE]);
    const desk = await q<{ id: string; token_number: number; status: string }>('reception', `SELECT id, token_number, status FROM public.appointments WHERE appointment_date = $1`, [TUE]);
    const doc = await q<{ id: string; token_number: number; status: string }>('doctor', `SELECT id, token_number, status FROM public.appointments WHERE appointment_date = $1`, [TUE]);
    expect(desk.rows).toHaveLength(1);
    expect(doc.rows).toEqual(desk.rows);
    expect(doc.rows[0].token_number).toBe(b.token_number);
    apptId = doc.rows[0].id;
  });

  it('Reception confirms arrival on that row; the doctor sees it, and nothing is duplicated', async () => {
    await one('reception', `SELECT public.set_appointment_status($1, 'checked_in') r`, [apptId]);
    await one('reception', `SELECT public.set_appointment_status($1, 'checked_in') r`, [apptId]); // double click
    const doc = await q<{ status: string; checked_in_at: string }>('doctor', `SELECT status, checked_in_at FROM public.appointments WHERE appointment_date = $1`, [TUE]);
    expect(doc.rows).toHaveLength(1);
    expect(doc.rows[0].status).toBe('checked_in');
    expect(doc.rows[0].checked_in_at).toBeTruthy();
  });

  it('Reception cannot complete a consultation; patients and lab staff cannot touch OPD status', async () => {
    await one('reception', `SELECT public.set_appointment_status($1, 'in_consultation') r`, [apptId]); // calling the patient in is allowed
    await expect(one('reception', `SELECT public.set_appointment_status($1, 'completed') r`, [apptId])).rejects.toThrow(/Only the doctor/);
    await one('doctor', `SELECT public.set_appointment_status($1, 'checked_in') r`, [apptId]); // doctor sends back to waiting
    for (const who of ['patient', 'lab'] as const) {
      await expect(one(who, `SELECT public.set_appointment_status($1, 'completed') r`, [apptId])).rejects.toThrow(/not allowed/);
    }
  });

  it('the doctor starts and completes; notes are saved once and the status persists', async () => {
    const started = (await q<{ id: string; status: string }>('doctor', `SELECT id, status FROM public.call_next_token()`)).rows[0];
    expect(started).toEqual({ id: apptId, status: 'in_consultation' });
    const done = await one('doctor', `SELECT public.complete_opd_consultation($1, 'Fever 2 days', 'Advised fluids', 'Viral fever') r`, [apptId]);
    const again = await one('doctor', `SELECT public.complete_opd_consultation($1, 'x', 'y') r`, [apptId]);
    expect(again.visit_id).toBe(done.visit_id);
    const visits = await q('owner', `SELECT recorded_by, doctor_signature FROM public.patient_visits WHERE appointment_id = $1`, [apptId]);
    expect(visits.rows).toEqual([{ recorded_by: ID.doctor, doctor_signature: 'Dr Doc' }]);
    // A fresh query (e.g. after refresh / re-login) reads the stored state.
    expect((await q<{ status: string }>('reception', `SELECT status FROM public.appointments WHERE id = $1`, [apptId])).rows[0].status).toBe('completed');
  });

  it('the doctor cannot start a patient who has not arrived', async () => {
    const b = await one('patient2', `SELECT public.book_opd_pay_at_reception($1, 'Riya', '9876500000', NULL, 'Cough', 'opd-k2') r`, [TUE]);
    const id = (await q<{ id: string }>('doctor', `SELECT id FROM public.appointments WHERE booking_reference = $1`, [b.booking_reference])).rows[0].id;
    await expect(one('doctor', `SELECT public.set_appointment_status($1, 'in_consultation') r`, [id])).rejects.toThrow(/have arrived/);
  });

  it('a walk-in gets the next shared token and appears for the doctor; other dates keep their own queue', async () => {
    const w = (await q<{ token_number: number }>('reception', `SELECT token_number FROM public.register_walk_in('Walk In Child', '9123456780', 'female')`)).rows[0];
    const tokens = (await q<{ token_number: number; queue_type: string }>('doctor', `SELECT token_number, queue_type FROM public.appointments WHERE appointment_date = $1 ORDER BY token_number`, [TUE])).rows;
    expect(tokens.map(t => t.token_number)).toEqual([1, 2, 3]);
    expect(tokens.find(t => t.token_number === w.token_number)?.queue_type).toBe('walk_in');
    const tomorrow = await one('patient', `SELECT public.book_opd_pay_at_reception($1, 'Aarav', '9876543210', NULL, 'Review', 'opd-k3') r`, [WED]);
    expect(tomorrow.token_number).toBe(1);
  });
});

describe('Lab reports: upload, verify, release', () => {
  let orderId = '';
  let testId = '';

  beforeAll(async () => {
    testId = (await db.query<{ id: string }>(`SELECT id FROM public.pathology_tests WHERE test_code = 'TSH'`)).rows[0].id;
    const o = await one('reception', `SELECT public.register_lab_walk_in($1::jsonb, 'Lab Walk In', '9123456789', NULL, NULL, 'cash', 'lw1') r`, [JSON.stringify([{ type: 'test', id: testId }])]);
    orderId = o.id;
  });

  it('Reception uploads; pathology verifies (repeat is a no-op); release makes it visible; Reception cannot verify', async () => {
    const report = await one('reception', `SELECT (public.register_lab_report($1, $2, $3, 'tsh.pdf', 4000, NULL, NULL, 9000)).id r`, [orderId, testId, `orders/${orderId}/a.pdf`]);
    const row = (await db.query<{ status: string; original_file_size: number; uploaded_by: string }>(`SELECT status, original_file_size, uploaded_by FROM public.pathology_reports WHERE id = $1`, [report])).rows[0];
    expect(row).toEqual({ status: 'pending_verification', original_file_size: 9000, uploaded_by: ID.reception });

    await expect(one('reception', `SELECT public.verify_lab_report($1) r`, [report])).rejects.toThrow(/not allowed/);
    await expect(one('reception', `SELECT public.release_lab_report($1) r`, [report])).rejects.toThrow(/not allowed/);

    const verify = (who: Who) => q<{ verified_by: string; verified_at: string }>(who, `SELECT verified_by, verified_at FROM public.verify_lab_report($1)`, [report]);
    const v1 = (await verify('lab')).rows[0];
    const v2 = (await verify('owner')).rows[0];
    expect(v2.verified_by).toBe(ID.lab); // a repeated verify never overwrites or reverts
    expect(v2.verified_at).toEqual(v1.verified_at);

    await q('lab', `SELECT status FROM public.release_lab_report($1)`, [report]);
    const again = (await q<{ status: string }>('lab', `SELECT status FROM public.release_lab_report($1)`, [report])).rows[0];
    expect(again.status).toBe('published');
  });

  it('the same storage file cannot back two reports', async () => {
    await expect(
      one('lab', `SELECT (public.register_lab_report($1, $2, $3, 'tsh.pdf', 4000, NULL, 'fix')).id r`, [orderId, testId, `orders/${orderId}/a.pdf`])
    ).rejects.toThrow(/already attached/);
  });

  it('the storage cleanup rule only allows deleting files that are not registered', async () => {
    expect(await one('lab', `SELECT public.lab_report_file_is_unregistered($1) r`, [`orders/${orderId}/a.pdf`])).toBe(false);
    expect(await one('lab', `SELECT public.lab_report_file_is_unregistered($1) r`, [`orders/${orderId}/orphan.pdf`])).toBe(true);
  });
});

describe('Home sample collection', () => {
  let testId = '';
  const items = () => JSON.stringify([{ type: 'test', id: testId }]);
  const order = (who: Who, key: string, method: string, date: string | null, address: string | null, pin: string | null, slot: string | null) =>
    one(who, `SELECT public.create_lab_order($1::jsonb, 'Aarav', '9876543210', NULL, $2, $3, $4, $5, $6, $7) r`, [items(), method, date, key, address, pin, slot]);

  beforeAll(async () => {
    testId = (await db.query<{ id: string }>(`SELECT id FROM public.pathology_tests WHERE test_code = 'CBC'`)).rows[0].id;
  });

  it('is off until configured, and only the Super Admin can configure it', async () => {
    expect((await one('patient', `SELECT public.lab_config() r`)).home_collection_enabled).toBe(false);
    await expect(order('patient', 'h0', 'home', WED, '12 Civil Lines, Prayagraj', '211001', '07:00-09:00')).rejects.toThrow(/not available yet/);
    const save = (who: Who, enabled: boolean, fee: number | null, pins: string[], slots: string[], cap: number | null) =>
      one(who, `SELECT public.set_lab_home_collection($1, $2, $3, $4, $5, 7) r`, [enabled, fee, pins, slots, cap]);
    await expect(save('reception', true, 100, ['211001'], ['07:00-09:00'], 1)).rejects.toThrow(/not allowed/);
    await expect(save('owner', true, null, ['211001'], ['07:00-09:00'], 1)).rejects.toThrow(/before switching home collection on/);
    await expect(save('owner', false, 100, ['2110'], ['07:00-09:00'], 1)).rejects.toThrow(/6 digits/);
    await expect(save('owner', false, 100, ['211001'], ['9-7'], 1)).rejects.toThrow(/07:00-09:00/);
    const cfg = await save('owner', true, 100, ['211001', '211002'], ['07:00-09:00', '09:00-11:00'], 1);
    expect(cfg.home_collection_enabled).toBe(true);
  });

  it('validates address, service area, slot, date and capacity on the server', async () => {
    await expect(order('patient', 'h1', 'home', WED, 'short', '211001', '07:00-09:00')).rejects.toThrow(/full collection address/);
    await expect(order('patient', 'h2', 'home', WED, '12 Civil Lines, Prayagraj', '110001', '07:00-09:00')).rejects.toThrow(/not available for pincode 110001/);
    await expect(order('patient', 'h3', 'home', WED, '12 Civil Lines, Prayagraj', '211001', '13:00-15:00')).rejects.toThrow(/available time slots/);
    await expect(order('patient', 'h4', 'home', '2026-11-20', '12 Civil Lines, Prayagraj', '211001', '07:00-09:00')).rejects.toThrow(/within the next 7 days/);
    await expect(order('patient', 'h5', 'home', '2026-11-01', '12 Civil Lines, Prayagraj', '211001', '07:00-09:00')).rejects.toThrow(/not available on that date/);
    await setIstNow(db, `${TUE} 08:30`);
    await expect(order('patient', 'h6', 'home', TUE, '12 Civil Lines, Prayagraj', '211001', '07:00-09:00')).rejects.toThrow(/already started/);
  });

  it('saves the address, slot and fee on that order only; payment stays separate; capacity is enforced', async () => {
    const home = await order('patient', 'h7', 'home', WED, '12 Civil Lines, Prayagraj', '211001', '07:00-09:00');
    expect(home).toMatchObject({
      collection_method: 'home', collection_address: '12 Civil Lines, Prayagraj', collection_pincode: '211001', collection_slot: '07:00-09:00',
      collection_fee_paise: 10000, total_paise: home.subtotal_paise + 10000, payment_status: 'unpaid', status: 'pending',
    });
    await expect(order('patient2', 'h8', 'home', WED, '7 MG Marg, Prayagraj', '211002', '07:00-09:00')).rejects.toThrow(/fully booked/);
    const other = await order('patient2', 'h9', 'home', WED, '7 MG Marg, Prayagraj', '211002', '09:00-11:00');
    expect(other.collection_address).toBe('7 MG Marg, Prayagraj');
    const lab = await order('patient2', 'h10', 'hospital_lab', null, null, null, null);
    expect(lab).toMatchObject({ collection_method: 'hospital_lab', collection_address: null, collection_fee_paise: 0, total_paise: lab.subtotal_paise });

    // Patients only see their own address; Reception sees all collection details.
    expect((await q('patient2', `SELECT id FROM public.pathology_orders WHERE id = $1`, [home.id])).rows).toHaveLength(0);
    expect((await q<{ collection_address: string }>('reception', `SELECT collection_address FROM public.pathology_orders WHERE id = $1`, [home.id])).rows[0].collection_address).toBe('12 Civil Lines, Prayagraj');
  });
});
