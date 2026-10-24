import React, { useState } from 'react';
import { Clock, Download, Info, Microscope, Search } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader, Panel, REPORT_BADGE } from '../../components/dashboard/Dashboard';
import { InlineNote, prettyDate, usePatientDocumentOpener } from '../../components/patient/PatientUI';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export const PatientReports: React.FC = () => {
  const { patientProfile } = useAuth();
  const { pathologyReports } = useHospital();
  const docs = usePatientDocumentOpener();
  const [searchQuery, setSearchQuery] = useState('');

  const myReports = pathologyReports.filter(r => r.patientProfileId === patientProfile?.id || r.patientId === patientProfile?.patientId);
  const q = searchQuery.toLowerCase();
  const filtered = myReports.filter(r => r.testName.toLowerCase().includes(q) || r.labAccessionNumber.toLowerCase().includes(q));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab reports"
        description="Pathology reports verified by Satya Hospital pathologists."
        actions={
          <div className="relative w-full sm:w-64">
            <label htmlFor="report-search" className="sr-only">Search reports</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input id="report-search" type="search" placeholder="Test or accession" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="field-control pl-10" />
          </div>
        }
      />

      <InlineNote icon={<Info className="h-4 w-4 text-brand-600" />}>
        Please review results with your doctor. Reference ranges need clinical context to be interpreted correctly.
      </InlineNote>

      {docs.error && <Alert type="error">{docs.error}</Alert>}

      <Panel flush>
        {filtered.length === 0 ? (
          <EmptyState
            title={myReports.length === 0 ? 'No reports yet' : 'No reports match your search'}
            description={
              myReports.length === 0
                ? 'Once your sample is processed and verified by the pathologist, the signed PDF will appear here.'
                : 'Try a different test name or accession number.'
            }
            actionLabel={myReports.length === 0 ? 'View test catalogue' : undefined}
            actionLink="/pathology-lab"
            icon={<Microscope className="h-6 w-6" />}
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(report => {
              const published = report.status === 'published';
              const badge = REPORT_BADGE[report.status];
              return (
                <li key={report.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${
                      published ? 'bg-leaf-50 text-leaf-700 ring-leaf-200/70' : 'bg-ink-50 text-ink-400 ring-line'
                    }`}
                    aria-hidden="true"
                  >
                    <Microscope className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-900">{report.testName}</p>
                      <Badge variant={badge.variant} size="sm" dot>
                        {badge.label}
                      </Badge>
                      {report.versionNumber > 1 && (
                        <Badge variant="neutral" size="sm">
                          Version {report.versionNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-500">
                      {prettyDate(report.reportDate)} · <span className="font-mono text-xs">{report.labAccessionNumber}</span>
                      {report.verifierName ? ` · signed by ${report.verifierName}` : ''}
                    </p>
                    {report.correctionReason && <p className="mt-1.5 text-[13px] text-warning-700">Correction note: {report.correctionReason}</p>}
                  </div>
                  <div className="shrink-0">
                    {published ? (
                      <Button size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => docs.open(report.storageKey)}>
                        Download PDF
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {report.status === 'superseded' ? 'Replaced by a newer version' : 'Being verified'}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};
