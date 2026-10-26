import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, FileImage, FileText, Replace, Search, Upload } from 'lucide-react';
import { Alert } from '../common/Alert';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { SkeletonRows } from '../common/Skeleton';
import { getHospitalTodayDate } from '../../lib/tokens';
import { formatBytes } from '../../lib/preparePdf';
import { MedicalDocumentRow, PatientRow, RECORD_TYPES, RecordType, recordTypeLabel, receptionService, UploadStage } from '../../services/receptionService';
import { Appointment } from '../../types';

const fmtDate = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');

/** List of medical documents with view / replace actions. Access is enforced by storage RLS, not by these buttons. */
export const RecordsList: React.FC<{
  docs: MedicalDocumentRow[] | null;
  error?: string | null;
  showPatient?: boolean;
  onReplace?: (doc: MedicalDocumentRow) => void;
  onVerify?: (doc: MedicalDocumentRow) => Promise<void>;
  empty?: string;
}> = ({ docs, error, showPatient, onReplace, onVerify, empty = 'No documents uploaded yet.' }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const run = async (id: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(id);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ type: 'success', text: ok });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Action failed.' });
    } finally {
      setBusy(null);
    }
  };

  if (error) return <Alert type="error">{error}</Alert>;
  if (docs === null) return <SkeletonRows rows={3} label="Loading documents" />;
  if (docs.length === 0) return <p className="py-6 text-center text-sm text-ink-500">{empty}</p>;

  return (
    <div className="space-y-2">
      {msg && <Alert type={msg.type} className="text-sm">{msg.text}</Alert>}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {docs.map(d => {
          const image = d.mime_type.startsWith('image/');
          return (
            <li key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
                {image ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-ink-900">
                  <span className="truncate">{d.title}</span>
                  <Badge size="sm" variant="sky-blue">{recordTypeLabel(d.document_type)}</Badge>
                  {d.superseded_by_id ? (
                    <Badge size="sm" variant="neutral">Replaced</Badge>
                  ) : d.verification_status === 'verified' ? (
                    <Badge size="sm" variant="success">Doctor verified</Badge>
                  ) : (
                    <Badge size="sm" variant="warning">Awaiting doctor</Badge>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  {showPatient && d.patient && <>{d.patient.full_name} ({d.patient.patient_id}) · </>}
                  Record date {fmtDate(d.record_date)} · uploaded {fmtDate(d.created_at)} by {d.uploader_name || d.uploader_role}
                  {d.appointment && ` · token #${d.appointment.token_number} on ${fmtDate(d.appointment.appointment_date)}`}
                  {' · '}
                  {image ? d.mime_type.replace('image/', '').toUpperCase() : 'PDF'} {formatBytes(d.file_size)}
                </p>
                {(d.notes || d.replace_reason) && <p className="mt-0.5 text-[13px] text-ink-600">{d.replace_reason ? `Replacement: ${d.replace_reason}` : d.notes}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Button size="sm" variant="ghost" leftIcon={<Eye className="h-4 w-4" />} disabled={busy !== null} isLoading={busy === `open-${d.id}`} onClick={() => run(`open-${d.id}`, () => receptionService.openDocument(d.storage_key))}>
                  View
                </Button>
                {onVerify && d.verification_status !== 'verified' && !d.superseded_by_id && (
                  <Button size="sm" variant="accent" leftIcon={<CheckCircle2 className="h-4 w-4" />} disabled={busy !== null} isLoading={busy === `verify-${d.id}`} loadingText="Verifying…" onClick={() => run(`verify-${d.id}`, () => onVerify(d), 'Verified. The patient can now see it.')}>
                    Verify for patient
                  </Button>
                )}
                {onReplace && !d.superseded_by_id && (
                  <Button size="sm" variant="ghost" leftIcon={<Replace className="h-4 w-4" />} disabled={busy !== null} onClick={() => onReplace(d)}>
                    Replace
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** Search and pick a patient (name, phone or patient ID). */
export const PatientPicker: React.FC<{ onPick: (p: PatientRow) => void; autoFocus?: boolean }> = ({ onPick, autoFocus }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PatientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRows(null);
      return;
    }
    const t = setTimeout(() => {
      receptionService.searchPatients(q).then(r => { setRows(r); setError(null); }).catch(e => setError(e instanceof Error ? e.message : 'Search failed.'));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <label htmlFor="patient-search" className="sr-only">Search patients</label>
        <input id="patient-search" autoFocus={autoFocus} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, mobile number or patient ID" className="field-control pl-10" />
      </div>
      {error && <Alert type="error" className="mt-2 text-sm">{error}</Alert>}
      {rows && (
        rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No patients match “{q.trim()}”.</p>
        ) : (
          <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-white">
            {rows.map(p => (
              <li key={p.id}>
                <button type="button" onClick={() => onPick(p)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-50/60">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink-900">{p.full_name}</span>
                    <span className="block text-[13px] text-ink-500">
                      <span className="font-mono">{p.patient_id}</span> · +91 {p.phone}{p.profile_id ? ' · online account' : ''}
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold text-brand-700">Select</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};

const STAGE: Record<UploadStage, string> = { checking: 'Checking file…', uploading: 'Uploading…', saving: 'Saving…' };

/** Upload a scanned prescription or other record for one patient (optionally one appointment). */
export const UploadRecordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  patient?: PatientRow | null;
  appointment?: Appointment | null;
  replaces?: MedicalDocumentRow | null;
}> = ({ isOpen, onClose, onUploaded, patient: fixedPatient, appointment, replaces }) => {
  const today = getHospitalTodayDate();
  const [patient, setPatient] = useState<PatientRow | null>(fixedPatient ?? null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentId, setAppointmentId] = useState<string>(appointment?.id ?? '');
  const [type, setType] = useState<RecordType>((replaces?.document_type as RecordType) ?? 'prescription');
  const [title, setTitle] = useState(replaces?.title ?? '');
  const [recordDate, setRecordDate] = useState(appointment?.appointmentDate && appointment.appointmentDate <= today ? appointment.appointmentDate : today);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Fresh form each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setPatient(fixedPatient ?? null);
    setAppointmentId(appointment?.id ?? replaces?.appointment_id ?? '');
    setType((replaces?.document_type as RecordType) ?? 'prescription');
    setTitle(replaces?.title ?? '');
    setNotes('');
    setReason('');
    setFile(null);
    setError(null);
    setDone(null);
  }, [isOpen, fixedPatient, appointment, replaces]);

  useEffect(() => {
    if (!patient) return setAppointments([]);
    receptionService.patientAppointments(patient.id).then(setAppointments).catch(() => setAppointments([]));
  }, [patient]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!patient) return setError('Choose the patient first.');
    if (!file) return setError('Choose a PDF, JPG or PNG file.');
    if (!title.trim()) return setError('Give the document a short name, e.g. “OPD prescription”.');
    if (replaces && !reason.trim()) return setError('Say why the earlier file is being replaced.');
    try {
      const r = await receptionService.uploadDocument(
        { patientProfileId: patient.id, appointmentId: appointmentId || null, type, title: title.trim(), file, recordDate: recordDate || null, notes, replacesId: replaces?.id, replaceReason: reason },
        setStage
      );
      const size = r.finalSize < r.originalSize ? `${formatBytes(r.originalSize)} → ${formatBytes(r.finalSize)}` : formatBytes(r.finalSize);
      setDone(`Uploaded for ${patient.full_name} (${size}). ${type === 'prescription' ? 'The doctor verifies it before the patient can see it.' : ''}`);
      setFile(null);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setStage(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={replaces ? 'Replace document' : 'Upload record'} description={replaces ? 'The earlier file is kept in the history and marked as replaced.' : 'PDF, JPG or PNG, up to 10 MB. Stored privately.'} maxWidth="xl">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}
        {done && <Alert type="success">{done}</Alert>}

        {patient ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3 text-sm ring-1 ring-line">
            <span>
              <strong className="text-ink-900">{patient.full_name}</strong> <span className="font-mono text-ink-500">{patient.patient_id}</span> · +91 {patient.phone}
            </span>
            {!fixedPatient && !replaces && <Button type="button" size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>}
          </div>
        ) : (
          <div>
            <span className="field-label">Patient</span>
            <PatientPicker onPick={setPatient} autoFocus />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rec-type" className="field-label">Record type</label>
            <select id="rec-type" value={type} onChange={e => setType(e.target.value as RecordType)} className="field-control">
              {RECORD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rec-date" className="field-label">Record date</label>
            <input id="rec-date" type="date" max={today} value={recordDate} onChange={e => setRecordDate(e.target.value)} className="field-control" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rec-title" className="field-label">Document name</label>
            <input id="rec-title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="e.g. OPD prescription — Dr Sharma" className="field-control" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rec-appt" className="field-label">Linked appointment <span className="font-normal text-ink-400">(optional)</span></label>
            <select id="rec-appt" value={appointmentId} onChange={e => setAppointmentId(e.target.value)} className="field-control" disabled={!patient}>
              <option value="">Not linked — general medical record</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>{fmtDate(a.appointmentDate)} · token #{a.tokenNumber}{a.bookingReference ? ` · ${a.bookingReference}` : ''}</option>
              ))}
            </select>
          </div>
          {replaces && (
            <div className="sm:col-span-2">
              <label htmlFor="rec-reason" className="field-label">Reason for replacing “{replaces.title}”</label>
              <input id="rec-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Wrong page scanned" className="field-control" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="rec-notes" className="field-label">Notes <span className="font-normal text-ink-400">(optional)</span></label>
            <input id="rec-notes" value={notes} maxLength={500} onChange={e => setNotes(e.target.value)} className="field-control" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rec-file" className="field-label">File</label>
            <input
              id="rec-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-800"
            />
            {file && <p className="field-hint">{file.name} · {formatBytes(file.size)}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={stage !== null}>Close</Button>
          <Button type="submit" leftIcon={<Upload className="h-4 w-4" />} isLoading={stage !== null} loadingText={stage ? STAGE[stage] : 'Working…'} disabled={!patient || !file}>
            {replaces ? 'Upload replacement' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
