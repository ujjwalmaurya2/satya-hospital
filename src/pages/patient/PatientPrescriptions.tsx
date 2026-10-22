import React from 'react';
import { FileText, Download, CheckCircle2, Clock, Stethoscope, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';

export const PatientPrescriptions: React.FC = () => {
  const { patientProfile } = useAuth();
  const { medicalDocuments, visits } = useHospital();

  const myPrescriptions = medicalDocuments.filter(
    d => d.patientProfileId === patientProfile?.id && d.verificationStatus === 'verified'
  );

  const handleDownload = (storageKey: string, title: string) => {
    const res = getAuthorizedSignedDocumentUrl(
      storageKey, 
      'patient', 
      patientProfile?.patientId, 
      patientProfile?.patientId
    );
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Unable to open prescription scan.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
          Doctor Prescriptions &amp; Clinical Scans
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Access high-resolution scans of your clinician-written prescriptions and clinical recommendations.
        </p>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl text-xs text-[#92400E] flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5">Clinical Prescription Workflow:</strong>
          Our doctors record prescriptions on official hospital stationery during your physical examination. Each document is scanned by hospital staff and verified before becoming downloadable in this portal.
        </div>
      </div>

      <Card>
        <CardBody className="p-0 divide-y divide-[#E1E8ED]">
          {myPrescriptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#667085]">
              No scanned prescriptions found on your account. New consultation records will appear here after physical evaluation.
            </div>
          ) : (
            myPrescriptions.map((doc) => (
              <div key={doc.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="lime-green" size="sm" dot>
                      Doctor Verified
                    </Badge>
                    <h3 className="text-sm font-bold text-[#243447]">{doc.title}</h3>
                  </div>

                  <div className="text-xs text-[#667085] flex flex-wrap items-center gap-2">
                    <span>Uploaded by: <strong className="text-[#243447]">{doc.uploaderName}</strong></span>
                    <span>&bull; Verified by: <strong className="text-[#243447]">{doc.verifiedBy}</strong></span>
                    <span>&bull; Date: {new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>

                  {doc.notes && (
                    <p className="text-[11px] text-[#667085] italic">Staff Note: {doc.notes}</p>
                  )}
                </div>

                <div className="shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownload(doc.storageKey, doc.title)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    View Scanned Rx PDF
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
};
