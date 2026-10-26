/**
 * 20261030000009 against the real migrations: reception appointment search
 * (IST date ranges, filters, paging), summary counts, audited status/detail
 * changes, and the medical-records workflow with its permissions.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser, setIstNow } from './sql/harness';

const ID = {
  p1: 'd0000000-0000-0000-0000-000000000001',
  p2: 'd0000000-0000-0000-0000-000000000002',
  reception: 'd0000000-0000-0000-0000-000000000003',
  doctor: 'd0000000-0000-0000-0000-000000000004',
  lab: 'd0000000-0000-0000-0000-000000000005',
};
type Who = keyof typeof ID;
const c = (k: Who) => ({ role: 'authenticated' as const, sub: ID[k] });
const q = <T = any>(who: Who, sql: string, params: unknown[] = []) => as<T>(db, c(who), sql, params);
const one = async (who: Who, sql: string, params: unknown[] = []) => (await q<{ r: any }>(who, sql, params)).rows[0].r;

let db: PGlite;
// 2026-10-27 Tue (today), 26 Mon (past), 28 Wed (tomorrow), 30 Fri (later).
const search = (args: Record<string, unknown> = {}, who: Who = 'reception') =>
  one(who, `SELECT public.reception_search_appointments($1::date, $2::date, $3::appointment_status[], $4, $5, $6, $7, $8, $9) r`, [
    args.from ?? null, args.to ?? null, args.statuses ? `{${(args.statuses as string[]).join(',')}}` : null, args.type ?? null, args.payment ?? null, args.query ?? null, args.sort ?? 'asc', args.limit ?? 50, args.offset ?? 0,
  ]);

beforeAll(async () => {
  db = await createDb();
  await createUser(db, ID.p1, 'p1@example.com', 'patient', 'Parent One');
  await createUser(db, ID.p2, 'p2@example.com', 'patient', 'Parent Two');
  await createUser(db, ID.reception, 'desk@satya.test', 'reception', 'Desk');
  await createUser(db, ID.doctor, 'doc@satya.test', 'doctor', 'Dr Doc');
  await createUser(db, ID.lab, 'lab@satya.test', 'pathology', 'Lab');

  const book = async (who: Who, date: string, name: string, phone: string, key: string) => {
    await setIstNow(db, `${date} 08:00`);
    return one(who, `SELECT public.book_opd_pay_at_reception($1, $2, $3, NULL, 'Fever', $4) r`, [date, name, phone, key]);
  };
  await book('p1', '2026-10-26', 'Aarav Mishra', '9876543210', 'k1');
  await book('p2', '2026-10-26', 'Riya Verma', '9811112222', 'k2');
  await book('p1', '2026-10-27', 'Aarav Mishra', '9876543210', 'k3');
  await book('p2', '2026-10-28', 'Riya Verma', '9811112222', 'k4');
  await book('p1', '2026-10-30', 'Kabir Mishra', '9876543210', 'k5');
  await setIstNow(db, '2026-10-27 10:00');
  await q('reception', `SELECT * FROM public.register_walk_in('Walk In Child', '9123456780', 'female')`);
}, 120_000);

describe('reception appointment search', () => {
  it('returns every appointment with the right patient name, once', async () => {
    const all = await search();
    expect(all.total).toBe(6);
    const names = all.rows.map((r: any) => `${r.appointment_date}:${r.patient.full_name}`);
    expect(names).toEqual([
      '2026-10-26:Aarav Mishra', '2026-10-26:Riya Verma', '2026-10-27:Aarav Mishra', '2026-10-27:Walk In Child',
      '2026-10-28:Riya Verma', '2026-10-30:Kabir Mishra',
    ]);
    expect(new Set(all.rows.map((r: any) => r.id)).size).toBe(6);
  });

  it('filters by IST calendar dates: today, tomorrow, upcoming, past, single day and inclusive range', async () => {
    const dates = async (a: Record<string, unknown>) => (await search(a)).rows.map((r: any) => r.appointment_date);
    expect(await dates({ from: '2026-10-27', to: '2026-10-27' })).toEqual(['2026-10-27', '2026-10-27']);
    expect(await dates({ from: '2026-10-28', to: '2026-10-28' })).toEqual(['2026-10-28']);
    expect(await dates({ from: '2026-10-28' })).toEqual(['2026-10-28', '2026-10-30']);
    expect(await dates({ to: '2026-10-26' })).toEqual(['2026-10-26', '2026-10-26']);
    expect(await dates({ from: '2026-10-26', to: '2026-10-28' })).toHaveLength(5); // both ends included
    expect(await dates({ from: '2026-10-29', to: '2026-10-29' })).toEqual([]);
  });

  it('searches name, phone, patient ID and booking reference; filters status, source and payment; pages and sorts', async () => {
    expect((await search({ query: 'riya' })).total).toBe(2);
    expect((await search({ query: '98111' })).total).toBe(2);
    const ref = (await search({ query: 'Kabir' })).rows[0].booking_reference;
    expect((await search({ query: ref })).rows.map((r: any) => r.patient.full_name)).toEqual(['Kabir Mishra']);
    expect((await search({ statuses: ['checked_in'] })).rows.map((r: any) => r.queue_type)).toEqual(['walk_in']);
    expect((await search({ type: 'online' })).total).toBe(5);
    expect((await search({ payment: 'paid' })).total).toBe(0);
    expect((await search({ payment: 'unpaid' })).total).toBe(6);
    const page2 = await search({ limit: 2, offset: 2 });
    expect([page2.total, page2.rows.length, page2.rows[0].appointment_date]).toEqual([6, 2, '2026-10-27']);
    expect((await search({ sort: 'desc', limit: 1 })).rows[0].appointment_date).toBe('2026-10-30');
  });

  it('is staff-only: patients and pathology cannot search', async () => {
    await expect(search({}, 'p1')).rejects.toThrow(/not allowed/);
    await expect(search({}, 'lab')).rejects.toThrow(/not allowed/);
  });

  it('summarises the selected day and what comes after it', async () => {
    const s = await one('reception', `SELECT public.reception_appointment_summary('2026-10-27') r`);
    expect(s).toMatchObject({ total: 2, booked: 1, checked_in: 1, walk_in: 1, online: 1, completed: 0, cancelled: 0, upcoming: 2 });
  });
});

describe('appointment changes are permission-checked and audited', () => {
  let apptId = '';
  beforeAll(async () => {
    apptId = (await search({ from: '2026-10-28', to: '2026-10-28' })).rows[0].id;
  });

  it('reception corrects the phone and adds a note; the doctor and patients cannot', async () => {
    const a = await q<{ contact_phone: string; reception_notes: string }>('reception', `SELECT contact_phone, reception_notes FROM public.update_appointment_details($1, '9000000001', 'Prefers a call before 9')`, [apptId]);
    expect(a.rows[0]).toEqual({ contact_phone: '9000000001', reception_notes: 'Prefers a call before 9' });
    await expect(q('reception', `SELECT * FROM public.update_appointment_details($1, '123', NULL)`, [apptId])).rejects.toThrow(/valid 10-digit/);
    await expect(q('doctor', `SELECT * FROM public.update_appointment_details($1, NULL, 'x')`, [apptId])).rejects.toThrow(/not allowed/);
    await expect(q('p2', `SELECT * FROM public.update_appointment_details($1, NULL, 'x')`, [apptId])).rejects.toThrow(/not allowed/);
  });

  it('records who changed a status and when', async () => {
    await q('reception', `SELECT * FROM public.set_appointment_status($1, 'cancelled', 'Patient called to cancel')`, [apptId]);
    const audit = await db.query<{ actor_id: string; description: string }>(`SELECT actor_id, description FROM public.audit_logs WHERE action_type = 'appointment.status' AND target_id = $1`, [apptId]);
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].actor_id).toBe(ID.reception);
    expect(audit.rows[0].description).toMatch(/booked → cancelled \(Patient called to cancel\)/);
  });
});

describe('medical records', () => {
  let patient = '';
  let appt = '';
  let otherAppt = '';
  const reg = (who: Who, args: Partial<Record<'patient' | 'appt' | 'type' | 'name' | 'mime' | 'key' | 'date' | 'replaces' | 'reason', unknown>>) =>
    q<{ id: string; verification_status: string; superseded_by_id: string | null }>(
      who,
      `SELECT id, verification_status, superseded_by_id FROM public.register_medical_document($1, $2, $3, 'Prescription scan', $4, 2048, $5, $6, $7, NULL, $8, $9)`,
      [args.patient ?? patient, args.appt ?? null, args.type ?? 'prescription', args.name ?? 'rx.pdf', args.mime ?? 'application/pdf', args.key ?? `patients/${patient}/${Math.random()}.pdf`, args.date ?? null, args.replaces ?? null, args.reason ?? null]
    ).then(r => r.rows[0]);

  beforeAll(async () => {
    const rows = (await search({ query: 'Aarav' })).rows;
    patient = rows[0].patient_profile_id;
    appt = rows[0].id;
    otherAppt = (await search({ query: 'Riya' })).rows[0].id;
  });

  it('reception uploads a PDF or image; the doctor verifies; only then can the patient see it', async () => {
    const pdf = await reg('reception', { appt });
    const png = await reg('reception', { name: 'scan.PNG', mime: 'image/png', type: 'previous_record', date: '2025-01-15' });
    expect([pdf.verification_status, png.verification_status]).toEqual(['unverified', 'unverified']);
    const patientSees = async () => (await q<{ id: string }>('p1', `SELECT id FROM public.medical_documents`)).rows.map(r => r.id);
    expect(await patientSees()).toEqual([]);
    await expect(q('reception', `SELECT * FROM public.verify_medical_document($1)`, [pdf.id])).rejects.toThrow(/not allowed/);
    await q('doctor', `SELECT * FROM public.verify_medical_document($1)`, [pdf.id]);
    await q('doctor', `SELECT * FROM public.verify_medical_document($1)`, [pdf.id]); // repeat is a no-op
    expect(await patientSees()).toEqual([pdf.id]);
    expect((await q('p2', `SELECT id FROM public.medical_documents`)).rows).toEqual([]);
  });

  it('rejects wrong formats, future dates, other patients’ appointments and foreign storage paths', async () => {
    await expect(reg('reception', { name: 'virus.exe', mime: 'application/octet-stream' })).rejects.toThrow(/Only PDF, JPG and PNG/);
    await expect(reg('reception', { name: 'scan.pdf', mime: 'image/png' })).rejects.toThrow(/Only PDF, JPG and PNG/);
    await expect(reg('reception', { date: '2026-12-01' })).rejects.toThrow(/future/);
    await expect(reg('reception', { appt: otherAppt })).rejects.toThrow(/does not belong to this patient/);
    await expect(reg('reception', { key: 'patients/someone-else/x.pdf' })).rejects.toThrow(/not uploaded for this patient/);
    await expect(reg('p1', {})).rejects.toThrow(/not allowed/);
    await expect(reg('lab', {})).rejects.toThrow(/not allowed/);
  });

  it('replacing keeps the old version, hides it from the patient and needs a reason', async () => {
    const first = await reg('doctor', {}); // doctor uploads are already verified
    expect(first.verification_status).toBe('verified');
    await expect(reg('reception', { replaces: first.id })).rejects.toThrow(/reason/);
    const second = await reg('doctor', { replaces: first.id, reason: 'Wrong page scanned' });
    const rows = (await db.query<{ id: string; superseded_by_id: string | null }>(`SELECT id, superseded_by_id FROM public.medical_documents WHERE id IN ($1, $2)`, [first.id, second.id])).rows;
    expect(rows.find(r => r.id === first.id)?.superseded_by_id).toBe(second.id);
    const visible = (await q<{ id: string }>('p1', `SELECT id FROM public.medical_documents`)).rows.map(r => r.id);
    expect(visible).toContain(second.id);
    expect(visible).not.toContain(first.id);
    await expect(reg('doctor', { replaces: first.id, reason: 'again' })).rejects.toThrow(/already been replaced/);
  });

  it('staff can only read documents directly; writes must go through the audited functions', async () => {
    await expect(
      q('reception', `INSERT INTO public.medical_documents (patient_profile_id, document_type, title, file_name, file_size, storage_key, uploader_id, uploader_role) VALUES ($1, 'other', 'x', 'x.pdf', 1, 'k', $2, 'reception')`, [patient, ID.reception])
    ).rejects.toThrow(/row-level security/);
    expect((await q('reception', `UPDATE public.medical_documents SET title = 'changed'`)).affectedRows).toBe(0);
    expect((await q('reception', `DELETE FROM public.medical_documents`)).affectedRows).toBe(0);
    expect((await db.query(`SELECT 1 FROM public.audit_logs WHERE action_type LIKE 'medical_document.%'`)).rows.length).toBeGreaterThanOrEqual(4);
  });

  it('file access: staff yes; the patient only for their verified, current file; other patients never', async () => {
    const doc = (await db.query<{ storage_key: string }>(`SELECT storage_key FROM public.medical_documents WHERE verification_status = 'verified' AND superseded_by_id IS NULL AND patient_profile_id = $1 LIMIT 1`, [patient])).rows[0];
    const can = (who: Who) => one(who, `SELECT public.can_read_medical_record_file($1) r`, [doc.storage_key]);
    expect([await can('reception'), await can('doctor'), await can('p1'), await can('p2'), await can('lab')]).toEqual([true, true, true, false, false]);
  });
});
