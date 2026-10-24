import React, { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Eye, FileText, History, PenLine, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { APPOINTMENT_BADGE, PageHeader, Panel, StatCard } from '../../components/dashboard/Dashboard';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { getHospitalTodayDate } from '../../lib/tokens';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';
import { cn } from '../../lib/cn';
import { Appointment } from '../../types';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { appointments, visits, medicalDocuments, updateAppointmentStatus, addPatientVisit, verifyMedicalDocument } = useHospital();

  const today = getHospitalTodayDate();

  const [activeConsultationApt, setActiveConsultationApt] = useState<Appointment | null>(null);
  const [complaint, setComplaint] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const doctorTodayAppointments = appointments.filter(a => a.appointmentDate === today).sort((a, b) => a.tokenNumber - b.tokenNumber);
  const waitingAppointments = doctorTodayAppointments.filter(a => a.status === 'checked_in' || a.status === 'booked');
  const inConsultationAppointments = doctorTodayAppointments.filter(a => a.status === 'in_consultation');
  const completedAppointments = doctorTodayAppointments.filter(a => a.status === 'completed');
  const unverifiedPrescriptions = medicalDocuments.filter(d => d.verificationStatus === 'unverified');

  const handleOpenConsultation = (apt: Appointment) => {
    setActiveConsultationApt(apt);
    setComplaint(apt.notes || '');
    setClinicalNotes('');
    setDiagnosis('');
    setSaveSuccess(false);
    if (apt.status !== 'in_consultation' && apt.status !== 'completed') {
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
    setTimeout(() => setActiveConsultationApt(null), 1200);
  };

  const handleDocumentPreview = (storageKey: string) => {
    setPreviewError(null);
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'doctor');
    if (res.success && res.url) window.open(res.url, '_blank', 'noopener');
    else setPreviewError(res.error || 'Could not open this document.');
  };

  const history = activeConsultationApt ? visits.filter(v => v.patientProfileId === activeConsultationApt.patientProfileId) : [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Doctor workspace" title="Today’s consultations" description={`Signed in as ${user?.fullName || 'Consulting doctor'}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Waiting" value={waitingAppointments.length} hint="Booked or checked-in" tone="warning" icon={<UserRound className="h-4 w-4" />} />
        <StatCard label="In consultation" value={inConsultationAppointments.length} hint="In the examination room" tone="brand" icon={<Stethoscope className="h-4 w-4" />} />
        <StatCard label="Completed" value={completedAppointments.length} hint="Notes finalised" tone="leaf" icon={<ClipboardCheck className="h-4 w-4" />} />
      </div>

      {previewError && <Alert type="error">{previewError}</Alert>}

      {unverifiedPrescriptions.length > 0 && (
        <Panel
          flush
          className="border-warning-200"
          title={
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning-600" aria-hidden="true" />
              Prescription scans awaiting your sign-off
            </span>
          }
          actions={<Badge variant="warning">{unverifiedPrescriptions.length} pending</Badge>}
        >
          <ul className="divide-y divide-line">
            {unverifiedPrescriptions.map(doc => (
              <li key={doc.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{doc.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-500">Uploaded by {doc.uploaderName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />} onClick={() => handleDocumentPreview(doc.storageKey)}>
                    Preview
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => verifyMedicalDocument(doc.id, user?.fullName || 'Consulting Physician')}
                  >
                    Verify for patient
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel flush title="OPD queue" description="Ordered by token number">
        {doctorTodayAppointments.length === 0 ? (
          <EmptyState title="No patients scheduled today" description="Booked and walk-in patients will appear here in token order." icon={<Stethoscope className="h-6 w-6" />} />
        ) : (
          <ul className="divide-y divide-line">
            {doctorTodayAppointments.map(item => {
              const badge = APPOINTMENT_BADGE[item.status];
              const active = item.status === 'in_consultation';
              return (
                <li key={item.id} className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6', active && 'bg-brand-50/50')}>
                  <span
                    className={cn(
                      'flex h-11 w-14 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold tabular-nums text-white',
                      active ? 'bg-brand-700' : 'bg-ink-800'
                    )}
                  >
                    #{item.tokenNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-900">{item.patientName}</p>
                      <Badge variant={badge.variant} size="sm" dot>
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-ink-500">
                      <span className="font-mono text-xs text-brand-700">{item.patientId}</span> · {item.notes || 'Routine follow-up'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {item.status === 'completed' ? (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenConsultation(item)}>
                        View summary
                      </Button>
                    ) : item.status === 'checked_in' || active ? (
                      <Button variant={active ? 'primary' : 'outline'} size="sm" leftIcon={<PenLine className="h-4 w-4" />} onClick={() => handleOpenConsultation(item)}>
                        {active ? 'Resume consult' : 'Start consult'}
                      </Button>
                    ) : (
                      // Booked patients must check in at reception first; no-shows can be re-checked-in there.
                      <span className="text-[13px] text-ink-400">{item.status === 'booked' ? 'Awaiting check-in' : 'Not in queue'}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal
        isOpen={Boolean(activeConsultationApt)}
        onClose={() => setActiveConsultationApt(null)}
        title={activeConsultationApt ? `${activeConsultationApt.patientName}` : ''}
        description={activeConsultationApt ? `${activeConsultationApt.patientId} · Token #${activeConsultationApt.tokenNumber} · ${today}` : ''}
        maxWidth="2xl"
      >
        {activeConsultationApt && (
          <div className="space-y-6">
            {saveSuccess && (
              <Alert type="success" title="Consultation finalised">
                Visit notes are saved to the patient record.
              </Alert>
            )}

            <section className="rounded-2xl bg-ink-50/70 p-4 ring-1 ring-inset ring-line">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <History className="h-4 w-4 text-brand-600" aria-hidden="true" /> Previous visits
              </h3>
              {history.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-500">No earlier visits on file.</p>
              ) : (
                <ol className="mt-3 space-y-2.5">
                  {history.map(v => (
                    <li key={v.id} className="rounded-xl bg-white p-3 ring-1 ring-line">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <span className="font-medium text-ink-900">
                          {v.visitDate} · {v.doctorName}
                        </span>
                        <span className="font-medium text-brand-700">{v.diagnosis || 'No diagnosis noted'}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-600">{v.clinicalNotes}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <div>
                <label htmlFor="dx-complaint" className="field-label">Chief complaint</label>
                <input
                  id="dx-complaint"
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                  placeholder="e.g. Cough with low-grade fever for 4 days"
                  className="field-control"
                  required
                />
              </div>
              <div>
                <label htmlFor="dx-notes" className="field-label">Examination & notes</label>
                <textarea
                  id="dx-notes"
                  rows={5}
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  placeholder="Pulse, BP, chest auscultation, treatment, diet advice…"
                  className="field-control resize-y"
                  required
                />
              </div>
              <div>
                <label htmlFor="dx-diagnosis" className="field-label">
                  Diagnosis <span className="font-normal text-ink-400">(provisional or confirmed)</span>
                </label>
                <input id="dx-diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Acute bronchitis" className="field-control" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-3 text-[13px] text-brand-900 ring-1 ring-inset ring-brand-100">
                <span>
                  Signed by <strong className="font-semibold">{user?.fullName || 'Doctor'} (MD)</strong>
                </span>
                <span className="text-brand-700">{today}</span>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="ghost" type="button" onClick={() => setActiveConsultationApt(null)}>
                  Close
                </Button>
                <Button type="submit" leftIcon={<CheckCircle2 className="h-4 w-4" />} disabled={saveSuccess}>
                  Finalise visit
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
