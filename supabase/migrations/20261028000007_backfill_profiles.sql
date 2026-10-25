-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — BACKFILL MISSING PROFILES
-- Migration: 20261028000007_backfill_profiles.sql
--
-- profiles rows are created by the on_auth_user_created trigger (added in
-- 20261024000003). Accounts that signed up before that trigger existed have no
-- profile, so the app can't load them (PostgREST PGRST116 on login) and every
-- role check fails. Create the missing rows as 'patient', exactly as the
-- trigger would; staff roles are still granted only via set_user_role.
-- Idempotent: safe to run more than once.
-- ============================================================================
INSERT INTO public.profiles (id, email, full_name, role)
SELECT u.id,
       COALESCE(u.email, u.id::TEXT || '@users.satya.local'),
       COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(COALESCE(u.email, 'User'), '@', 1)),
       'patient'
  FROM auth.users u
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;
