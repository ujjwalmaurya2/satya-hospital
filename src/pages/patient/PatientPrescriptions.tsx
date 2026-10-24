import React from 'react';
import { BadgeCheck, Download, FileText, Info } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader, Panel } from '../../components/dashboard/Dashboard';
import { InlineNote, prettyDate, usePatientDocumentOpener } from '../../components/patient/PatientUI';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export const PatientPrescriptions: React.FC = () => {
  const { patientProfile } = useAuth();
  const { medicalDocuments } = useHospital();
  const docs = usePatientDocumentOpener();

  const myPrescriptions = medicalDocuments.filter(d => d.patientProfileId === patientProfile?.id && d.verificationStatus === 'verified');

  return (
    <div className="space-y-6">
      <PageHeader title="Prescriptions" description="Scans of the prescriptions your doctor wrote during consultation." />

      <InlineNote icon={<Info className="h-4 w-4 text-brand-600" />}>
        Doctors write prescriptions on hospital stationery during your visit. Staff scan each one, and your doctor verifies it before it appears here.
      </InlineNote>

      {docs.error && <Alert type="error">{docs.error}</Alert>}

      <Panel flush>
        {myPrescriptions.length === 0 ? (
          <EmptyState
            title="No prescriptions yet"
            description="Prescriptions from your consultations will appear here once they are scanned and verified."
            icon={<FileText className="h-6 w-6" />}
          />
        ) : (
          <ul className="divide-y divide-line">
            {myPrescriptions.map(doc => (
              <li key={doc.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" aria-hidden="true">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{doc.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
                    <span className="inline-flex items-center gap-1 text-leaf-700">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified by {doc.verifiedBy}
                    </span>
                    <span>{prettyDate(doc.createdAt)}</span>
                  </p>
                  {doc.notes && <p className="mt-1 text-[13px] text-ink-500">{doc.notes}</p>}
                </div>
                <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => docs.open(doc.storageKey)} className="shrink-0">
                  Open scan
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};
