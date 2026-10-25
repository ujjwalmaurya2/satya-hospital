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

### Contact enquiries migration (`/contact`)
Run **after** the master file. Paste `migrations/20261024000004_contact_enquiries.sql` into the SQL Editor, or:
```bash
node supabase/apply_master_migration.cjs "<YOUR_DATABASE_PASSWORD>" migrations/20261024000004_contact_enquiries.sql
```
It adds:
- A `contact_enquiries` table (`name`, `phone`, optional `email`, `topic`, `message`, `status` = `new` / `contacted` / `closed`, `handled_by`, `handled_at`, `created_at`) with length and format CHECKs (10-digit Indian mobile, message up to 2,000 characters).
- RLS: `anon` and `authenticated` may only **INSERT**. Only `reception` / `admin` (via `get_auth_role()`) may **SELECT** and **UPDATE**. There is no DELETE policy — enquiries are closed, not removed.
- A `BEFORE INSERT` trigger that forces `status = 'new'` and server timestamps, and rejects more than 3 enquiries from one phone number within 10 minutes. A `BEFORE UPDATE` trigger keeps the enquiry text immutable and stamps who changed the status.

The public form calls `supabaseService.submitEnquiry()`. Until this migration is applied, inserts fail and the visitor sees a retryable error; with no Supabase credentials at all, the enquiry is kept in that browser only and the visitor is told to call reception. Reception sees enquiries under **Records & uploads → Enquiries**.

### Roles and staff accounts
Roles live only in `public.profiles.role` and are enforced by RLS and the role-checked RPCs:

| Tier | `role` value | Access |
|------|--------------|--------|
| Super Admin (doctor / owner) | `admin` | Settings, audit log, role management, every desk |
| Staff | `reception`, `doctor`, `pathology` | Their own desk only |
| User | `patient` | Own bookings and records only |

Every new account — including any Google sign-in — is created as `patient`. Google, the email address and user metadata never grant a staff role. Apply `migrations/20261026000005_staff_rbac_hardening.sql` (deactivated accounts lose access immediately, audit rows can't be forged, adds `set_user_role`).

**Give someone staff access**
1. They sign in once on `/staff/login` with **Continue with Google** (or you add them under **Authentication → Users**). They'll see "not authorized" — expected.
2. The Super Admin assigns the role (it's checked, audited, and can't target their own account):
   ```sql
   -- run while signed in as the Super Admin, e.g. supabase.rpc('set_user_role', {...})
   SELECT public.set_user_role('reception@satyahospital.in', 'reception');
   -- revoke: SELECT public.set_user_role('reception@satyahospital.in', 'patient', false);
   ```
   The **first** Super Admin is set once by the developer in the SQL Editor (which runs as the database owner):
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'owner@satyahospital.in';
   ```

Add `/staff/login` (or your origin with `/**`) to **Authentication → URL Configuration → Redirect URLs** so Google returns staff to the portal.

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

---

## Pathology test booking (`/lab-tests`, `/lab-orders`)

Apply `migrations/20261027000006_pathology_orders.sql` (after `20261026000005`). It is separate from OPD: lab orders never create appointments or tokens.

- **Catalogue:** extends `pathology_tests` (`description`, `preparation`, `is_demo`; sample type and turnaround may now be empty until verified) and adds `pathology_packages` + `pathology_package_tests`. The tests from the setup script and the `DEMO-BASIC` package are flagged `is_demo = true` and shown with a **Demo** badge — replace them with the hospital's real tests and prices from **Pathology orders → Catalogue & prices**, then untick Demo.
- **Orders:** `pathology_orders` (order numbers `LAB-YYMMDD-XXXXXX`), `pathology_order_items` (name, price and package contents are snapshotted), `pathology_samples`. Reports reuse `pathology_reports` (new `test_id`, `order_id` now references the order).
- **States are separate:** `status` (pending / confirmed / cancelled), `payment_status` (unpaid / paid / refund_due / refunded / needs_reconciliation), `lab_status` (awaiting_sample → sample_collected → processing → completed).
- **Rules in SQL:** prices only from the catalogue (`lab_price_cart`), duplicate rule `hospital_settings.lab_duplicate_test_rule` (`skip_individual` default, or `reject`), overlapping packages rejected, one order per idempotency key, report verification by a different person than the uploader, patients see released reports only.
- **Permissions:** patients — own orders; reception — orders, walk-ins, confirm, cash/UPI payment, sample collection, cancel; pathology — sample receipt, report upload/verify/release, catalogue; Super Admin (`admin`) — all of that plus marking refunds resolved. Doctors see released reports only (the old policy let them read unverified ones).
- **Report files:** private Supabase Storage bucket `lab-reports` (PDF only, 10 MB), created by the migration. Pathology/Super Admin upload; files open through 2-minute signed URLs, allowed by `can_read_lab_report_file()`. Files are never overwritten — corrections are new versions.
- **Settings:** `lab_online_payment_enabled` (needs `is_policy_approved_by_hospital` too) turns on Razorpay for lab orders; otherwise patients pay at the lab. `lab_home_collection_enabled` stays `false` until the hospital offers home collection.

Deploy the lab payment functions (same Razorpay secrets as OPD; the existing webhook now also confirms lab orders):
```bash
supabase functions deploy lab-create-order
supabase functions deploy lab-verify-payment
supabase functions deploy razorpay-webhook --no-verify-jwt
```
Add `/lab-tests/checkout` (or your origin with `/**`) to **Authentication → Redirect URLs**.

---

## OPD + lab workflow fixes (`20261029000008_opd_lab_workflow_fixes.sql`)

Apply after `20261028000007`. **Deploy the migration before (or together with) the frontend** — the new frontend calls the new `create_lab_order` / `register_lab_report` signatures.

- **OPD:** Reception and Doctor read the same `appointments` rows (Doctor panel now uses the live queue + Realtime). `set_appointment_status` is role-aware: Reception confirms arrival (`checked_in`), no-show, cancel and can call the next patient; only the doctor or Super Admin can `completed`; the doctor can start, complete or send back patients who have arrived. `complete_opd_consultation` saves the visit notes and completes the appointment in one transaction (idempotent). `patient_visits.doctor_id` is now optional; `recorded_by` stores who wrote the note.
- **Reports:** Reception, pathology and Super Admin can upload; pathology/Super Admin verify and release (both idempotent). The file must exist in the `lab-reports` bucket before a report row is created; a staff uploader may delete a file only while it is unregistered (used to clean up a failed save). `hospital_settings.lab_require_independent_verification` (default `false`) — set `true` to require a different person to verify than the one who uploaded.
- **PDF compression:** done in the browser (Web Worker, `@cantoo/pdf-lib`), lossless only; files never leave the hospital's own storage. `pathology_reports.original_file_size` records the size before compression.
- **Home sample collection:** off until the Super Admin saves real values in **Pathology orders → Catalogue & prices → Home sample collection** (service pincodes, time slots, visit fee, optional per-slot capacity, booking window). Visits are offered on OPD days and never on hospital holidays. Address, pincode, slot, date, capacity and fee are validated in `create_lab_order`.
