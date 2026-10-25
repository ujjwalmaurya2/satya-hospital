import React, { useState } from 'react';
import { BellRing, CheckCircle2, ClipboardCheck, Eye, FileText, History, PenLine, RefreshCw, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { APPOINTMENT_BADGE, PageHeader, Panel, Segmented, StatCard } from '../../components/dashboard/Dashboard';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { useQueueDesk } from '../../hooks/useQueueDesk';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';
import { cn } from '../../lib/cn';
import { VisitSummary } from '../../services/queueService';
import { Appointment } from '../../types';

type View = 'active' | 'completed' | 'missed' | 'all';

const VIEWS: Record<View, (a: Appointment) => boolean> = {
  active: a => a.status === 'booked' || a.status === 'checked_in' || a.status === 'in_consultation',
  completed: a => a.status === 'completed',
  missed: a => a.status === 'no_show' || a.status === 'cancelled',
  all: () => true,
};

const timeOf = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');

/**
 * Doctor workspace. Reads the same appointments rows as the Reception queue
 * desk (useQueueDesk: Supabase + Realtime for live sessions), so arrivals
 * confirmed at Reception show here immediately.
 */
export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { medicalDocuments, verifyMedicalDocument } = useHospital();
  const desk = useQueueDesk();
  const { appointments, live, loading, syncError, viewDate, setViewDate, isToday, today } = desk;

  const [view, setView] = useState<View>('active');
  const [open, setOpen] = useState<Appointment | null>(null);
  const [history, setHistory] = useState<VisitSummary[] | null>(null);
  const [complaint, setComplaint] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const waiting = appointments.filter(a => a.status === 'checked_in');
  const inRoom = appointments.filter(a => a.status === 'in_consultation');
  const notArrived = appointments.filter(a => a.status === 'booked');
  const completed = appointments.filter(a => a.status === 'completed');
  const list = appointments.filter(VIEWS[view]);
  // Prescription scans are still kept in the local demo store; hide them for real sessions rather than show unsaved data.
  const unverifiedPrescriptions = live ? [] : medicalDocuments.filter(d => d.verificationStatus === 'unverified');

  // Fresh appointment row (Realtime may have updated it while the modal is open).
  const current = open ? appointments.find(a => a.id === open.id) ?? open : null;

  const openConsultation = async (appt: Appointment) => {
    setModalError(null);
    setNotice(null);
    if (appt.status === 'checked_in') {
      setBusy(appt.id);
      const res = await desk.setStatus(appt, 'in_consultation');
      setBusy(null);
      if (!res.ok) {
        setNotice({ type: 'error', text: res.error });
        return;
      }
    }
    setOpen(appt);
    setComplaint(appt.visitReason || appt.notes || '');
    setClinicalNotes('');
    setDiagnosis('');
    setHistory(null);
    desk.visitsFor(appt.patientProfileId).then(setHistory).catch(() => setHistory([]));
  };

  const callNext = async () => {
    setBusy('call-next');
    const res = await desk.callNext();
    setBusy(null);
    setNotice(res.ok ? { type: 'success', text: res.message } : { type: 'error', text: res.error });
  };

  const sendBack = async () => {
    if (!current) return;
    setBusy('send-back');
    const res = await desk.setStatus(current, 'checked_in');
    setBusy(null);
    if (res.ok) setOpen(null);
    else setModalError(res.error);
  };

  const complete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setBusy('complete');
    setModalError(null);
    const res = await desk.completeConsultation(current, { complaint: complaint.trim(), notes: clinicalNotes.trim(), diagnosis: diagnosis.trim() || undefined });
    setBusy(null);
    if (!res.ok) return setModalError(res.error); // only show success once the server confirmed it
    setNotice({ type: 'success', text: res.message });
    setOpen(null);
  };

  const preview = (storageKey: string) => {
    setPreviewError(null);
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'doctor');
    if (res.success && res.url) window.open(res.url, '_blank', 'noopener');
    else setPreviewError(res.error || 'Could not open this document.');
  };

  const canEditNotes = current?.status === 'in_consultation' || current?.status === 'checked_in';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Doctor workspace"
        title={isToday ? 'Today’s consultations' : 'Consultations'}
        description={`Signed in as ${user?.fullName || 'Consulting doctor'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="doc-date" className="sr-only">OPD date</label>
            <input id="doc-date" type="date" value={viewDate} onChange={e => setViewDate(e.target.value || today)} className="field-control w-auto py-2" />
            <Button size="sm" variant="ghost" onClick={() => desk.refresh()} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            {isToday && (
              <Button size="sm" onClick={callNext} isLoading={busy === 'call-next'} loadingText="Calling…" disabled={waiting.length === 0 || busy !== null} leftIcon={<BellRing className="h-4 w-4" />}>
                Call next
              </Button>
            )}
          </div>
        }
      />

      {!live && <Alert type="info" className="text-sm">Demo session: this panel is showing local sample data, not the live hospital queue.</Alert>}
      {syncError && (
        <Alert type="error" title="Couldn’t refresh the queue">
          {syncError}{' '}
          <button type="button" className="link cursor-pointer" onClick={() => desk.refresh()}>Try again</button>
        </Alert>
      )}
      {notice && <Alert type={notice.type}>{notice.text}</Alert>}
      {previewError && <Alert type="error">{previewError}</Alert>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Waiting" value={waiting.length} hint="Arrived, checked in" tone="warning" icon={<UserRound className="h-4 w-4" />} />
        <StatCard label="With you" value={inRoom.length} hint="In consultation" tone="brand" icon={<Stethoscope className="h-4 w-4" />} />
        <StatCard label="Not arrived" value={notArrived.length} hint="Booked online" icon={<UserRound className="h-4 w-4" />} />
        <StatCard label="Completed" value={completed.length} hint="Notes saved" tone="leaf" icon={<ClipboardCheck className="h-4 w-4" />} />
      </div>

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
                  <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />} onClick={() => preview(doc.storageKey)}>Preview</Button>
                  <Button variant="accent" size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => verifyMedicalDocument(doc.id, user?.fullName || 'Consulting Physician')}>
                    Verify for patient
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel flush title="OPD queue" description="Same list as the reception desk, in token order. Updates automatically.">
        <div className="border-b border-line px-5 py-3 sm:px-6">
          <Segmented
            value={view}
            onChange={setView}
            layoutId="doctor-view"
            label="Filter appointments"
            items={[
              { id: 'active', label: 'Active', count: appointments.filter(VIEWS.active).length },
              { id: 'completed', label: 'Completed', count: completed.length },
              { id: 'missed', label: 'Missed / cancelled', count: appointments.filter(VIEWS.missed).length },
              { id: 'all', label: 'All', count: appointments.length },
            ]}
          />
        </div>
        {loading ? (
          <div className="p-8"><MedicalLoader label="Loading the queue…" /></div>
        ) : list.length === 0 ? (
          <EmptyState title="No patients here" description="Online bookings and walk-ins registered by reception appear here in token order." icon={<Stethoscope className="h-6 w-6" />} />
        ) : (
          <ul className="divide-y divide-line">
            {list.map(item => {
              const badge = APPOINTMENT_BADGE[item.status];
              const active = item.status === 'in_consultation';
              return (
                <li key={item.id} className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6', active && 'bg-brand-50/50')}>
                  <span className={cn('flex h-11 w-14 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold tabular-nums text-white', active ? 'bg-brand-700' : 'bg-ink-800')}>
                    #{item.tokenNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-900">{item.patientName}</p>
                      <Badge variant={badge.variant} size="sm" dot>{badge.label}</Badge>
                      <Badge variant={item.queueType === 'online' ? 'sky-blue' : 'peach'} size="sm">{item.queueType === 'online' ? 'Online' : 'Walk-in'}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-ink-500">
                      {item.patientId && <span className="font-mono text-xs text-brand-700">{item.patientId} · </span>}
                      {item.visitReason || item.notes || 'No reason given'}
                      {item.checkedInAt && ` · arrived ${timeOf(item.checkedInAt)}`}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {item.status === 'completed' ? (
                      <Button variant="ghost" size="sm" onClick={() => openConsultation(item)}>View notes</Button>
                    ) : item.status === 'checked_in' || active ? (
                      <Button
                        variant={active ? 'primary' : 'outline'}
                        size="sm"
                        leftIcon={<PenLine className="h-4 w-4" />}
                        isLoading={busy === item.id}
                        disabled={busy !== null}
                        onClick={() => openConsultation(item)}
                      >
                        {active ? 'Resume' : 'Start consult'}
                      </Button>
                    ) : (
                      <span className="text-[13px] text-ink-400">{item.status === 'booked' ? 'Not arrived yet' : badge.label}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal
        isOpen={Boolean(current)}
        onClose={() => setOpen(null)}
        title={current ? current.patientName : ''}
        description={current ? `Token #${current.tokenNumber} · ${current.queueType === 'online' ? 'Online booking' : 'Walk-in'} · ${current.appointmentDate}` : ''}
        maxWidth="2xl"
      >
        {current && (
          <div className="space-y-6">
            {modalError && <Alert type="error">{modalError}</Alert>}
            <section className="rounded-2xl bg-ink-50/70 p-4 ring-1 ring-inset ring-line">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <History className="h-4 w-4 text-brand-600" aria-hidden="true" /> Previous visits
              </h3>
              {history === null ? (
                <p className="mt-2 text-[13px] text-ink-500">Loading…</p>
              ) : history.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-500">No earlier visits on file.</p>
              ) : (
                <ol className="mt-3 space-y-2.5">
                  {history.map(v => (
                    <li key={v.id} className="rounded-xl bg-white p-3 ring-1 ring-line">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <span className="font-medium text-ink-900">{v.visitDate} · {v.doctorName}</span>
                        <span className="font-medium text-brand-700">{v.diagnosis || 'No diagnosis noted'}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-[13px] text-ink-600">{v.clinicalNotes}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {canEditNotes ? (
              <form onSubmit={complete} className="space-y-4">
                <div>
                  <label htmlFor="dx-complaint" className="field-label">Chief complaint</label>
                  <input id="dx-complaint" value={complaint} onChange={e => setComplaint(e.target.value)} className="field-control" required />
                </div>
                <div>
                  <label htmlFor="dx-notes" className="field-label">Examination & notes</label>
                  <textarea id="dx-notes" rows={5} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} className="field-control resize-y" required />
                </div>
                <div>
                  <label htmlFor="dx-diagnosis" className="field-label">Diagnosis <span className="font-normal text-ink-400">(optional)</span></label>
                  <input id="dx-diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="field-control" />
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                  <Button variant="ghost" type="button" onClick={sendBack} isLoading={busy === 'send-back'} disabled={busy !== null}>
                    Send back to waiting
                  </Button>
                  <Button type="submit" leftIcon={<CheckCircle2 className="h-4 w-4" />} isLoading={busy === 'complete'} loadingText="Saving…" disabled={busy !== null}>
                    Complete consultation
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-ink-500">This consultation is {APPOINTMENT_BADGE[current.status].label.toLowerCase()}. Notes are read-only.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
