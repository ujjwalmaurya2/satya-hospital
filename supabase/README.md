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

### Staff Queue Desk migration (`/staff`)
Run **after** the master file. Paste `migrations/20261024000003_staff_queue_desk.sql` into the SQL Editor, or:
```bash
node supabase/apply_master_migration.cjs "<YOUR_DATABASE_PASSWORD>" migrations/20261024000003_staff_queue_desk.sql
```
It adds:
- A `BEFORE INSERT` trigger on `appointments` that always takes `token_number` from `allocate_daily_opd_token()`, so online bookings and walk-ins share one atomic daily sequence. It also enforces the IST window (online booking for a date opens the day before and closes 09:00 AM IST on the day; walk-ins are today-only).
- A `BEFORE UPDATE` trigger validating queue status changes (`booked → checked_in → in_consultation → completed`, `no_show` from any active state, `no_show → checked_in`).
- RPCs used by the desk: `register_walk_in`, `call_next_token` (row-locked, so two desks never call the same patient), `set_appointment_status`, `record_consultation_fee` (₹500, Cash / UPI). All require role `reception` or `admin`.
- RLS on `daily_opd_token_counters`, and removes direct client access to the allocator.
- A trigger that creates a `profiles` row (role `patient`) for every new auth user, and adds `appointments` to Realtime.

### Provisioning a reception / admin account
1. **Authentication → Users → Add user**: enter the staff email, set a password (or leave blank and use the magic-link tab on `/staff/login`).
2. Promote the profile in the SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'reception', full_name = 'Priya Srivastava'
   WHERE email = 'reception@satyahospital.in';
   ```
   Use `role = 'admin'` for administrators. Set `is_active = false` to revoke access.

Magic links are sent with `shouldCreateUser: false`, so unknown emails cannot self-register. Add your site URL (e.g. `http://localhost:5173`) under **Authentication → URL Configuration → Redirect URLs**.

---

## 4. Fallback Architecture

If Supabase is offline or before migrations are run:
- The frontend **never crashes** or displays raw database errors (`PGRST205`).
- The service layer (`src/services/supabaseService.ts`) transparently falls back to persistent local storage and verified clinical datasets.
- Appointments, queues, and reports remain 100% operational in demonstration mode.

---

## Online OPD booking & Razorpay payments

Migration: `migrations/20261025000004_opd_online_booking_payments.sql` (apply after `20261024000003_staff_queue_desk.sql`).

```bash
node supabase/apply_master_migration.cjs "<YOUR_DATABASE_PASSWORD>" migrations/20261025000004_opd_online_booking_payments.sql
```

### What it changes
- **Booking window:** online booking is open for any eligible OPD date up to `hospital_settings.max_advance_booking_days` ahead (new column, default **30** — adjust to the hospital's policy). `online_booking_window_days` is no longer used.
- **Cutoff:** same-day online booking closes at `online_cutoff_time` (09:00) Asia/Kolkata, checked by `public.opd_booking_eligibility()` on the database clock. Closed weekdays come from `opd_days`, holidays from `holidays`.
- **New tables:** `opd_payment_orders` (one row per online booking attempt; RLS: patients see their own, reception/admin see all, writes only via functions) and `razorpay_webhook_events` (webhook idempotency, service role only).
- **New appointment columns:** `booking_reference`, `contact_phone`, `visit_reason`, `payment_provider`, `payment_reference`, `amount_paid`, `paid_at`.
- **`patient_profiles.gender` is now optional.**
- **Patients can no longer INSERT into `appointments` directly** (policy "Patients book own appointment" dropped). Online bookings go through `prepare_opd_payment` → payment → `confirm_opd_payment`, or `book_opd_pay_at_reception` while online payment is off.
- `record_consultation_fee` refuses to change an appointment that was paid online.

### Payment modes
| `hospital_settings` | Online booking behaviour |
| --- | --- |
| `is_online_payment_enabled` AND `is_policy_approved_by_hospital` AND `consultation_fee > 0` | Patient pays the fee online; the token is issued only after the payment is verified. |
| anything else (current state) | Patient books online and pays at reception (`payment_status = 'pay_at_reception'`). |

The amount charged is always `consultation_fee` from the database — the browser never sends a price.

### Edge Functions
| Function | Auth | Purpose |
| --- | --- | --- |
| `opd-create-order` | patient JWT | Validates the booking in SQL, creates/reuses the Razorpay order for the DB amount. |
| `opd-verify-payment` | patient JWT | Verifies the Checkout signature, fetches the payment from Razorpay (captures if only authorized), confirms the booking. |
| `razorpay-webhook` | Razorpay signature (no JWT) | Confirms bookings whose browser callback never arrived; records failures. |

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=xxx
# optional: restrict CORS to the site origin
supabase secrets set ALLOWED_ORIGIN=https://your-site.example
supabase functions deploy opd-create-order
supabase functions deploy opd-verify-payment
supabase functions deploy razorpay-webhook --no-verify-jwt
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically. **Never** put the Razorpay key secret or webhook secret in a `VITE_` variable.

In the Razorpay dashboard → Webhooks, point to `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook` with events `payment.captured`, `order.paid`, `payment.failed`, and the same webhook secret.

### Google sign-in
Booking requires a patient session from Supabase Google OAuth. Add your site's `/book-appointment` URL (or the origin with `/**`) to **Authentication → URL Configuration → Redirect URLs** so the patient returns to the booking form after signing in.

### Reconciliation (payments that can't be confirmed)
A verified payment is never discarded. If it arrives after the booking closed (e.g. paid at 09:01 for today), for the wrong amount, or for a patient who already holds a token that day, the row becomes `needs_reconciliation` and appears in the **Online payments needing attention** panel on the reception queue desk (live updates). Steps:
1. Contact the patient (name, phone and booking reference are shown).
2. Either refund in the Razorpay dashboard, or arrange the appointment manually.
3. An **administrator** clicks *Record resolution* (refunded / handled another way) with a note. Reception can view these cases but cannot settle them or mark anything as paid.

### Before going live (checklist)
- [ ] Hospital confirms the OPD consultation fee → set `consultation_fee`.
- [ ] Fee and refund/cancellation policy approved → set `is_policy_approved_by_hospital = true`.
- [ ] Razorpay **test** keys + webhook configured, end-to-end test payment done.
- [ ] Switch to live keys, then set `is_online_payment_enabled = true`.
- [ ] Confirm `max_advance_booking_days`, `opd_days` and `holidays` reflect the real schedule.
