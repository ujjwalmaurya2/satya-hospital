import React from 'react';
import { ShieldCheck, Lock, FileText, AlertCircle, Building } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useHospital } from '../../context/HospitalContext';

export const PrivacyPolicy: React.FC = () => {
  const { settings } = useHospital();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Title */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Statutory Compliance &bull; DPDP Act 2023</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#243447]">
          Satya Hospital Privacy Policy
        </h1>
        <p className="text-xs text-[#667085]">
          Effective Date: October 2026 &bull; Version 1.0 (Indian Healthcare Data Protection Aligned)
        </p>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl text-xs text-[#92400E] flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5">Notice for Legal &amp; Compliance Review:</strong>
          This document establishes the digital privacy framework for Satya Hospital &amp; Pathology in accordance with India's Digital Personal Data Protection Act (DPDP Act 2023) and applicable medical record confidentiality guidelines. Specific entity registration numbers and nominated Data Protection Officers (DPO) must be reviewed and countersigned prior to public launch.
        </div>
      </div>

      <Card className="p-6 sm:p-8 space-y-8 text-xs text-[#243447] leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">1. Entity Identity &amp; Data Fiduciary</h2>
          <p>
            Satya Hospital (&quot;Hospital&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operating its healthcare facility at {settings.address}, serves as the Data Fiduciary regarding personal and health data processed via this digital platform.
          </p>
          <p>
            For privacy inquiries or grievance redressal, contact our designated Grievance Desk at: <span className="font-semibold">{settings.email}</span>.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">2. Categories of Data Collected</h2>
          <p>We process the minimum necessary information required for safe clinical outpatient consultation and diagnostic pathology reporting:</p>
          <ul className="list-disc pl-5 space-y-1 text-[#667085]">
            <li><strong>Demographic Data:</strong> Patient full name, age/date of birth, sex/gender, residential address, emergency contact details.</li>
            <li><strong>Authentication &amp; Account Identifiers:</strong> Supabase/Google OAuth tokens, internal immutable Hospital Patient ID (<code className="text-[#3DA9DF]">SH-YYYY-XXXXX</code>), registered mobile number.</li>
            <li><strong>Outpatient Appointment Data:</strong> Appointment date, OPD token number, consulting doctor, visit notes, attendance status.</li>
            <li><strong>Clinical &amp; Diagnostic Records:</strong> Scanned handwritten doctor prescriptions, clinician consultation notes, diagnostic pathology orders, and PDF test reports.</li>
            <li><strong>Audit &amp; Security Logs:</strong> Timestamps of record creation, staff role access trails, and verification actions.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">3. Purpose of Processing &amp; Lawful Basis</h2>
          <p>Your data is processed strictly for legitimate healthcare and administrative purposes:</p>
          <ul className="list-disc pl-5 space-y-1 text-[#667085]">
            <li>Scheduling and managing your outpatient consultation tokens.</li>
            <li>Enforcing clinic queue safety rules, including the 09:00 AM online cutoff and maximum daily OPD capacity.</li>
            <li>Delivering certified pathology test reports and scanned handwritten doctor prescriptions to your private patient portal.</li>
            <li>Preventing duplicate medical records and facilitating medical record continuity across historical hospital visits.</li>
            <li>Compliance with statutory medical record retention standards under Indian medical council guidelines.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">4. Role-Based Access Control &amp; Confidentiality</h2>
          <p>
            Satya Hospital enforces strict Row-Level Security (RLS) on all database tables. Staff access is restricted on a strict need-to-know basis:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#667085]">
            <li><strong>Reception Staff:</strong> Permitted to register demographics, assign tokens, and upload scanned prescriptions. Cannot alter doctor findings or publish pathology reports.</li>
            <li><strong>Medical Doctors:</strong> Permitted to review patient clinical history, record consultation summaries, and verify scanned prescriptions.</li>
            <li><strong>Pathology Staff:</strong> Permitted to upload PDF lab reports and mark verification. Reports are inaccessible to patients until certified by an authorised pathologist.</li>
            <li><strong>Patients:</strong> Can access only their own authorised appointments, verified prescriptions, and published pathology reports.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">5. Secure Document Storage (Cloudflare R2 / Supabase)</h2>
          <p>
            All scanned prescription images and PDF pathology reports are stored in private, non-public storage buckets. File access is delivered strictly via temporary, short-lived signed URLs generated only after verifying your authenticated patient session. Medical files are never indexed by web search engines.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">6. Patient Rights under DPDP Act</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 text-[#667085]">
            <li>Access a summary of your personal data and health records maintained by Satya Hospital.</li>
            <li>Request corrections to inaccurate demographic information (e.g. phone number or address).</li>
            <li>Nominate a representative in the event of incapacity.</li>
            <li>Lodge a grievance with our Grievance Officer at <span className="font-semibold">{settings.email}</span>.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">7. Policy Updates &amp; Notifications</h2>
          <p>
            Satya Hospital may periodically update this policy to align with regulatory amendments. Material changes will be highlighted via our website and patient dashboard.
          </p>
        </section>
      </Card>
    </div>
  );
};
