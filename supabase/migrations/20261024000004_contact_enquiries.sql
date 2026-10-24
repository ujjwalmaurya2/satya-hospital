-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — PUBLIC CONTACT ENQUIRIES
-- Migration: 20261024000004_contact_enquiries.sql
-- Depends on: 20261022000001 (profiles, user_role, get_auth_role)
--
-- What this adds:
--   1. `contact_enquiries` — messages sent from the public /contact form.
--   2. RLS: anyone (anon or signed in) may INSERT a well-formed enquiry; only
--      reception/admin may read it or change its status. Nobody may delete
--      through the API.
--   3. A BEFORE INSERT trigger that pins server-controlled columns (status,
--      timestamps) and throttles repeat submissions from one phone number.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  topic       TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  handled_by  UUID REFERENCES auth.users(id),
  handled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_enquiry_name    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT chk_enquiry_phone   CHECK (phone ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT chk_enquiry_email   CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  CONSTRAINT chk_enquiry_topic   CHECK (char_length(btrim(topic)) BETWEEN 1 AND 60),
  CONSTRAINT chk_enquiry_message CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  CONSTRAINT chk_enquiry_status  CHECK (status IN ('new', 'contacted', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_status_created
  ON public.contact_enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_phone_created
  ON public.contact_enquiries (phone, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Insert trigger: server-controlled columns + simple throttle
-- ----------------------------------------------------------------------------
-- Runs as definer so it can count recent rows even though anon cannot SELECT.
CREATE OR REPLACE FUNCTION public.contact_enquiries_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INTEGER;
BEGIN
  NEW.name       := btrim(NEW.name);
  NEW.phone      := regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g');
  NEW.email      := NULLIF(btrim(COALESCE(NEW.email, '')), '');
  NEW.topic      := btrim(NEW.topic);
  NEW.message    := btrim(NEW.message);
  NEW.status     := 'new';
  NEW.handled_by := NULL;
  NEW.handled_at := NULL;
  NEW.created_at := NOW();

  SELECT COUNT(*) INTO v_recent
    FROM public.contact_enquiries
   WHERE phone = NEW.phone
     AND created_at > NOW() - INTERVAL '10 minutes';
  IF v_recent >= 3 THEN
    RAISE EXCEPTION 'Too many enquiries from this number. Please wait a few minutes or call reception.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_enquiries_before_insert ON public.contact_enquiries;
CREATE TRIGGER trg_contact_enquiries_before_insert
  BEFORE INSERT ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.contact_enquiries_before_insert();

-- Staff may only move the status; the enquiry text itself is immutable.
CREATE OR REPLACE FUNCTION public.contact_enquiries_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id         := OLD.id;
  NEW.name       := OLD.name;
  NEW.phone      := OLD.phone;
  NEW.email      := OLD.email;
  NEW.topic      := OLD.topic;
  NEW.message    := OLD.message;
  NEW.created_at := OLD.created_at;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.handled_by := auth.uid();
    NEW.handled_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_enquiries_before_update ON public.contact_enquiries;
CREATE TRIGGER trg_contact_enquiries_before_update
  BEFORE UPDATE ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.contact_enquiries_before_update();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Submit Enquiry" ON public.contact_enquiries;
CREATE POLICY "Public Submit Enquiry" ON public.contact_enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND char_length(btrim(name)) BETWEEN 1 AND 120
    AND char_length(btrim(topic)) BETWEEN 1 AND 60
    AND char_length(btrim(message)) BETWEEN 1 AND 2000
    AND (email IS NULL OR char_length(email) <= 254)
  );

DROP POLICY IF EXISTS "Reception Read Enquiries" ON public.contact_enquiries;
CREATE POLICY "Reception Read Enquiries" ON public.contact_enquiries
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('reception', 'admin'));

DROP POLICY IF EXISTS "Reception Update Enquiries" ON public.contact_enquiries;
CREATE POLICY "Reception Update Enquiries" ON public.contact_enquiries
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('reception', 'admin'))
  WITH CHECK (public.get_auth_role() IN ('reception', 'admin'));

-- No DELETE policy: enquiries are closed, not removed.
REVOKE DELETE, TRUNCATE ON public.contact_enquiries FROM anon, authenticated;
GRANT INSERT ON public.contact_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_enquiries TO authenticated;
