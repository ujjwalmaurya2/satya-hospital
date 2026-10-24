# Satya Hospital & Pathology — Project Context & Handoff Specification

> **Target Audience**: AI Assistant (Claude / Claude Code) & Engineering Team  
> **Repository**: [https://github.com/ujjwalmaurya2/satya-hospital.git](https://github.com/ujjwalmaurya2/satya-hospital.git)  
> **Last Synchronized**: October 2026 (main branch up to date)  
> **Active Dev Server**: `http://localhost:5173/`

---

## 1. Executive Summary & Hospital Identity

**Satya Hospital & Pathology** is an established healthcare facility located in **Civil Lines, Prayagraj (Uttar Pradesh, India)**.

### Primary Healthcare Focus
- **Pediatric & Childcare Excellence**: Outpatient child consultations, newborn & infant wellness monitoring (0–12 months), developmental milestone tracking, and certified vaccination rosters.
- **In-House Certified Pathology Laboratory**: On-premises automated hematology, biochemistry, and serology with dedicated pediatric micro-sampling and two-step sign-off by a qualified **MD Pathologist**.
- **Transparent Queue System**: A fair, shared single-queue token system where both online reservations (T-1 day pre-registration, closing strictly at **09:00 AM IST**) and offline walk-ins share sequential numbers starting at **09:30 AM IST**.

---

## 2. Design System & Strict Brand Guardrails

### Approved Color Palette
```css
--teal-primary:    #3DA9DF; /* Trust Medical Teal */
--teal-hover:      #2A92C5;
--mint-accent:     #91BB40; /* Pediatric Life & Wellness Green */
--mint-soft:       #F3F8EC; /* Soft Mint Card Background */
--slate-navy:      #193247; /* Primary Headline & High-Contrast Typography */
--slate-muted:     #647785; /* Body Paragraph & Supporting Text */
--warm-white:      #FCFDFB; /* Hospital Campus Page Canvas */
--ice-blue:        #EBF6FC; /* Light Blue Card & Badge Background */
--border-subtle:   #E5ECEF; /* Clean Healthcare Separation Borders */
--border-accent:   #D5E8BA; /* Mint Border Accent */
```

### ⚠️ Non-Negotiable Core Mandates (DO NOT VIOLATE)
1. **ZERO ROLLING NUMBERS**:
   - **Numbers across the entire website MUST REMAIN STATIC TYPOGRAPHY**.
   - **Never** implement count-up odometers, animated ticker counters, or rolling statistical digits anywhere on the site (e.g. test prices `₹350`, token queue `09:30 AM`, doctor counts, milestones must remain standard readable plain text).
2. **Authentic Healthcare Photography**:
   - Never replace the authentic photos with cartoon illustrations or generic AI toy imagery.
   - Real hospital building photograph: `/images/satya-hospital-building.jpg`
   - Real doctor examination photo: `/images/pediatrician-examining-infant.jpg`
3. **Accessibility & Motion Discipline**:
   - All animations must respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()`.
   - Motion must feel clinical, calm, and reassuring—never gamey, bouncy, or distracting.

---

## 3. Technology Stack & Key Dependencies

- **Runtime & Build**: Node.js, Vite 8, TypeScript 5.7 (strict mode enabled).
- **Frontend Framework**: React 19.2 (`react`, `react-dom`, `react-router-dom` v7).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Design Tokens (`src/styles/tokens.css`).
- **Icons**: Lucide React (`lucide-react`).
- **Motion & Micro-interactions**:
  - Framer Motion 12 (`src/components/motion/`: `ScrollReveal`, `StaggerContainer`, `StaggerItem`, `ImageReveal`, `ParallaxLayer`, `PageTransition`).
  - Lottie (`lottie-web`) loaded inside dedicated unmanaged DOM nodes (`src/components/common/LottiePlayer.tsx`) to avoid React 19 reconciliation conflicts.
- **Backend & Database**:
  - **Supabase PostgreSQL** (`https://rkwbzkxkksdyhxoqpmhg.supabase.co`).
  - Client in `src/lib/supabase.ts` with resilience layer in `src/services/supabaseService.ts`.
  - Automatic fallback to verified local/mock data when network is disconnected or during tests.
- **Private Storage**: Cloudflare R2 / S3-compatible private bucket for patient diagnostic lab reports.
- **Testing**: Vitest (`npm test` — 32/32 tests passing across 7 test suites).

---

## 4. Current Architecture & Completed Features

### A. Multi-Page Routes (`react-router-dom` v7)
Every major section has a dedicated URL and route transition wrapper:
- `/` — **Home** (Hero sequence, Trust Strip, 6 Pediatric Services, Doctor Roster, Lab Preview, Parent FAQ).
- `/about` — **About Us** (Hospital history in Prayagraj, clinical ethics, real building photo).
- `/doctors` — **Consultant Specialists** (Verified doctor profiles with qualifications and OPD slots).
- `/services` — **Clinical Services** (Childcare wing, OPD clinics, day-care amenities).
- `/pathology-lab` — **Pathology & Lab** (In-house test catalogue, fasting protocols, prices, 4-step safeguard).
- `/journey` — **Hospital Journey** (Milestone timeline from founding to current digital queue).
- `/facilities` — **Campus Facilities** (Consultation chambers, lab, day-care, stroller/wheelchair access).
- `/gallery` — **Photo Gallery** (Filterable category showcase).
- `/testimonials` — **Parent Reviews** (Verified feedback from local families).
- `/news` — **Hospital Bulletins** (Pediatric health advisories, seasonal fever alerts).
- `/contact` — **Contact & Location** (Civil Lines Prayagraj location, department desks, inquiry form).
- `/book-appointment` — **Online Token Booking** (T-1 daily queue reservation).
- `/pediatric-care` & `/newborn-care` — **Specialized Pediatric Sub-Pages**.

### B. Navigation Bar & Floating Action Widget
- **Desktop Header**: Displays all 10 visible navigation links in exact order with active route indicator pills.
- **Mobile Navigation**: High-contrast, slide-out app drawer with tap targets and no horizontal overflow.
- **Floating Appointment Widget**: Holographic pill anchored at bottom-right with pulsing indicator, live queue timing, and direct modal trigger.

### C. Verified Supabase Integration
- All 11 tables executed and verified via `supabase/complete_satya_hospital_setup.sql`:
  `hospital_settings`, `profiles`, `patient_profiles`, `departments`, `services`, `doctor_profiles`, `appointments`, `pathology_tests`, `pathology_reports`, `testimonials`, `gallery_items`.
- Live queries fetch real hospital settings, doctors, departments, and tests.

---

## 5. What We Are Working On Right Now (Current State)

1. **Local Dev Server**: Actively running at `http://localhost:5173/`.
2. **GitHub Repository**: Synced on branch `main` at `https://github.com/ujjwalmaurya2/satya-hospital.git`.
3. **Current Status**: The **Public UI, Motion System, Multi-Page Architecture, and Supabase Database Foundation are 100% Complete & Passing Tests**.

---

## 6. What Needs to Be Finished Next (Upcoming Roadmap)

Here are the prioritized next epics to continue with Claude:

### Epic 1: Role-Based Portals & Supabase Authentication
1. **Patient Portal (`/portal`)**:
   - Phone OTP / Email Magic Link login via Supabase Auth.
   - View active OPD token with live queue position indicator ("Tokens called: 12 | Your token: 15").
   - Download verified digital pathology reports (PDF).
2. **Staff / Reception Desk (`/staff` or `/admin`)**:
   - Single-queue token management (call next token, mark patient as checked-in/completed/no-show).
   - Offline walk-in registration with auto-increment token assignment.
   - Cash / UPI payment status reconciliation for consultation and lab fees.
3. **Doctor Consultation View (`/doctor-portal`)**:
   - Doctor queue view (current patient details, vitals, allergies).
   - Quick prescription & referral to in-house pathology lab.
4. **Pathologist Sign-Off Desk (`/pathology-portal`)**:
   - Enter test values against standard biological reference intervals.
   - MD Pathologist digital sign-off and approval stamp.

### Epic 2: PDF Report Generation & Cloudflare R2 Private Storage
- Generate tamper-evident PDF pathology reports with:
  - Hospital header, QR code verification link, and pathologist digital signature.
- Store PDF reports in Cloudflare R2 private bucket.
- Generate time-limited signed download URLs (never make patient health records publicly accessible).

### Epic 3: Notification Gateway (SMS / WhatsApp)
- Webhook or Edge Function to notify parents:
  - Immediate booking confirmation with Token Number.
  - Morning reminder at 09:15 AM IST.
  - "3 Patients Ahead" proximity alert so parents do not wait long in physical waiting areas.

---

## 7. Commands & Quick Reference

```bash
# Start development server
npm run dev

# Run full test suite (32 tests)
npm test

# Production build check
npm run build
```
