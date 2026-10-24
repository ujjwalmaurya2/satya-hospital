import React, { useState } from 'react';
import { CheckCircle2, Clock, Eye, FileCheck2, History, RotateCcw, Search, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { FileDrop } from '../../components/common/FileDrop';
import { PageHeader, Panel, REPORT_BADGE, Segmented, StatCard } from '../../components/dashboard/Dashboard';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { uploadDocumentToSecureStorage, getAuthorizedSignedDocumentUrl } from '../../lib/storage';
import { generateAccessionNumber, getHospitalTodayDate } from '../../lib/tokens';
import { cn } from '../../lib/cn';
import { PathologyReport } from '../../types';

type StatusFilter = 'all' | 'pending_verification' | 'published' | 'superseded';

export const PathologyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { pathologyReports, pathologyTests, patientProfiles, uploadPathologyReport, verifyAndPublishPathologyReport, supersedePathologyReport, searchPatients } =
    useHospital();

  const today = getHospitalTodayDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestName, setSelectedTestName] = useState(pathologyTests[0]?.name || 'Complete Blood Count (CBC)');
  const [customAccession, setCustomAccession] = useState(() => generateAccessionNumber(Date.now() % 1000));
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Correction / supersede modal
  const [supersedeModalReport, setSupersedeModalReport] = useState<PathologyReport | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctedFile, setCorrectedFile] = useState<File | null>(null);
  const [supersedeError, setSupersedeError] = useState<string | null>(null);

  const q = searchQuery.toLowerCase();
  const filteredReports = pathologyReports.filter(r => {
    const matchesSearch =
      r.patientName.toLowerCase().includes(q) || r.patientId.toLowerCase().includes(q) || r.labAccessionNumber.toLowerCase().includes(q) || r.testName.toLowerCase().includes(q);
    return matchesSearch && (statusFilter === 'all' || r.status === statusFilter);
  });
  const count = (s: StatusFilter) => (s === 'all' ? pathologyReports.length : pathologyReports.filter(r => r.status === s).length);

  const matchingPatients = searchPatients(patientSearch);

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!selectedPatientId) return setUploadError('Select the matching patient record first.');
    if (!reportFile) return setUploadError('Choose the report PDF.');

    const patient = patientProfiles.find(p => p.patientId === selectedPatientId);
    if (!patient) return setUploadError('Patient not found in hospital records.');

    setIsUploading(true);
    try {
      const uploadRes = await uploadDocumentToSecureStorage(reportFile, 'reports', patient.patientId);
      if (!uploadRes.success || !uploadRes.storageKey) {
        setUploadError(uploadRes.error || 'Could not store the report. Please try again.');
        return;
      }
      uploadPathologyReport({
        patientProfileId: patient.id,
        patientId: patient.patientId,
        patientName: patient.fullName,
        labAccessionNumber: customAccession,
        testName: selectedTestName,
        reportDate: today,
        storageKey: uploadRes.storageKey,
        fileName: uploadRes.fileName || reportFile.name,
        fileSize: uploadRes.fileSize || reportFile.size,
        checksum: uploadRes.checksum,
        status: 'pending_verification', // Two-step safety guard
        versionNumber: 1,
        uploadedBy: user?.id || 'pathology',
        uploaderName: user?.fullName || 'Pathologist Staff',
        uploadedAt: new Date().toISOString(),
      });
      setUploadModalOpen(false);
      setReportFile(null);
      setSelectedPatientId('');
      setPatientSearch('');
      setCustomAccession(generateAccessionNumber((Date.now() + 1) % 1000));
      setActionSuccess(`Report for ${patient.fullName} saved and waiting for verification.`);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Unknown upload error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyAndPublish = (report: PathologyReport) => {
    setActionError(null);
    setActionSuccess(null);
    const success = verifyAndPublishPathologyReport(report.id, user?.fullName || 'Senior Pathologist');
    if (success) setActionSuccess(`${report.testName} for ${report.patientName} is now published to the patient portal.`);
    else setActionError('Unable to publish this report. Check that it is linked to a valid patient.');
  };

  const handleSupersedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupersedeError(null);
    if (!supersedeModalReport || !correctedFile || !correctionReason.trim()) {
      setSupersedeError('Add a correction reason and the corrected PDF.');
      return;
    }
    setIsUploading(true);
    try {
      const uploadRes = await uploadDocumentToSecureStorage(correctedFile, 'reports', supersedeModalReport.patientId);
      if (!uploadRes.success || !uploadRes.storageKey) {
        setSupersedeError(uploadRes.error || 'Failed to upload the corrected report. Please try again.');
        return;
      }
      supersedePathologyReport(supersedeModalReport.id, correctionReason.trim(), {
        storageKey: uploadRes.storageKey,
        fileName: uploadRes.fileName || correctedFile.name,
        fileSize: uploadRes.fileSize || correctedFile.size,
        checksum: uploadRes.checksum,
      });
      setActionSuccess(`Version ${supersedeModalReport.versionNumber + 1} created for ${supersedeModalReport.patientName}.`);
      setSupersedeModalReport(null);
      setCorrectionReason('');
      setCorrectedFile(null);
    } catch {
      setSupersedeError('Failed to supersede the report. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewPdf = (storageKey: string) => {
    setActionError(null);
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'pathology');
    if (res.success && res.url) window.open(res.url, '_blank', 'noopener');
    else setActionError(res.error || 'Unable to open the PDF preview.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pathology laboratory"
        title="Report worklist"
        description="Upload PDFs, match patients, verify and publish — with full version history."
        actions={
          <Button onClick={() => setUploadModalOpen(true)} leftIcon={<Upload className="h-4 w-4" />}>
            Upload report
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="All reports" value={pathologyReports.length} hint="Including earlier versions" icon={<FileCheck2 className="h-4 w-4" />} />
        <StatCard label="Awaiting verification" value={count('pending_verification')} hint="Needs pathologist sign-off" tone="warning" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Published" value={count('published')} hint="Visible in patient portal" tone="leaf" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Superseded" value={count('superseded')} hint="Kept in audit history" icon={<History className="h-4 w-4" />} />
      </div>

      {actionError && <Alert type="error">{actionError}</Alert>}
      {actionSuccess && <Alert type="success">{actionSuccess}</Alert>}

      <Panel
        flush
        title="Reports"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Segmented
              label="Filter by status"
              layoutId="lab-filter"
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                { id: 'all', label: 'All', count: count('all') },
                { id: 'pending_verification', label: 'Pending', count: count('pending_verification') },
                { id: 'published', label: 'Published', count: count('published') },
                { id: 'superseded', label: 'Superseded', count: count('superseded') },
              ]}
            />
            <div className="relative sm:w-60">
              <label htmlFor="lab-search" className="sr-only">Search reports</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                id="lab-search"
                type="search"
                placeholder="Patient, accession, test"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="field-control h-9 py-0 pl-9 text-[13px]"
              />
            </div>
          </div>
        }
      >
        {filteredReports.length === 0 ? (
          <EmptyState
            title="No reports match"
            description={pathologyReports.length === 0 ? 'Uploaded reports will appear here.' : 'Try a different search or status filter.'}
            icon={<FileCheck2 className="h-6 w-6" />}
          />
        ) : (
          <ul className="divide-y divide-line">
            {filteredReports.map(item => {
              const badge = REPORT_BADGE[item.status];
              const pending = item.status === 'pending_verification';
              return (
                <li key={item.id} className={cn('grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[1.1fr_1.2fr_1fr_auto] lg:items-center lg:gap-6', pending && 'bg-warning-50/40')}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{item.patientName}</p>
                    <p className="font-mono text-xs text-brand-700">{item.patientId}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{item.testName}</p>
                    <p className="font-mono text-xs text-ink-500">
                      {item.labAccessionNumber} · {item.reportCode}
                      {item.versionNumber > 1 ? ` · v${item.versionNumber}` : ''} · {item.reportDate}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={badge.variant} size="sm" dot>
                      {badge.label}
                    </Badge>
                    {item.verifierName ? (
                      <span className="inline-flex items-center gap-1 text-xs text-leaf-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {item.verifierName}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-400">Not yet signed off</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />} onClick={() => handlePreviewPdf(item.storageKey)}>
                      Preview
                    </Button>
                    {pending && (
                      <Button variant="accent" size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => handleVerifyAndPublish(item)}>
                        Verify & publish
                      </Button>
                    )}
                    {item.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                        onClick={() => {
                          setSupersedeError(null);
                          setSupersedeModalReport(item);
                        }}
                      >
                        Correct (v{item.versionNumber + 1})
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Upload */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload report PDF" description="Match the patient, attach the PDF and queue it for verification." maxWidth="lg">
        <form onSubmit={handleUploadReport} className="space-y-5">
          {uploadError && (
            <Alert type="error" title="Upload not completed">
              {uploadError}
            </Alert>
          )}

          <div>
            <label htmlFor="up-patient-search" className="field-label">1 · Match patient</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                id="up-patient-search"
                type="search"
                placeholder="Patient ID, name or phone"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="field-control pl-10"
              />
            </div>
            <div role="radiogroup" aria-label="Matching patients" className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line bg-ink-50/50 p-1.5">
              {matchingPatients.length === 0 ? (
                <p className="py-3 text-center text-[13px] text-ink-500">No matching patient found.</p>
              ) : (
                matchingPatients.map(p => {
                  const on = selectedPatientId === p.patientId;
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        on ? 'bg-white ring-2 ring-brand-500' : 'hover:bg-white'
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <input type="radio" name="matched_patient" checked={on} onChange={() => setSelectedPatientId(p.patientId)} className="accent-brand-700" />
                        <span className="font-medium text-ink-900">{p.fullName}</span>
                        <span className="font-mono text-xs text-brand-700">{p.patientId}</span>
                      </span>
                      <span className="text-xs text-ink-500">+91 {p.phone}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="up-test" className="field-label">2 · Test</label>
              <select id="up-test" value={selectedTestName} onChange={e => setSelectedTestName(e.target.value)} className="field-control">
                {pathologyTests.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="up-acc" className="field-label">Accession number</label>
              <input id="up-acc" value={customAccession} onChange={e => setCustomAccession(e.target.value)} className="field-control font-mono" required />
            </div>
          </div>

          <FileDrop label="3 · Signed report PDF" file={reportFile} onChange={setReportFile} accept="application/pdf" hint="PDF only · up to 10 MB" />

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isUploading} loadingText="Uploading…">
              {uploadError ? 'Try again' : 'Save for verification'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supersede */}
      <Modal
        isOpen={Boolean(supersedeModalReport)}
        onClose={() => setSupersedeModalReport(null)}
        title={`Correct report ${supersedeModalReport?.reportCode ?? ''}`}
        description="The current version is kept in the audit history."
      >
        <form onSubmit={handleSupersedeSubmit} className="space-y-5">
          {supersedeError && <Alert type="error">{supersedeError}</Alert>}
          <p className="text-sm text-ink-700">
            Creating <strong className="font-semibold text-ink-900">version {(supersedeModalReport?.versionNumber || 1) + 1}</strong> for{' '}
            <strong className="font-semibold text-ink-900">{supersedeModalReport?.patientName}</strong> ({supersedeModalReport?.patientId}).
          </p>
          <div>
            <label htmlFor="sup-reason" className="field-label">Reason for correction</label>
            <textarea
              id="sup-reason"
              rows={3}
              value={correctionReason}
              onChange={e => setCorrectionReason(e.target.value)}
              placeholder="e.g. Reference interval typing correction"
              className="field-control resize-y"
              required
            />
          </div>
          <FileDrop label="Corrected PDF" file={correctedFile} onChange={setCorrectedFile} accept="application/pdf" hint="PDF only · up to 10 MB" />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" type="button" onClick={() => setSupersedeModalReport(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" isLoading={isUploading} loadingText="Publishing…">
              Publish corrected version
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
