import React from 'react';
import { AlertTriangle, ShieldAlert, PhoneCall } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useHospital } from '../../context/HospitalContext';

export const Disclaimer: React.FC = () => {
  const { settings } = useHospital();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF2F2] text-[#991B1B] text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>Statutory Clinical Guidance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#243447]">
          Medical &amp; Emergency Disclaimer
        </h1>
        <p className="text-xs text-[#667085]">
          Important Patient Information &bull; Satya Hospital &amp; Pathology
        </p>
      </div>

      {/* Emergency Notice Card */}
      <div className="bg-[#FEF2F2] border border-[#FECACA] p-6 rounded-2xl text-xs text-[#991B1B] space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#7F1D1D]">
          <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
          <span>CRITICAL NOTICE: NOT FOR MEDICAL EMERGENCIES</span>
        </div>
        <p className="leading-relaxed">
          The Satya Hospital website and online appointment booking engine are designed strictly for routine, elective outpatient appointments and administrative document retrieval. <strong>Do NOT use this website or portal for acute, emergent, or life-threatening symptoms</strong> such as acute chest pain, severe shortness of breath, severe trauma, poisoning, stroke symptoms, or active hemorrhage.
        </p>
        <div className="pt-2 flex items-center gap-3">
          <span className="font-semibold">Immediate Action:</span>
          <span className="text-[#243447] font-bold">Call Emergency Desk: {settings.emergencyPhone}</span>
        </div>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 text-xs text-[#243447] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">1. General Health Information Only</h2>
          <p>
            The educational content, department descriptions, and laboratory test guidance provided on this website are for general informational purposes only. Nothing on this website constitutes direct medical advice, diagnosis, or treatment recommendations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">2. Doctor-Patient Relationship</h2>
          <p>
            Browsing this digital platform or booking an outpatient token does not, by itself, establish a formal doctor-patient relationship. A formal clinical relationship is established only upon in-person clinical evaluation and examination by our medical consultants at Satya Hospital.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">3. Diagnostic Reports Interpretation</h2>
          <p>
            Laboratory values and pathology test reports must always be reviewed and evaluated in clinical context by an authorized physician. Variations in reference ranges can occur due to age, gender, fasting status, or medication history. Self-medication based on laboratory numbers without clinical consultation is dangerous and strongly discouraged.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">4. Accuracy of Third-Party Information</h2>
          <p>
            While Satya Hospital takes diligent care to ensure that public content, OPD timings, and department schedules are up to date, clinical rosters may change unexpectedly due to medical emergencies or physician unavailability.
          </p>
        </section>
      </Card>
    </div>
  );
};
