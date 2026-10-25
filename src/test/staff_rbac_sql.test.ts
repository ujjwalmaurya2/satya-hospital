/**
 * Backend RBAC checks against the real migrations (PGlite): each role is
 * impersonated with JWT claims the way PostgREST does, so this exercises RLS
 * and role-checked RPCs exactly as the API would.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser } from './sql/harness';

const IDS = {
  owner: 'a0000000-0000-0000-0000-000000000001',
  reception: 'a0000000-0000-0000-0000-000000000002',
  pathology: 'a0000000-0000-0000-0000-000000000003',
  doctor: 'a0000000-0000-0000-0000-000000000004',
  patient: 'a0000000-0000-0000-0000-000000000005',
  inactive: 'a0000000-0000-0000-0000-000000000006',
  google: 'a0000000-0000-0000-0000-000000000007',
};
const caller = (k: keyof typeof IDS) => ({ role: 'authenticated' as const, sub: IDS[k] });
const anon = { role: 'anon' as const };

let db: PGlite;

async function denied(p: Promise<unknown>) {
  await expect(p).rejects.toThrow(/permission denied|row-level security|Only the Super Admin|Only reception/i);
}

let walkIns = 0;
const walkIn = (k: keyof typeof IDS) => as(db, caller(k), `SELECT public.register_walk_in($1, '9876543210', 'male')`, [`Walk In ${++walkIns}`]);
const setRole = (k: keyof typeof IDS, email: string, role: string, active = true) =>
  as<{ r: Record<string, unknown> }>(db, caller(k), `SELECT public.set_user_role($1, $2::user_role, $3) r`, [email, role, active]);
const roleOf = async (id: string) => (await db.query<{ role: string; is_active: boolean }>(`SELECT role, is_active FROM public.profiles WHERE id = $1`, [id])).rows[0];

beforeAll(async () => {
  db = await createDb();
  await createUser(db, IDS.owner, 'owner@satya.test', 'admin', 'Dr Owner');
  await createUser(db, IDS.reception, 'desk@satya.test', 'reception', 'Desk');
  await createUser(db, IDS.pathology, 'lab@satya.test', 'pathology', 'Lab');
  await createUser(db, IDS.doctor, 'doc@satya.test', 'doctor', 'Doc');
  await createUser(db, IDS.patient, 'parent@example.com', 'patient', 'Parent');
  await createUser(db, IDS.inactive, 'former@satya.test', 'reception', 'Former');
  await db.query(`UPDATE public.profiles SET is_active = false WHERE id = $1`, [IDS.inactive]);
}, 120_000);

describe('new accounts', () => {
  it('a Google sign-up is always a patient, whatever its metadata claims', async () => {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'admin@satyahospital.in', '{"full_name":"X","role":"admin"}')`, [IDS.google]);
    expect((await roleOf(IDS.google)).role).toBe('patient');
  });
});

describe('patients (user)', () => {
  it('cannot change their own role', async () => {
    const r = await as(db, caller('patient'), `UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [IDS.patient]);
    expect(r.affectedRows).toBe(0);
    expect((await roleOf(IDS.patient)).role).toBe('patient');
    await denied(setRole('patient', 'parent@example.com', 'admin'));
  });

  it('cannot read staff data or call staff RPCs', async () => {
    expect((await as(db, caller('patient'), `SELECT id FROM public.profiles`)).rows).toHaveLength(1); // own row only
    expect((await as(db, caller('patient'), `SELECT id FROM public.audit_logs`)).rows).toHaveLength(0);
    expect((await as(db, caller('patient'), `SELECT id FROM public.opd_payment_orders`)).rows).toHaveLength(0);
    expect((await as(db, caller('patient'), `SELECT id FROM public.appointments`)).rows).toHaveLength(0);
    await denied(walkIn('patient'));
    const s = await as(db, caller('patient'), `UPDATE public.hospital_settings SET consultation_fee = 1`);
    expect(s.affectedRows).toBe(0);
  });
});

describe('staff (admin tier: reception / pathology / doctor)', () => {
  it('cannot use Super Admin functions', async () => {
    for (const k of ['reception', 'pathology', 'doctor'] as const) {
      await denied(setRole(k, 'parent@example.com', 'reception'));
      expect((await as(db, caller(k), `SELECT id FROM public.audit_logs`)).rows).toHaveLength(0);
      expect((await as(db, caller(k), `UPDATE public.hospital_settings SET consultation_fee = 1`)).affectedRows).toBe(0);
      expect((await as(db, caller(k), `UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [IDS[k]])).affectedRows).toBe(0);
    }
  });

  it('keeps reception and pathology on their own desks', async () => {
    await expect(walkIn('reception')).resolves.toBeTruthy();
    await denied(walkIn('pathology'));
    await denied(walkIn('doctor'));
    expect((await as(db, caller('pathology'), `SELECT id FROM public.appointments`)).rows).toHaveLength(0);
    expect((await as(db, caller('pathology'), `SELECT id FROM public.opd_payment_orders`)).rows).toHaveLength(0);
  });

  it('a deactivated staff account loses access even with a valid session', async () => {
    await denied(walkIn('inactive'));
    expect((await as(db, caller('inactive'), `SELECT id FROM public.appointments`)).rows).toHaveLength(0);
    expect((await as(db, caller('inactive'), `SELECT id FROM public.patient_profiles`)).rows).toHaveLength(0);
  });
});

describe('Super Admin (owner)', () => {
  it('assigns and revokes roles through set_user_role, with an audit entry', async () => {
    const r = await setRole('owner', 'PARENT@example.com', 'reception');
    expect(r.rows[0].r).toMatchObject({ role: 'reception', is_active: true });
    expect((await roleOf(IDS.patient)).role).toBe('reception');
    await expect(walkIn('patient')).resolves.toBeTruthy();

    await setRole('owner', 'parent@example.com', 'patient');
    await denied(walkIn('patient'));

    const audit = await as(db, caller('owner'), `SELECT id FROM public.audit_logs WHERE action_type = 'profile.role_changed'`);
    expect(audit.rows).toHaveLength(2);
  });

  it('cannot change their own role and gets a clear error for unknown emails', async () => {
    await expect(setRole('owner', 'owner@satya.test', 'reception')).rejects.toThrow(/own role/);
    await expect(setRole('owner', 'nobody@example.com', 'reception')).rejects.toThrow(/No account found/);
  });
});

describe('audit log integrity', () => {
  it('rejects forged entries from anon or with someone else’s identity or role', async () => {
    const insert = (c: { role: 'anon' | 'authenticated'; sub?: string }, actor: string, role: string) =>
      as(db, c, `INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action_type, target_entity, target_id, description) VALUES ($1, 'x', $2::user_role, 'x', 'x', 'x', 'x')`, [actor, role]);
    await denied(insert(anon, IDS.owner, 'admin'));
    await expect(insert(caller('reception'), IDS.owner, 'admin')).rejects.toThrow(/row-level security/);
    await expect(insert(caller('reception'), IDS.reception, 'admin')).rejects.toThrow(/row-level security/);
    await expect(insert(caller('reception'), IDS.reception, 'reception')).resolves.toBeTruthy();
  });
});
