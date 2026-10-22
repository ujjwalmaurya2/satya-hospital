# Satya Hospital & Pathology — Supabase Integration & Database Guide

This document outlines the architecture, setup process, and security policies for integrating Satya Hospital & Pathology with Supabase PostgreSQL and Authentication.

---

## 1. Environment Configuration

The application reads public client parameters from `.env` using Vite's `VITE_` prefix convention:

```bash
# Public Supabase URL
VITE_SUPABASE_URL=https://rkwbzkxkksdyhxoqpmhg.supabase.co

# Public Publishable / Anon Key (Safe for browser delivery)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!CAUTION]
> **Secret Isolation Guard**:
> Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` in `.env` with a `VITE_` prefix. The codebase includes automated static guards in `src/lib/payments.ts` that will flag any accidental frontend exposure.

---

## 2. Database Migrations

Two SQL migrations are prepared in `supabase/migrations/`:

### Migration 1: Core Hospital Schema
**File**: [`supabase/migrations/20261022000001_satya_hospital_schema.sql`](file:///C:/Users/ujjwa/.gemini/antigravity/scratch/satya-hospital/supabase/migrations/20261022000001_satya_hospital_schema.sql)
- **Daily OPD Token Allocation**: Table `daily_opd_token_counters` and concurrency-safe function `allocate_daily_opd_token(appointment_date)`.
- **Hospital Settings**: Configurable operating hours, same-day 09:00 AM cutoff, and unlimited capacity (`max_daily_capacity = NULL`).
- **Demographic & Auth Profiles**: `profiles` (linked to `auth.users`) and `patient_profiles` (with immutable `SH-YYYY-XXXXX` identifier).
- **Appointments Table**: Unique constraint `uq_appointment_token_per_day` on `(appointment_date, token_number)` to prevent race conditions or duplicate token issues.
- **Pathology & Clinical**: `pathology_tests`, `pathology_reports` with two-step pathologist sign-off requirement.
- **Security & RLS**: 13 tables protected with strict Row Level Security (RLS) policies.

### Migration 2: Testimonials & Gallery
**File**: [`supabase/migrations/20261023000002_gallery_and_testimonials.sql`](file:///C:/Users/ujjwa/.gemini/antigravity/scratch/satya-hospital/supabase/migrations/20261023000002_gallery_and_testimonials.sql)
- **Testimonials**: `public.testimonials` with approved status flag, RLS policies (public read approved, admin manage).
- **Gallery Items**: `public.gallery_items` with category filtering, facility rooms, equipment arrays, and public read RLS.

---

## 3. How to Execute Migrations

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`rkwbzkxkksdyhxoqpmhg`).
3. Navigate to **SQL Editor** in the left sidebar.
4. Copy the entire contents of `20261022000001_satya_hospital_schema.sql` and click **Run**.
5. Copy the contents of `20261023000002_gallery_and_testimonials.sql` and click **Run**.
6. The application's live health checker (`Admin Dashboard` &rarr; `System Readiness`) will immediately detect the initialized tables.

---

## 4. Fallback Architecture

If Supabase is offline or if migrations have not yet been executed:
- The frontend **never crashes** or displays raw database errors (`PGRST205`).
- The service layer (`src/services/supabaseService.ts`) transparently falls back to persistent local storage and verified clinical datasets.
- Appointments, queues, and reports remain 100% operational in demonstration mode.
