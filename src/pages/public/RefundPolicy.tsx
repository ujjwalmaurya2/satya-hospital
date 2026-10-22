import React from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useHospital } from '../../context/HospitalContext';

export const RefundPolicy: React.FC = () => {
  const { settings } = useHospital();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <CreditCard className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Billing &amp; Financial Governance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#243447]">
          Fee, Billing &amp; Refund Policy
        </h1>
        <p className="text-xs text-[#667085]">
          Satya Hospital &amp; Pathology &bull; Commercial Policy Guidance
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 text-xs text-[#243447] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">1. OPD Token Registration Fees</h2>
          <p>
            Online reservation of an OPD queue token on this digital platform is currently offered <strong>without mandatory upfront digital payment</strong>. Consultation fees (if applicable for specific clinical procedures or doctor visits) are settled physically at the hospital billing counter upon arrival.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">2. Pathology &amp; Diagnostic Test Fees</h2>
          <p>
            In-house laboratory test charges are billed according to official hospital pricing schedules. Fees for lab tests are payable at the hospital cash/digital counter prior to blood or urine specimen collection.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">3. Refund Conditions for Laboratory Investigations</h2>
          <p>
            In the event that an investigation is cancelled before the clinical sample is collected, a 100% refund or credit note is issued upon presenting the original receipt at the accounts desk. Once a sample has undergone laboratory processing or auto-analyzer execution, fees are non-refundable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">4. Future Payment Gateway Activation Note</h2>
          <p>
            If online payment collection (via Razorpay or UPI) is enabled in future software versions by hospital management, verified server-side webhook reconciliation will be enforced, and refunds will be processed back to the original source method within 5-7 banking business days.
          </p>
        </section>
      </Card>
    </div>
  );
};
