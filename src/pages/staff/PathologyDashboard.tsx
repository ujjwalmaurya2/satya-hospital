import React, { useState } from 'react';
import { 
  Microscope, 
  Upload, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Download, 
  ShieldCheck, 
  FileText,
  Clock,
  RotateCcw
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Table } from '../../components/common/Table';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { uploadDocumentToSecureStorage, getAuthorizedSignedDocumentUrl } from '../../lib/storage';
import { generateAccessionNumber, getHospitalTodayDate } from '../../lib/tokens';
import { PathologyReport, PathologyReportStatus } from '../../types';

export const PathologyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    pathologyReports, 
    pathologyTests, 
    patientProfiles, 
    uploadPathologyReport, 
    verifyAndPublishPathologyReport,
    supersedePathologyReport,
    searchPatients 
  } = useHospital();

  const today = getHospitalTodayDate();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestName, setSelectedTestName] = useState(pathologyTests[0]?.name || 'Complete Blood Count (CBC)');
  const [customAccession, setCustomAccession] = useState(() => generateAccessionNumber(Date.now() % 1000));
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Correction / Supersede Modal State
  const [supersedeModalReport, setSupersedeModalReport] = useState<PathologyReport | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctedFile, setCorrectedFile] = useState<File | null>(null);

  // Filtered reports
  const filteredReports = pathologyReports.filter(r => {
    const matchesSearch = 
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.labAccessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.testName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const matchingPatients = searchPatients(patientSearch);

  // Handle PDF Upload
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!selectedPatientId) {
      setUploadError('Please select and confirm a matched patient record.');
      return;
    }
    if (!reportFile) {
      setUploadError('Please choose a valid pathology report PDF file.');
      return;
    }

    const patient = patientProfiles.find(p => p.patientId === selectedPatientId);
    if (!patient) {
      setUploadError('Patient not found in authoritative records.');
      return;
    }

    setIsUploading(true);

    try {
      const uploadRes = await uploadDocumentToSecureStorage(reportFile, 'reports', patient.patientId);
      if (!uploadRes.success || !uploadRes.storageKey) {
        setUploadError(uploadRes.error || 'Failed to store report in secure storage.');
        setIsUploading(false);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown upload error.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Verification & Publish
  const handleVerifyAndPublish = (report: PathologyReport) => {
    const success = verifyAndPublishPathologyReport(report.id, user?.fullName || 'Senior Pathologist');
    if (!success) {
      alert('Unable to publish report. Please ensure patient linkage is valid.');
    }
  };

  // Handle Supersede & Versioning
  const handleSupersedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supersedeModalReport || !correctedFile || !correctionReason.trim()) return;

    setIsUploading(true);
    try {
      const uploadRes = await uploadDocumentToSecureStorage(
        correctedFile, 
        'reports', 
        supersedeModalReport.patientId
      );

      if (!uploadRes.success || !uploadRes.storageKey) {
        alert(uploadRes.error || 'Failed to upload corrected report.');
        setIsUploading(false);
        return;
      }

      supersedePathologyReport(
        supersedeModalReport.id,
        correctionReason.trim(),
        {
          storageKey: uploadRes.storageKey,
          fileName: uploadRes.fileName || correctedFile.name,
          fileSize: uploadRes.fileSize || correctedFile.size,
          checksum: uploadRes.checksum,
        }
      );

      setSupersedeModalReport(null);
      setCorrectionReason('');
      setCorrectedFile(null);
    } catch (err: unknown) {
      alert('Failed to supersede report.');
    } finally {
      setIsUploading(false);
    }
  };

  // Preview PDF in new tab
  const handlePreviewPdf = (storageKey: string) => {
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'pathology');
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Unable to open PDF preview.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
            Pathology Laboratory Workspace
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            PDF report ingestion, patient matching, two-step pathologist certification, and versioning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setUploadModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Upload Diagnostic PDF
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Total Reports Processed</span>
          <div className="text-2xl font-bold text-[#243447] mt-1">{pathologyReports.length}</div>
          <span className="text-[11px] text-[#667085] block mt-0.5">All versions recorded</span>
        </Card>

        <Card className="p-4 border-amber-300 bg-amber-50/30">
          <span className="text-xs text-amber-900 font-medium block">Pending Verification</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {pathologyReports.filter(r => r.status === 'pending_verification').length}
          </div>
          <span className="text-[11px] text-amber-800 block mt-0.5">Awaiting Pathologist Sign-off</span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Published to Patients</span>
          <div className="text-2xl font-bold text-[#91BB40] mt-1">
            {pathologyReports.filter(r => r.status === 'published').length}
          </div>
          <span className="text-[11px] text-[#91BB40] block mt-0.5">Available in Portal</span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Corrected / Superseded</span>
          <div className="text-2xl font-bold text-[#667085] mt-1">
            {pathologyReports.filter(r => r.status === 'superseded').length}
          </div>
          <span className="text-[11px] text-[#667085] block mt-0.5">Preserved in audit history</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'pending_verification', 'published', 'superseded'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#3DA9DF] text-white'
                  : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
              }`}
            >
              {st === 'all' ? 'All Reports' : st.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient, accession, test..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#CBD5E1] text-xs bg-white"
          />
        </div>
      </div>

      {/* Main Reports Worklist Table */}
      <Card>
        <CardBody className="p-0">
          <Table
            data={filteredReports}
            keyExtractor={(item) => item.id}
            emptyMessage="No pathology reports match your criteria."
            columns={[
              {
                header: 'Accession / Code',
                cell: (item) => (
                  <div>
                    <div className="font-mono font-bold text-[#243447] text-xs">
                      {item.labAccessionNumber}
                    </div>
                    <div className="text-[11px] text-[#667085] font-mono">
                      {item.reportCode} {item.versionNumber > 1 ? `(V${item.versionNumber})` : ''}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Patient Details',
                cell: (item) => (
                  <div>
                    <div className="font-bold text-[#243447]">{item.patientName}</div>
                    <div className="text-[11px] text-[#3DA9DF] font-mono">{item.patientId}</div>
                  </div>
                ),
              },
              {
                header: 'Investigation / Test',
                cell: (item) => (
                  <div>
                    <span className="font-semibold text-xs text-[#243447]">{item.testName}</span>
                    <span className="block text-[11px] text-[#667085]">{item.reportDate}</span>
                  </div>
                ),
              },
              {
                header: 'Status',
                cell: (item) => {
                  const variant = 
                    item.status === 'published' ? 'lime-green' :
                    item.status === 'pending_verification' ? 'warning' :
                    item.status === 'superseded' ? 'neutral' : 'danger';

                  return (
                    <Badge variant={variant} size="sm" dot>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  );
                },
              },
              {
                header: 'Sign-Off Signatory',
                cell: (item) => (
                  <div className="text-xs text-[#667085]">
                    {item.verifierName ? (
                      <span className="text-[#91BB40] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.verifierName}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">Pending Sign-off</span>
                    )}
                  </div>
                ),
              },
              {
                header: 'Actions',
                cell: (item) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewPdf(item.storageKey)}
                      title="Preview PDF"
                    >
                      <Eye className="w-4 h-4 text-[#3DA9DF]" />
                    </Button>

                    {item.status === 'pending_verification' && (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleVerifyAndPublish(item)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Publish to Patient
                      </Button>
                    )}

                    {item.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSupersedeModalReport(item)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        title="Upload corrected version"
                      >
                        Correct (V{item.versionNumber + 1})
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      {/* UPLOAD REPORT MODAL */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Diagnostic PDF Report"
        description="Match report with patient, inspect PDF, and queue for verification."
        maxWidth="lg"
      >
        <form onSubmit={handleUploadReport} className="space-y-4 text-xs">
          {uploadError && (
            <Alert type="error" title="Upload Validation Error">
              {uploadError}
            </Alert>
          )}

          {/* Patient Search & Match */}
          <div>
            <label className="block font-semibold text-[#243447] mb-1">
              Step 1: Match with Registered Patient <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient by ID (e.g. SH-2026-00001), name or phone..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CBD5E1]"
              />
            </div>

            {/* Match Candidate Radio List */}
            <div className="max-h-36 overflow-y-auto border border-[#E1E8ED] rounded-lg p-2 space-y-1.5 bg-[#F8FAFC]">
              {matchingPatients.length === 0 ? (
                <div className="text-center py-2 text-[#667085]">No matching patient found.</div>
              ) : (
                matchingPatients.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      selectedPatientId === p.patientId ? 'bg-[#EBF6FC] border border-[#3DA9DF]' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="matched_patient"
                        checked={selectedPatientId === p.patientId}
                        onChange={() => setSelectedPatientId(p.patientId)}
                        className="text-[#3DA9DF]"
                      />
                      <span className="font-bold text-[#243447]">{p.fullName}</span>
                      <span className="font-mono text-[#3DA9DF]">({p.patientId})</span>
                    </div>
                    <span className="text-[#667085]">+91 {p.phone}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Test & Accession */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#243447] mb-1">
                Investigation / Test Name <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTestName}
                onChange={(e) => setSelectedTestName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
              >
                {pathologyTests.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#243447] mb-1">
                Lab Accession Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customAccession}
                onChange={(e) => setCustomAccession(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] font-mono"
                required
              />
            </div>
          </div>

          {/* File Picker */}
          <div>
            <label className="block font-semibold text-[#243447] mb-1">
              Select Signed PDF Document <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setReportFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-[#CBD5E1] rounded-lg bg-[#F8FAFC]"
              required
            />
            <span className="text-[11px] text-[#667085] mt-1 block">
              Only authentic PDF files up to 10 MB are permitted. Untrusted types will be rejected.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E8ED]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isUploading}>
              Save as Pending Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* SUPERSEDE / CORRECTION MODAL */}
      <Modal
        isOpen={Boolean(supersedeModalReport)}
        onClose={() => setSupersedeModalReport(null)}
        title={`Supersede & Correct Report: ${supersedeModalReport?.reportCode}`}
        description="Replace erroneous laboratory findings through traceable versioning."
      >
        <form onSubmit={handleSupersedeSubmit} className="space-y-4 text-xs">
          <p className="text-[#243447]">
            You are creating <strong>Version {((supersedeModalReport?.versionNumber || 1) + 1)}</strong> for patient <strong>{supersedeModalReport?.patientName}</strong> ({supersedeModalReport?.patientId}). The prior version will be preserved in audit records.
          </p>

          <div>
            <label className="block font-semibold text-[#243447] mb-1">
              Correction Reason (Mandatory Audit Requirement) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Recalibration amendment, typing correction in reference interval..."
              className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#243447] mb-1">
              Select Corrected PDF Report <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setCorrectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-[#CBD5E1] rounded-lg bg-[#F8FAFC]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E8ED]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setSupersedeModalReport(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isUploading}>
              Publish Superseded Version
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
