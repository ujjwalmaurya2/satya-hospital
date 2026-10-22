import React, { useState } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Clock, 
  User, 
  Download, 
  PlusCircle, 
  History,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Table } from '../../components/common/Table';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { getHospitalTodayDate } from '../../lib/tokens';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';
import { Appointment, PatientVisit, MedicalDocument } from '../../types';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    appointments, 
    patientProfiles, 
    visits, 
    medicalDocuments, 
    pathologyReports, 
    updateAppointmentStatus,
    addPatientVisit,
    verifyMedicalDocument
  } = useHospital();

  const today = getHospitalTodayDate();

  // Consultation state
  const [activeConsultationApt, setActiveConsultationApt] = useState<Appointment | null>(null);
  const [complaint, setComplaint] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active doctor's OPD appointments for today
  const doctorTodayAppointments = appointments.filter(
    a => a.appointmentDate === today
  ).sort((a, b) => a.tokenNumber - b.tokenNumber);

  const waitingAppointments = doctorTodayAppointments.filter(
    a => a.status === 'checked_in' || a.status === 'booked'
  );
  const inConsultationAppointments = doctorTodayAppointments.filter(
    a => a.status === 'in_consultation'
  );
  const completedAppointments = doctorTodayAppointments.filter(
    a => a.status === 'completed'
  );

  // Unverified prescription documents awaiting doctor sign-off
  const unverifiedPrescriptions = medicalDocuments.filter(
    d => d.verificationStatus === 'unverified'
  );

  // When opening consultation for a patient
  const handleOpenConsultation = (apt: Appointment) => {
    setActiveConsultationApt(apt);
    setComplaint(apt.notes || '');
    setClinicalNotes('');
    setDiagnosis('');
    setSaveSuccess(false);

    if (apt.status !== 'in_consultation') {
      updateAppointmentStatus(apt.id, 'in_consultation', 'doctor');
    }
  };

  const handleCompleteConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationApt) return;

    addPatientVisit({
      patientProfileId: activeConsultationApt.patientProfileId,
      appointmentId: activeConsultationApt.id,
      doctorId: user?.id || 'doc-1',
      doctorName: user?.fullName || 'Dr. V. K. Sharma',
      visitDate: today,
      chiefComplaint: complaint.trim() || 'General OPD follow-up',
      clinicalNotes: clinicalNotes.trim(),
      diagnosis: diagnosis.trim() || undefined,
      doctorSignature: `${user?.fullName || 'Doctor'} (MD)`,
      status: 'completed',
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setActiveConsultationApt(null);
    }, 1200);
  };

  const handleDocumentPreview = (storageKey: string, title: string) => {
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'doctor');
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Failed to preview document.');
    }
  };

  const handleVerifyPrescription = (docId: string) => {
    verifyMedicalDocument(docId, user?.fullName || 'Consulting Physician');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
            Doctor Clinical Workspace
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Logged in as: <strong>{user?.fullName || 'Dr. V. K. Sharma'}</strong> &bull; OPD Clinics ({today})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="lime-green" size="md">
            OPD In Session
          </Badge>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Waiting in OPD Lounge</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{waitingAppointments.length}</div>
          <span className="text-[11px] text-[#667085] block mt-0.5">Checked-in &bull; Ready for consult</span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">In Active Consultation</span>
          <div className="text-2xl font-bold text-[#3DA9DF] mt-1">{inConsultationAppointments.length}</div>
          <span className="text-[11px] text-[#3DA9DF] block mt-0.5">In examination chamber</span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Visits Completed Today</span>
          <div className="text-2xl font-bold text-[#91BB40] mt-1">{completedAppointments.length}</div>
          <span className="text-[11px] text-[#667085] block mt-0.5">Clinical notes finalised</span>
        </Card>
      </div>

      {/* Section 1: Prescriptions Awaiting Doctor Verification */}
      {unverifiedPrescriptions.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader className="bg-amber-100/50">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Scanned Handwritten Prescriptions Awaiting Your Sign-Off ({unverifiedPrescriptions.length})</span>
              </div>
              <Badge variant="warning" size="sm">Action Required</Badge>
            </div>
          </CardHeader>
          <CardBody className="p-0 divide-y divide-amber-200/60">
            {unverifiedPrescriptions.map((doc) => (
              <div key={doc.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-[#243447]">{doc.title}</h4>
                  <span className="text-[#667085] block mt-0.5">
                    Uploaded by: {doc.uploaderName} &bull; Attached to Patient Record
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDocumentPreview(doc.storageKey, doc.title)}
                  >
                    Preview Scan
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleVerifyPrescription(doc.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Verify &amp; Authorize for Patient
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Section 2: Today's Patient Queue */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-[#243447]">
            Today's Assigned OPD Consultation Queue
          </h2>
        </CardHeader>

        <CardBody className="p-0">
          <Table
            data={doctorTodayAppointments}
            keyExtractor={(item) => item.id}
            emptyMessage="No patient visits scheduled for today."
            columns={[
              {
                header: 'Token',
                cell: (item) => (
                  <span className="px-2.5 py-1 rounded bg-[#243447] text-white font-mono font-bold text-xs">
                    #{item.tokenNumber}
                  </span>
                ),
              },
              {
                header: 'Patient Name & ID',
                cell: (item) => (
                  <div>
                    <div className="font-bold text-[#243447]">{item.patientName}</div>
                    <div className="text-[11px] text-[#3DA9DF] font-mono">{item.patientId}</div>
                  </div>
                ),
              },
              {
                header: 'Complaints / Note',
                cell: (item) => (
                  <span className="text-xs text-[#667085] italic max-w-xs truncate block">
                    {item.notes || 'Routine follow-up'}
                  </span>
                ),
              },
              {
                header: 'Queue Status',
                cell: (item) => (
                  <Badge variant={item.status === 'completed' ? 'success' : item.status === 'in_consultation' ? 'medical-blue' : 'warning'} size="sm" dot>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                ),
              },
              {
                header: 'Action',
                cell: (item) => (
                  <div className="flex items-center gap-2">
                    {item.status !== 'completed' ? (
                      <Button
                        variant={item.status === 'in_consultation' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleOpenConsultation(item)}
                      >
                        {item.status === 'in_consultation' ? 'Resume Consult' : 'Start Consult'}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenConsultation(item)}
                      >
                        View Visit Summary
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      {/* CONSULTATION & CLINICAL HISTORY MODAL */}
      <Modal
        isOpen={Boolean(activeConsultationApt)}
        onClose={() => setActiveConsultationApt(null)}
        title={`Clinical Consultation: ${activeConsultationApt?.patientName} (${activeConsultationApt?.patientId})`}
        maxWidth="2xl"
      >
        {activeConsultationApt && (
          <div className="space-y-6 text-xs">
            {saveSuccess && (
              <Alert type="success" title="Consultation Finalized">
                Clinical visit notes recorded and synchronized with patient records.
              </Alert>
            )}

            {/* Historical Visits Drawer / Accordion */}
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E1E8ED] space-y-3">
              <div className="flex items-center justify-between text-[#243447] font-bold">
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#3DA9DF]" />
                  <span>Prior Medical Visits History</span>
                </span>
                <span className="text-[11px] text-[#667085]">
                  Separated from today's visit
                </span>
              </div>

              {visits.filter(v => v.patientProfileId === activeConsultationApt.patientProfileId).length === 0 ? (
                <p className="text-[#667085] italic text-[11px]">No prior hospital visit records on file.</p>
              ) : (
                <div className="space-y-2">
                  {visits.filter(v => v.patientProfileId === activeConsultationApt.patientProfileId).map((v) => (
                    <div key={v.id} className="p-2.5 bg-white rounded border border-[#E1E8ED] space-y-1">
                      <div className="flex justify-between font-semibold text-[#243447]">
                        <span>Date: {v.visitDate} &bull; Doctor: {v.doctorName}</span>
                        <span className="text-[#3DA9DF]">{v.diagnosis || 'Diagnosis Not Noted'}</span>
                      </div>
                      <p className="text-[#667085] text-[11px]">{v.clinicalNotes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Visit Consultation Notes Form */}
            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <h3 className="font-bold text-[#243447] uppercase tracking-wider text-xs">
                Current Consultation Entry (Visit #{activeConsultationApt.tokenNumber})
              </h3>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Chief Complaint &amp; Patient Presentation
                </label>
                <input
                  type="text"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. Cough with low grade fever for 4 days..."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Clinical Examination &amp; Physician Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Pulse, BP, chest auscultation, treatment recommendations, diet advice..."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Provisional / Confirmed Diagnosis
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Bronchitis, Essential Hypertension..."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs"
                />
              </div>

              <div className="p-3 bg-[#EBF6FC] rounded-lg border border-[#BCE1F5] flex items-center justify-between">
                <span className="text-[11px] text-[#1E78A4]">
                  Consultant Digital Signature: <strong>{user?.fullName || 'Doctor'} (MD)</strong>
                </span>
                <span className="text-[11px] text-[#667085]">{today}</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E8ED]">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setActiveConsultationApt(null)}
                >
                  Close Window
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Finalize &amp; Complete Visit
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
