-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — STAFF RBAC HARDENING (Google sign-in for staff)
-- Migration: 20261026000005_staff_rbac_hardening.sql
-- Depends on: complete_satya_hospital_setup.sql, 20261024000003, 20261025000004
--
-- Role tiers on the existing user_role enum (no rename):
--   Super Admin  = 'admin'      (hospital owner: settings, audit, roles, every desk)
--   Staff        = 'reception' | 'doctor' | 'pathology' (own desk only)
--   User         = 'patient'    (default for every new account, incl. Google)
--
-- Roles are only ever read from public.profiles; Google sign-in, email text and
-- user metadata never grant a staff role. Idempotent: safe to run more than once.
-- ============================================================================

-- 1. A deactivated account has no role, so every RLS policy and role-checked
--    RPC rejects it even while its old JWT is still valid.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active;
$$;

-- 2. Audit entries can only be written by a signed-in user, as themselves,
--    with their real role (previously anyone, even anon, could forge rows).
DROP POLICY IF EXISTS "Staff append audit logs" ON public.audit_logs;
CREATE POLICY "Staff append audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND actor_id = auth.uid()::TEXT AND actor_role = public.get_auth_role());

-- 3. Role assignment by the Super Admin. The person must have signed in once
--    (e.g. with Google) so their profile exists. Super Admins cannot change
--    their own row, so the hospital can't lock itself out by accident.
CREATE OR REPLACE FUNCTION public.set_user_role(p_email TEXT, p_role user_role, p_is_active BOOLEAN DEFAULT true)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor   public.profiles;
  v_target  public.profiles;
BEGIN
  SELECT * INTO v_actor FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the Super Admin can change roles.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE lower(email) = lower(btrim(p_email)) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account found for %. Ask them to sign in once first.', btrim(p_email) USING ERRCODE = 'no_data_found';
  END IF;
  IF v_target.id = v_actor.id THEN
    RAISE EXCEPTION 'You cannot change your own role.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.profiles SET role = p_role, is_active = p_is_active, updated_at = NOW() WHERE id = v_target.id;

  INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action_type, target_entity, target_id, description, metadata)
  VALUES (v_actor.id::TEXT, v_actor.full_name, v_actor.role, 'profile.role_changed', 'profiles', v_target.id::TEXT,
          format('Role for %s changed from %s to %s (active: %s).', v_target.email, v_target.role, p_role, p_is_active),
          jsonb_build_object('from', v_target.role, 'to', p_role, 'is_active', p_is_active));

  RETURN jsonb_build_object('email', v_target.email, 'role', p_role, 'is_active', p_is_active);
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_role(TEXT, user_role, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(TEXT, user_role, BOOLEAN) TO authenticated;
