import React from 'react';
import { AlertTriangle, ShieldAlert, PhoneCall } from 'lucide-react';
import { PageHero, Section } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';

export const Disclaimer: React.FC = () => {
  const { settings } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Medical & Emergency Disclaimer' }]}
        eyebrow={'Statutory Clinical Guidance'}
        title={<>Medical &amp; Emergency Disclaimer</>}
        description={<>Important Patient Information &bull; Satya Hospital &amp; Pathology</>}
      />
      <Section size="md">
        <div className="mx-auto max-w-3xl space-y-8">

      {/* Emergency Notice Card */}
      <div className="bg-danger-50 border border-danger-200 p-6 rounded-2xl text-sm text-danger-700 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-danger-700">
          <ShieldAlert className="w-5 h-5 text-danger-600" />
          <span>CRITICAL NOTICE: NOT FOR MEDICAL EMERGENCIES</span>
        </div>
        <p className="leading-relaxed">
          The Satya Hospital website and online appointment booking engine are designed strictly for routine, elective outpatient appointments and administrative document retrieval. <strong>Do NOT use this website or portal for acute, emergent, or life-threatening symptoms</strong> such as acute chest pain, severe shortness of breath, severe trauma, poisoning, stroke symptoms, or active hemorrhage.
        </p>
        <div className="pt-2 flex items-center gap-3">
          <span className="font-semibold">Immediate Action:</span>
          <span className="text-ink-900 font-bold">Call Emergency Desk: {settings.emergencyPhone}</span>
        </div>
      </div>

      <div className="legal-prose">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">1. General Health Information Only</h2>
          <p>
            The educational content, department descriptions, and laboratory test guidance provided on this website are for general informational purposes only. Nothing on this website constitutes direct medical advice, diagnosis, or treatment recommendations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">2. Doctor-Patient Relationship</h2>
          <p>
            Browsing this digital platform or booking an outpatient token does not, by itself, establish a formal doctor-patient relationship. A formal clinical relationship is established only upon in-person clinical evaluation and examination by our medical consultants at Satya Hospital.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">3. Diagnostic Reports Interpretation</h2>
          <p>
            Laboratory values and pathology test reports must always be reviewed and evaluated in clinical context by an authorized physician. Variations in reference ranges can occur due to age, gender, fasting status, or medication history. Self-medication based on laboratory numbers without clinical consultation is dangerous and strongly discouraged.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">4. Accuracy of Third-Party Information</h2>
          <p>
            While Satya Hospital takes diligent care to ensure that public content, OPD timings, and department schedules are up to date, clinical rosters may change unexpectedly due to medical emergencies or physician unavailability.
          </p>
        </section>
      </div>
        </div>
      </Section>
    </>
  );
};
