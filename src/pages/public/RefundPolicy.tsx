import React from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { PageHero, Section } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';

export const RefundPolicy: React.FC = () => {
  const { settings } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Fee, Billing & Refund Policy' }]}
        eyebrow={'Billing & Financial Governance'}
        title={<>Fee, Billing &amp; Refund Policy</>}
        description={<>Satya Hospital &amp; Pathology &bull; Commercial Policy Guidance</>}
      />
      <Section size="md">
        <div className="mx-auto max-w-3xl space-y-8">

      <div className="legal-prose">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">1. OPD Token Registration Fees</h2>
          <p>
            Online reservation of an OPD queue token on this digital platform is currently offered <strong>without mandatory upfront digital payment</strong>. Consultation fees (if applicable for specific clinical procedures or doctor visits) are settled physically at the hospital billing counter upon arrival.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">2. Pathology &amp; Diagnostic Test Fees</h2>
          <p>
            In-house laboratory test charges are billed according to official hospital pricing schedules. Fees for lab tests are payable at the hospital cash/digital counter prior to blood or urine specimen collection.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">3. Refund Conditions for Laboratory Investigations</h2>
          <p>
            In the event that an investigation is cancelled before the clinical sample is collected, a 100% refund or credit note is issued upon presenting the original receipt at the accounts desk. Once a sample has undergone laboratory processing or auto-analyzer execution, fees are non-refundable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">4. Future Payment Gateway Activation Note</h2>
          <p>
            If online payment collection (via Razorpay or UPI) is enabled in future software versions by hospital management, verified server-side webhook reconciliation will be enforced, and refunds will be processed back to the original source method within 5-7 banking business days.
          </p>
        </section>
      </div>
        </div>
      </Section>
    </>
  );
};
