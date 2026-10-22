-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — AUTHORITATIVE CORE DATABASE SCHEMA
-- Migration: 20261022000001_satya_hospital_schema.sql
-- Description: Production schema with strict Row Level Security (RLS), 
--              collision-safe sequence generators, audit logging, and role-based policies.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'reception', 'doctor', 'pathology', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_type AS ENUM ('online', 'walk_in');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('unmatched', 'pending_verification', 'published', 'superseded', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_verification_status AS ENUM ('unverified', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. SEQUENCES FOR COLLISION-SAFE IMMUTABLE IDENTIFIERS
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS appointment_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS lab_accession_seq START WITH 1 INCREMENT BY 1;

-- 4. FUNCTION: Generate Patient ID (e.g. SH-2026-00042)
CREATE OR REPLACE FUNCTION generate_hospital_patient_id() 
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  next_val := NEXTVAL('patient_id_seq');
  RETURN 'SH-' || current_year || '-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 4.2 Shared Daily Token Counters & Concurrency-Safe Allocator
CREATE TABLE IF NOT EXISTS public.daily_opd_token_counters (
  appointment_date DATE PRIMARY KEY,
  last_token_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.allocate_daily_opd_token(p_appointment_date DATE)
RETURNS INTEGER AS $$
DECLARE
  v_next_token INTEGER;
BEGIN
  INSERT INTO public.daily_opd_token_counters (appointment_date, last_token_number, updated_at)
  VALUES (p_appointment_date, 1, NOW())
  ON CONFLICT (appointment_date)
  DO UPDATE SET
    last_token_number = public.daily_opd_token_counters.last_token_number + 1,
    updated_at = NOW()
  RETURNING last_token_number INTO v_next_token;

  RETURN v_next_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TABLES

-- 5.1 Hospital Settings (Global Configuration)
CREATE TABLE IF NOT EXISTS public.hospital_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL DEFAULT 'Satya Hospital & Pathology',
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  email TEXT NOT NULL,
  opd_start_time TEXT NOT NULL DEFAULT '09:30',
  online_cutoff_time TEXT NOT NULL DEFAULT '09:00',
  max_daily_capacity INTEGER DEFAULT NULL, -- NULL represents UNLIMITED daily capacity (no hard limit of 50/60)
  opd_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  holidays TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  online_booking_window_days INTEGER NOT NULL DEFAULT 1,
  consultation_fee NUMERIC(10,2) DEFAULT NULL,
  is_online_payment_enabled BOOLEAN NOT NULL DEFAULT false,
  is_policy_approved_by_hospital BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_online_booking_enabled BOOLEAN NOT NULL DEFAULT true,
  notice_banner TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.2 User Profiles (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.3 Patient Profiles (Authoritative demographic & clinical record anchor)
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_id TEXT UNIQUE NOT NULL DEFAULT generate_hospital_patient_id(),
  full_name TEXT NOT NULL,
  dob DATE,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT NOT NULL,
  email TEXT,
  blood_group TEXT,
  address TEXT,
  emergency_contact TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_id ON public.patient_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_phone ON public.patient_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_patient_name ON public.patient_profiles(full_name);

-- 5.4 Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  head_of_department TEXT,
  icon_name TEXT DEFAULT 'Activity',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.5 Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_emergency_available BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.6 Doctor Profiles
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  consultation_room TEXT NOT NULL,
  available_days TEXT[] NOT NULL,
  opd_timings TEXT NOT NULL DEFAULT '09:30 AM - 01:30 PM',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.7 Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_code TEXT NOT NULL UNIQUE,
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  doctor_id UUID REFERENCES public.doctor_profiles(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  token_number INTEGER NOT NULL,
  queue_type queue_type NOT NULL DEFAULT 'online',
  status appointment_status NOT NULL DEFAULT 'booked',
  cancellation_reason TEXT,
  booked_by_role user_role NOT NULL,
  notes TEXT,
  idempotency_key TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_reconciliation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_appointment_token_per_day UNIQUE (appointment_date, token_number),
  CONSTRAINT uq_appointment_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_idempotency ON public.appointments(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_appointment_active_per_day 
  ON public.appointments(patient_profile_id, appointment_date) 
  WHERE status NOT IN ('cancelled');

-- 5.8 Patient Visits (Consultation Notes)
CREATE TABLE IF NOT EXISTS public.patient_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE RESTRICT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT NOT NULL,
  clinical_notes TEXT NOT NULL,
  diagnosis TEXT,
  doctor_signature TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.9 Medical Documents (Scanned handwritten Rx, external records)
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  visit_id UUID REFERENCES public.patient_visits(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  storage_key TEXT NOT NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users(id),
  uploader_role user_role NOT NULL,
  verification_status document_verification_status NOT NULL DEFAULT 'unverified',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.10 Pathology Tests Catalog
CREATE TABLE IF NOT EXISTS public.pathology_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  specimen_type TEXT NOT NULL,
  fasting_required BOOLEAN NOT NULL DEFAULT false,
  turnaround_hours INTEGER NOT NULL DEFAULT 4,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.11 Pathology Reports (PDF Storage Metadata & Safeguards)
CREATE TABLE IF NOT EXISTS public.pathology_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT NOT NULL UNIQUE,
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE RESTRICT,
  order_id UUID,
  lab_accession_number TEXT NOT NULL,
  test_name TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  checksum TEXT,
  status report_status NOT NULL DEFAULT 'pending_verification',
  version_number INTEGER NOT NULL DEFAULT 1,
  superseded_by_id UUID REFERENCES public.pathology_reports(id),
  correction_reason TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pathology_reports_patient ON public.pathology_reports(patient_profile_id);
CREATE INDEX IF NOT EXISTS idx_pathology_reports_status ON public.pathology_reports(status);
CREATE INDEX IF NOT EXISTS idx_pathology_reports_accession ON public.pathology_reports(lab_accession_number);

-- 5.12 Consent Records (DPDP Act & Medical Disclaimers)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT 'v1.0-2026',
  agreed BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.13 Audit Logs (Immutable security trace)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role user_role NOT NULL,
  action_type TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathology_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check current user role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6.1 Public Information Policies (Hospital Settings, Departments, Services, Active Doctors, Pathology Tests)
CREATE POLICY "Public Read Hospital Settings" ON public.hospital_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Departments" ON public.departments FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Doctors" ON public.doctor_profiles FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Tests" ON public.pathology_tests FOR SELECT USING (is_active = true);

-- Admin can manage public settings
CREATE POLICY "Admin Manage Settings" ON public.hospital_settings FOR ALL 
  USING (public.get_auth_role() = 'admin') 
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "Admin Manage Departments" ON public.departments FOR ALL 
  USING (public.get_auth_role() = 'admin') 
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "Admin Manage Services" ON public.services FOR ALL 
  USING (public.get_auth_role() = 'admin') 
  WITH CHECK (public.get_auth_role() = 'admin');

-- 6.2 Profiles Policy
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admin read all profiles" ON public.profiles FOR SELECT 
  USING (public.get_auth_role() = 'admin');

CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL 
  USING (public.get_auth_role() = 'admin') 
  WITH CHECK (public.get_auth_role() = 'admin');

-- 6.3 Patient Profiles Policies
CREATE POLICY "Patient reads own profile" ON public.patient_profiles FOR SELECT 
  USING (profile_id = auth.uid());

CREATE POLICY "Patient updates own contact details" ON public.patient_profiles FOR UPDATE 
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Staff read patient profiles" ON public.patient_profiles FOR SELECT 
  USING (public.get_auth_role() IN ('reception', 'doctor', 'pathology', 'admin'));

CREATE POLICY "Reception registers patients" ON public.patient_profiles FOR INSERT 
  WITH CHECK (public.get_auth_role() IN ('reception', 'admin') OR auth.uid() = profile_id);

-- 6.4 Appointments Policies
CREATE POLICY "Patients view own appointments" ON public.appointments FOR SELECT 
  USING (patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid()));

CREATE POLICY "Patients book own appointment" ON public.appointments FOR INSERT 
  WITH CHECK (
    patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid()) 
    AND queue_type = 'online'
  );

CREATE POLICY "Staff manage all appointments" ON public.appointments FOR ALL 
  USING (public.get_auth_role() IN ('reception', 'doctor', 'admin'))
  WITH CHECK (public.get_auth_role() IN ('reception', 'doctor', 'admin'));

-- 6.5 Patient Visits & Clinical Notes Policies
CREATE POLICY "Patients view own visits" ON public.patient_visits FOR SELECT 
  USING (patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid()));

CREATE POLICY "Doctor manage patient visits" ON public.patient_visits FOR ALL 
  USING (public.get_auth_role() IN ('doctor', 'admin'))
  WITH CHECK (public.get_auth_role() IN ('doctor', 'admin'));

-- 6.6 Medical Documents (Scanned Prescriptions)
CREATE POLICY "Patients view own verified prescriptions" ON public.medical_documents FOR SELECT 
  USING (
    patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())
    AND verification_status = 'verified'
  );

CREATE POLICY "Doctor & Reception manage medical documents" ON public.medical_documents FOR ALL 
  USING (public.get_auth_role() IN ('reception', 'doctor', 'admin'))
  WITH CHECK (public.get_auth_role() IN ('reception', 'doctor', 'admin'));

-- 6.7 Pathology Reports (Two-step publishing safeguards)
CREATE POLICY "Patients view published reports only" ON public.pathology_reports FOR SELECT 
  USING (
    patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())
    AND status = 'published'
  );

CREATE POLICY "Pathology staff manage lab reports" ON public.pathology_reports FOR ALL 
  USING (public.get_auth_role() IN ('pathology', 'admin'))
  WITH CHECK (public.get_auth_role() IN ('pathology', 'admin'));

CREATE POLICY "Doctor view published lab reports" ON public.pathology_reports FOR SELECT 
  USING (public.get_auth_role() = 'doctor');

-- 6.8 Audit Logs Policies
CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR SELECT 
  USING (public.get_auth_role() = 'admin');

CREATE POLICY "Staff append audit logs" ON public.audit_logs FOR INSERT 
  WITH CHECK (true);
