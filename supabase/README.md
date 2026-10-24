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

## 2. Complete Database Setup (Consolidated Single SQL File)

All 16 tables, functions, token allocation sequences, Row Level Security (RLS) policies, and verified initial seed data have been consolidated into a single self-contained, idempotent file:

👉 **[`supabase/complete_satya_hospital_setup.sql`](file:///C:/Users/ujjwa/.gemini/antigravity/scratch/satya-hospital/supabase/complete_satya_hospital_setup.sql)**

### Tables Created:
1. `hospital_settings`: Global OPD timings, 09:00 AM cutoff, unlimited capacity.
2. `daily_opd_token_counters`: Concurrency-safe atomic token allocator (`allocate_daily_opd_token()`).
3. `profiles`: User accounts linked with Supabase Auth (`auth.users`).
4. `patient_profiles`: Patient records with collision-safe `SH-YYYY-XXXXX` identifier.
5. `departments`: Clinical specialties with slugs and icons.
6. `services`: Detailed medical procedures and offerings.
7. `doctor_profiles`: Medical staff schedules and consultation rooms.
8. `appointments`: Token-guaranteed bookings with composite unique constraints.
9. `patient_visits`: Consultation notes, diagnosis, and clinical entries.
10. `medical_documents`: Prescription and record storage metadata.
11. `pathology_tests`: Lab test catalog with specimen types, turnaround hours, and prices.
12. `pathology_reports`: Two-step pathologist verification and publishing workflow.
13. `consent_records`: DPDP Act 2023 compliance audit records.
14. `audit_logs`: Immutable clinical security trace.
15. `testimonials`: Verified patient reviews with approval flags.
16. `gallery_items`: Clinical facility photos and equipment lists.

---

## 3. How to Apply the Schema to Supabase

You have two instant options:

### Option A: Via Supabase Web Dashboard (Recommended — 30 seconds, no password required)
1. Open your browser and go to:
   **[https://supabase.com/dashboard/project/rkwbzkxkksdyhxoqpmhg/sql/new](https://supabase.com/dashboard/project/rkwbzkxkksdyhxoqpmhg/sql/new)**
2. Open [`supabase/complete_satya_hospital_setup.sql`](file:///C:/Users/ujjwa/.gemini/antigravity/scratch/satya-hospital/supabase/complete_satya_hospital_setup.sql), copy the entire SQL content, and paste it into the SQL Editor.
3. Click the green **Run** button.
4. Go to **Table Editor** in the left menu — all 16 tables will immediately appear populated with initial seed records!

### Option B: Via Terminal / Automated Node Script
If you know your Supabase database password:
```bash
node supabase/apply_master_migration.cjs "<YOUR_DATABASE_PASSWORD>"
```
Or with the full connection string:
```bash
node supabase/apply_master_migration.cjs "postgresql://postgres:<YOUR_DATABASE_PASSWORD>@db.rkwbzkxkksdyhxoqpmhg.supabase.co:5432/postgres"
```

---

## 4. Fallback Architecture

If Supabase is offline or before migrations are run:
- The frontend **never crashes** or displays raw database errors (`PGRST205`).
- The service layer (`src/services/supabaseService.ts`) transparently falls back to persistent local storage and verified clinical datasets.
- Appointments, queues, and reports remain 100% operational in demonstration mode.
