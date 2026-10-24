import React from 'react';
import { FileText, AlertCircle, ShieldCheck } from 'lucide-react';
import { PageHero, Section } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';

export const TermsAndConditions: React.FC = () => {
  const { settings } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Terms & Conditions' }]}
        eyebrow={'Patient Agreement & Operational Regulations'}
        title={<>Terms &amp; Conditions</>}
        description={<>Effective Date: October 2026 &bull; Satya Hospital &amp; Pathology</>}
      />
      <Section size="md">
        <div className="mx-auto max-w-3xl space-y-8">

      <div className="legal-prose">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">1. Acceptance of Terms</h2>
          <p>
            By accessing the Satya Hospital platform, booking an outpatient appointment, or logging into the Patient Portal, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, you must refrain from using the digital services and visit our physical hospital reception.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">2. Nature of Outpatient Appointment Tokens</h2>
          <p>
            An online appointment reservation generates a daily outpatient queue token for clinical triage. While we strive to maintain the queue sequence, actual consultation times may vary depending on clinical complexity, patient arrivals, or emergency hospital procedures.
          </p>
          <p>
            Online booking for same-day outpatient consultations strictly closes at <strong>{settings.onlineCutoffTime} AM IST</strong>. Registrations after this hour must be conducted directly at reception as walk-in patients.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">3. Accuracy of Patient Demographics</h2>
          <p>
            Users are solely responsible for ensuring the accuracy of names, ages, and contact phone numbers entered during registration. Inaccurate patient identities may impede clinical treatment or cause administrative delays during check-in.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">4. Diagnostic Pathology Reports</h2>
          <p>
            Diagnostic reports available in the patient portal are formal PDF clinical summaries signed off by certified laboratory personnel. Laboratory findings must be interpreted by a licensed clinician in the context of your overall physical examination and clinical history.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">5. No Direct Tele-Emergency Care</h2>
          <p>
            This website and patient portal are strictly for outpatient scheduling and medical document review. <strong>This platform is NOT equipped to handle acute, life-threatening medical emergencies.</strong> In acute medical emergencies, patients must immediately report to our emergency department or call emergency ambulance services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">6. Governing Law &amp; Jurisdiction</h2>
          <p>
            These terms are governed by the laws of India. Any legal dispute or claim arising from use of our digital platform shall be subject to the exclusive jurisdiction of the competent courts in Prayagraj, Uttar Pradesh.
          </p>
        </section>
      </div>
        </div>
      </Section>
    </>
  );
};
