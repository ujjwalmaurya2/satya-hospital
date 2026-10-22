# Satya Hospital & Pathology — Complete Digital Healthcare Platform

A production-oriented, mobile-first digital healthcare and laboratory management system for Satya Hospital.

---

## 1. System Architecture & Features

### A. Public Hospital Website
- **Modern Responsive Design**: Accessible palette sampling Medical Blue (`#3DA9DF`), Lime Green (`#91BB40`), Dark Navy (`#243447`), Soft Canvas (`#F4F8FA`), and Border Grey (`#E1E8ED`).
- **Core Public Routes**:
  - `/` — Homepage (Hero, live OPD cutoff banner, clinical pillars, department preview, test highlights, location & timings).
  - `/about` — Hospital mission, clinical standards, infrastructure, and ethical healthcare pledge.
  - `/services` & `/departments` — Outpatient clinical departments and consulting services.
  - `/doctors` — Verified consultant physician and surgeon directory with OPD rooms and timings.
  - `/pathology` — In-house diagnostic lab catalogue (CBC, LFT, KFT, Lipid, HbA1c, Thyroid) with specimen guidelines and pricing.
  - `/contact` — Hospital desk contacts, 24x7 emergency desk, accessible inquiry form.
  - `/book-appointment` — Online OPD booking engine with automatic token allocation.
  - Legal & Statutory Pages: `/privacy-policy` (DPDP Act 2023 compliant), `/terms-and-conditions`, `/cancellation-policy`, `/refund-policy`, `/accessibility`, `/disclaimer`.

### B. Patient Portal (`/patient/*`)
- **Authentication**: Seamless Google OAuth integration via Supabase Auth + direct immutable Patient ID login fallback.
- **Unique Hospital Patient ID**: Collision-safe identifier formatted as `SH-YYYY-XXXXX`.
- **My Appointments**: Token number, queue tracking, and cancellation prior to cutoff.
- **Pathology Reports**: Two-step verified PDF reports delivered securely through short-lived signed URLs.
- **Prescriptions**: Scanned handwritten doctor prescriptions verified by clinicians.
- **My Profile & Consents**: Demographic details, emergency contacts, statutory DPDP data requests.

### C. Online OPD Booking Engine
- **Strict 09:00 AM IST Cutoff**: Same-day online bookings close automatically at 09:00 AM IST.
- **09:30 AM Clinic Commencement**: Standardised outpatient opening.
- **Shared Capacity Model**: Online reservations and reception walk-in admissions consume one unified daily quota (configurable by Admin).
- **Timezone Awareness**: Strict `Asia/Kolkata` time boundary checks.

### D. Staff Dashboards (`/staff/*`)
- **Reception Desk (`/reception`)**:
  - Live OPD queue and arrival check-in.
  - Walk-in patient registration issuing collision-safe Patient IDs and tokens.
  - Patient directory lookup by Patient ID, Name, or Mobile Number.
  - Scanned prescription uploader attaching documents to visits.
- **Doctor Panel (`/doctor`)**:
  - Assigned outpatient queue with waiting, in-consultation, and completed views.
  - Consultation workflow recording chief complaints, clinical examination notes, and diagnosis.
  - Historical patient visits separated from current consultations.
  - Verification of scanned handwritten prescriptions before release to patient portals.
- **Pathology Laboratory (`/pathology-dashboard`)**:
  - Manual PDF upload with file size (max 10MB) and PDF MIME-type validation.
  - Patient and lab accession number matching.
  - In-browser PDF preview.
  - **Two-Step Safeguard**: Reports start in `pending_verification` and only publish upon certified pathologist sign-off.
  - **Traceable Versioned Corrections**: Erroneous reports are superseded (`V1` &rarr; `V2`) with mandatory audit reason logging.
- **Hospital Super Admin (`/admin`)**:
  - Operational statistics and capacity tracker.
  - Hospital scheduling rules editor (OPD start time, cutoff, capacity ceiling).
  - Staff management and role provisioning.
  - Immutable audit logs explorer.
  - Supabase & Cloudflare R2 integration health monitors.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS v4, React Router v7, Framer Motion, Lucide React.
- **Backend**: Supabase (PostgreSQL 17, Supabase Auth, Storage / Cloudflare R2 boundary, Row Level Security).
- **Testing**: Vitest v3.2 (Unit and Integration test suites).

---

## 3. Database Schema & Row Level Security (RLS)

The database migration is located at:
`supabase/migrations/20261022000001_satya_hospital_schema.sql`

Core entities:
- `profiles` & `patient_profiles` (Immutable sequence-generated `SH-YYYY-XXXXX`)
- `hospital_settings` (Global operational configuration)
- `departments` & `services`
- `doctor_profiles`
- `appointments` (Shared daily token sequence `uq_appointment_token_per_day`)
- `patient_visits` (Doctor consultation records)
- `medical_documents` (Scanned handwritten Rx documents)
- `pathology_tests` & `pathology_reports` (PDF metadata, checksums, versioning)
- `consent_records` & `audit_logs`

Strict RLS policies ensure:
1. Patients can access only their own records and published documents.
2. Reception staff can manage queue registrations but cannot publish clinical lab reports.
3. Pathologists can manage diagnostic orders but cannot modify doctor consultations.
4. Admins govern operational parameters and view immutable audit events.

---

## 4. Verification & Automated Testing

Run the test suite:
```bash
npm test
```

Test coverage includes:
- Collision-safe Patient ID (`SH-YYYY-XXXXX`) and Accession generation.
- 10-digit Indian mobile number validation.
- Asia/Kolkata 09:00 AM online booking cutoff enforcement.
- Document storage validation (10MB limit, PDF MIME verification).
- Patient authorization boundaries (cross-patient access prevention).
- Pathology two-step publication safeguards & versioned superseding.
- Audit logging sanitization (stripping tokens and passwords).

Run production build:
```bash
npm run build
```
Build output verified in `dist/`.
