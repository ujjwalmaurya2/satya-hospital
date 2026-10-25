/**
 * Embedded-Postgres harness for migration tests (PGlite, in-process).
 * Stubs the parts of Supabase the SQL depends on: the auth schema
 * (auth.users, auth.uid(), auth.role()) and the anon/authenticated/
 * service_role roles. Tests impersonate callers by setting JWT claims.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const root = resolve(__dirname, '../../../supabase');

export const MIGRATIONS = [
  'complete_satya_hospital_setup.sql',
  'migrations/20261024000003_staff_queue_desk.sql',
  'migrations/20261025000004_opd_online_booking_payments.sql',
  'migrations/20261026000005_staff_rbac_hardening.sql',
  'migrations/20261027000006_pathology_orders.sql',
];

const AUTH_STUB = `
  DO $$ BEGIN
    CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb
  );
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')
  $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
`;

export async function createDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(resolve(root, file), 'utf8'));
  }
  // Supabase grants table privileges to API roles; RLS then filters rows.
  await db.exec(`
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  `);
  return db;
}

/** Freeze the database clock used by hospital rules (IST wall time, e.g. '2026-10-24 08:30'). */
export async function setIstNow(db: PGlite, istWallTime: string | null) {
  await db.query(`SELECT set_config('app.test_now_ist', $1, false)`, [istWallTime ?? '']);
}

export type Caller = { role: 'anon' | 'authenticated' | 'service_role'; sub?: string };

/** Run a query as a given API caller (role + JWT claims), like PostgREST does. */
export async function as<T = Record<string, unknown>>(db: PGlite, caller: Caller, sql: string, params: unknown[] = []) {
  await db.exec(`RESET ROLE`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)`, [
    caller.sub ?? '',
    caller.role,
  ]);
  await db.exec(`SET ROLE ${caller.role}`);
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec(`RESET ROLE`);
  }
}

export async function createUser(db: PGlite, id: string, email: string, role: 'patient' | 'reception' | 'admin' | 'doctor' | 'pathology' = 'patient', fullName = 'Test User') {
  await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, jsonb_build_object('full_name', $3::text))`, [id, email, fullName]);
  if (role !== 'patient') await db.query(`UPDATE public.profiles SET role = $2 WHERE id = $1`, [id, role]);
}
