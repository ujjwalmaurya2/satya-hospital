import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search, Upload, UserPlus } from 'lucide-react';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { Button, LinkButton } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SkeletonRows } from '../../components/common/Skeleton';
import { APPOINTMENT_BADGE, PageHeader, Panel, Segmented, StatCard, Tabs } from '../../components/dashboard/Dashboard';
import { EnquiriesPanel } from '../../components/staff/EnquiriesPanel';
import { PatientPicker, RecordsList, UploadRecordModal } from '../../components/staff/MedicalRecords';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getHospitalTodayDate } from '../../lib/tokens';
import { DateFilter, rangeFor, rangeLabel } from '../../lib/dateFilters';
import { to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';
import { queueService } from '../../services/queueService';
import { DaySummary, MedicalDocumentRow, PatientRow, RECORD_TYPES, receptionService } from '../../services/receptionService';
import { Appointment, AppointmentStatus } from '../../types';

type Tab = 'appointments' | 'patients' | 'records' | 'enquiries';
const PAGE = 25;

const fmtDate = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');
const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');

/** Payment wording from the existing fields; payment stays separate from appointment status. */
function paymentOf(a: Appointment): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  if (a.paymentProvider === 'razorpay' && a.paymentStatus === 'paid') return { label: 'Paid online', variant: 'success' };
  if (a.feePaymentMode) return { label: `Paid at desk (${a.feePaymentMode.toUpperCase()})`, variant: 'success' };
  if (a.paymentStatus === 'pay_at_reception') return { label: 'Pay at reception', variant: 'warning' };
  return { label: a.paymentStatus === 'paid' ? 'Paid' : 'Unpaid', variant: a.paymentStatus === 'paid' ? 'success' : 'neutral' };
}

const toPatient = (a: Appointment): PatientRow => ({
  id: a.patientProfileId, patient_id: a.patientId, full_name: a.patientName, phone: a.patientPhone, gender: null, dob: null, profile_id: null, created_at: a.createdAt,
});

/**
 * Reception workspace: appointments on any date (same rows the Doctor panel
 * and queue desk use), patient lookup, and private medical records. Every
 * control reads or writes the live database; nothing here is sample data.
 */
export const ReceptionDashboard: React.FC = () => {
  const { isLiveSession } = useAuth();
  const { settings } = useHospital();
  const live = isSupabaseConfigured && isLiveSession;
  const [tab, setTab] = useState<Tab>('appointments');
  const [newEnquiries, setNewEnquiries] = useState(0);
  const [openPatient, setOpenPatient] = useState<PatientRow | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reception"
        title="Appointments & records"
        description={`Every booking, any date · OPD from ${to12h(settings.opdStartTime)}, online booking closes ${to12h(settings.onlineCutoffTime)} IST`}
        actions={<LinkButton to="/staff" variant="accent" leftIcon={<UserPlus className="h-4 w-4" />}>Walk-in & queue desk</LinkButton>}
      />
      {!live && (
        <Alert type="warning" title="Not connected to the hospital database">
          Appointments, patients and records need a signed-in staff account on the live system. Only enquiries are available in this session.
        </Alert>
      )}

      <Panel flush>
        <Tabs
          label="Reception sections"
          layoutId="reception-tab"
          value={tab}
          onChange={setTab}
          className="px-3 sm:px-4"
          items={[
            { id: 'appointments', label: 'Appointments' },
            { id: 'patients', label: 'Patients' },
            { id: 'records', label: 'Records' },
            { id: 'enquiries', label: 'Enquiries', count: newEnquiries },
          ]}
        />
        {tab === 'appointments' && live && <AppointmentsView onOpenPatient={p => { setOpenPatient(p); setTab('patients'); }} />}
        {tab === 'patients' && live && <PatientsView initial={openPatient} />}
        {tab === 'records' && live && <RecordsView />}
        {tab === 'enquiries' && <EnquiriesPanel onCount={setNewEnquiries} />}
        {tab !== 'enquiries' && !live && <p className="p-6 text-sm text-ink-500">Sign in with a staff account to use this section.</p>}
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------ appointments
const QUICK: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
  { id: 'date', label: 'Pick a date' },
  { id: 'range', label: 'Date range' },
];

const AppointmentsView: React.FC<{ onOpenPatient: (p: PatientRow) => void }> = ({ onOpenPatient }) => {
  const today = getHospitalTodayDate();
  const [filter, setFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [type, setType] = useState<'online' | 'walk_in' | ''>('');
  const [payment, setPayment] = useState<'paid' | 'unpaid' | ''>('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; rows: Appointment[] } | null>(null);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const range = useMemo(() => rangeFor(filter, today, { date: customDate, from: rangeFrom, to: rangeTo }), [filter, today, customDate, rangeFrom, rangeTo]);
  // Single-day views summarise that day; wider views summarise today.
  const summaryDate = range.from && range.from === range.to ? range.from : today;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  // Filters change the result set, so go back to the first page (search/status filters are kept).
  useEffect(() => setPage(0), [range.from, range.to, debounced, status, type, payment, sort]);

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const [res, sum] = await Promise.all([
        receptionService.searchAppointments({
          from: range.from, to: range.to, statuses: status ? [status] : [], queueType: type || null, payment: payment || null,
          query: debounced, sort, limit: PAGE, offset: page * PAGE,
        }),
        receptionService.summary(summaryDate),
      ]);
      if (id !== reqId.current) return; // a newer filter change won
      setData(res);
      setSummary(sum);
      setError(null);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'Could not load appointments.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [range.from, range.to, status, type, payment, debounced, sort, page, summaryDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: any change by Reception, the Doctor or online booking refreshes the list.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const unsubscribe = receptionService.subscribe(() => {
      clearTimeout(t);
      t = setTimeout(() => void load(), 400);
    });
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <div>
      {/* Summary cards (real counts for the selected day) */}
      <div className="grid grid-cols-2 gap-3 border-b border-line p-4 sm:grid-cols-4 sm:px-6 xl:grid-cols-7">
        <StatCard label={summaryDate === today ? 'Today' : fmtDate(summaryDate)} value={summary?.total ?? '—'} hint={summary ? `${summary.online} online · ${summary.walk_in} walk-in` : ' '} />
        <StatCard label="Booked, not arrived" value={summary?.booked ?? '—'} hint="Confirmed bookings" />
        <StatCard label="Arrived / waiting" value={summary?.checked_in ?? '—'} hint="Checked in" tone="warning" />
        <StatCard label="With doctor" value={summary?.in_consultation ?? '—'} hint="In consultation" tone="brand" />
        <StatCard label="Completed" value={summary?.completed ?? '—'} hint="Seen by doctor" tone="leaf" />
        <StatCard label="Cancelled / no-show" value={summary ? summary.cancelled + summary.no_show : '—'} hint={summary ? `${summary.cancelled} cancelled · ${summary.no_show} no-show` : ' '} />
        <StatCard label="Upcoming" value={summary?.upcoming ?? '—'} hint={`After ${fmtDate(summaryDate)}`} />
      </div>

      {/* Date filters */}
      <div className="space-y-3 border-b border-line p-4 sm:px-6">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Appointment dates">
          {QUICK.map(f => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn('h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors', filter === f.id ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line bg-white text-ink-600 hover:border-brand-300')}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filter === 'date' && (
          <div>
            <label htmlFor="r-date" className="field-label">Date</label>
            <input id="r-date" type="date" value={customDate} onChange={e => setCustomDate(e.target.value || today)} className="field-control w-auto" />
          </div>
        )}
        {filter === 'range' && (
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="r-from" className="field-label">From</label>
              <input id="r-from" type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="field-control w-auto" />
            </div>
            <div>
              <label htmlFor="r-to" className="field-label">To (included)</label>
              <input id="r-to" type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="field-control w-auto" />
            </div>
          </div>
        )}

        {/* Search + filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <label htmlFor="r-search" className="sr-only">Search appointments</label>
            <input id="r-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, phone, booking ID or patient ID" className="field-control pl-10" />
          </div>
          <Select id="r-status" label="Status" value={status} onChange={v => setStatus(v as AppointmentStatus | '')} options={[['', 'All statuses'], ...Object.entries(APPOINTMENT_BADGE).map(([k, v]) => [k, v.label] as [string, string])]} />
          <Select id="r-type" label="Type" value={type} onChange={v => setType(v as typeof type)} options={[['', 'Online & walk-in'], ['online', 'Online'], ['walk_in', 'Walk-in']]} />
          <Select id="r-pay" label="Payment" value={payment} onChange={v => setPayment(v as typeof payment)} options={[['', 'Any payment'], ['paid', 'Paid'], ['unpaid', 'Not paid yet']]} />
          <Select id="r-sort" label="Sort" value={sort} onChange={v => setSort(v as typeof sort)} options={[['asc', 'Date: earliest first'], ['desc', 'Date: latest first']]} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-ink-700">
            <strong className="font-semibold text-ink-900">{rangeLabel(range)}</strong>
            {data && <span className="text-ink-500"> · {data.total} appointment{data.total === 1 ? '' : 's'}</span>}
          </p>
          <Button size="sm" variant="ghost" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={loading} loadingText="Loading…">Refresh</Button>
        </div>
      </div>

      {error && (
        <div className="p-4 sm:px-6">
          <Alert type="error" title="Couldn’t load appointments" action={<Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</Alert>
        </div>
      )}

      {!data && loading ? (
        <SkeletonRows rows={5} label="Loading appointments" />
      ) : data && data.rows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">No appointments match these filters</p>
          <p className="mt-1 text-sm text-ink-500">Try another date, or clear the search and status filters.</p>
        </div>
      ) : data ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Appointments for {rangeLabel(range)}</caption>
              <thead className="border-b border-line bg-ink-50/60 text-[12px] uppercase tracking-wide text-ink-500">
                <tr>
                  {['Token / booking', 'Patient', 'Phone', 'Date', 'Time', 'Type', 'Payment', 'Status', ''].map(h => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map(a => {
                  const pay = paymentOf(a);
                  return (
                    <tr key={a.id} className="hover:bg-ink-50/40">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-ink-900">#{a.tokenNumber}</span>
                        <span className="block font-mono text-xs text-ink-500">{a.bookingReference || a.appointmentCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink-900">{a.patientName || 'Unnamed patient'}</span>
                        {a.patientId && <span className="block font-mono text-xs text-brand-700">{a.patientId}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-700">{a.contactPhone || a.patientPhone || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-700">{fmtDate(a.appointmentDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-600">
                        {a.checkedInAt ? `Arrived ${fmtTime(a.checkedInAt)}` : `Booked ${fmtTime(a.createdAt)}`}
                      </td>
                      <td className="px-4 py-3"><Badge size="sm" variant={a.queueType === 'online' ? 'sky-blue' : 'peach'}>{a.queueType === 'online' ? 'Online' : 'Walk-in'}</Badge></td>
                      <td className="px-4 py-3"><Badge size="sm" variant={pay.variant}>{pay.label}</Badge></td>
                      <td className="px-4 py-3"><Badge size="sm" dot variant={APPOINTMENT_BADGE[a.status].variant}>{APPOINTMENT_BADGE[a.status].label}</Badge></td>
                      <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(a)}>View</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Phone / tablet cards */}
          <ul className="divide-y divide-line lg:hidden">
            {data.rows.map(a => {
              const pay = paymentOf(a);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelected(a)} className="flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left hover:bg-ink-50/40 sm:px-6">
                    <span className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-800 font-mono text-sm font-bold text-white">#{a.tokenNumber}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-900">{a.patientName || 'Unnamed patient'}</span>
                      <span className="block text-[13px] text-ink-500">{fmtDate(a.appointmentDate)} · {a.contactPhone || a.patientPhone || 'no phone'}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge size="sm" dot variant={APPOINTMENT_BADGE[a.status].variant}>{APPOINTMENT_BADGE[a.status].label}</Badge>
                        <Badge size="sm" variant={a.queueType === 'online' ? 'sky-blue' : 'peach'}>{a.queueType === 'online' ? 'Online' : 'Walk-in'}</Badge>
                        <Badge size="sm" variant={pay.variant}>{pay.label}</Badge>
                      </span>
                    </span>
                    <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm sm:px-6">
              <Button size="sm" variant="ghost" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
              <span className="text-ink-500">Page {page + 1} of {pages}</span>
              <Button size="sm" variant="ghost" disabled={page + 1 >= pages || loading} onClick={() => setPage(p => p + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button>
            </div>
          )}
        </>
      ) : null}

      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onChanged={load} onOpenPatient={p => { setSelected(null); onOpenPatient(p); }} />
    </div>
  );
};

const Select: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ id, label, value, onChange, options }) => (
  <div>
    <label htmlFor={id} className="sr-only">{label}</label>
    <select id={id} value={value} onChange={e => onChange(e.target.value)} className="field-control" aria-label={label}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

// ------------------------------------------------------------------ appointment detail
const AppointmentDetail: React.FC<{
  appointment: Appointment | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onOpenPatient: (p: PatientRow) => void;
}> = ({ appointment, onClose, onChanged, onOpenPatient }) => {
  const { role } = useAuth();
  const [appt, setAppt] = useState<Appointment | null>(appointment);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<Appointment[] | null>(null);
  const [docs, setDocs] = useState<MedicalDocumentRow[] | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [upload, setUpload] = useState<{ replaces?: MedicalDocumentRow } | null>(null);

  const loadRelated = useCallback(async (a: Appointment) => {
    setDocsError(null);
    try {
      const [h, d] = await Promise.all([receptionService.patientAppointments(a.patientProfileId), receptionService.documents({ patientProfileId: a.patientProfileId })]);
      setHistory(h);
      setDocs(d);
      const fresh = h.find(x => x.id === a.id);
      if (fresh) setAppt(fresh);
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'Could not load records.');
    }
  }, []);

  useEffect(() => {
    setAppt(appointment);
    setMsg(null);
    setHistory(null);
    setDocs(null);
    if (appointment) {
      setPhone(appointment.contactPhone || appointment.patientPhone || '');
      setNotes(appointment.receptionNotes || '');
      void loadRelated(appointment);
    }
  }, [appointment, loadRelated]);

  if (!appt) return null;
  const pay = paymentOf(appt);

  const act = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn(); // the UI changes only after the server confirms
      await Promise.all([onChanged(), loadRelated(appt)]);
      setMsg({ type: 'success', text: ok });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Action failed.' });
    } finally {
      setBusy(null);
    }
  };
  const status = (s: AppointmentStatus, label: string, reason?: string) => act(s, () => queueService.setStatus(appt.id, s, reason), `Token #${appt.tokenNumber} ${label}.`);

  return (
    <Modal isOpen onClose={onClose} title={appt.patientName || 'Appointment'} description={`Token #${appt.tokenNumber} · ${fmtDate(appt.appointmentDate)} · ${appt.queueType === 'online' ? 'Online booking' : 'Walk-in'}`} maxWidth="2xl">
      <div className="space-y-6">
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Info label="Patient ID" value={appt.patientId || '—'} mono />
          <Info label="Booking ID" value={appt.bookingReference || appt.appointmentCode} mono />
          <Info label="Status" value={APPOINTMENT_BADGE[appt.status].label} />
          <Info label="Payment" value={pay.label} />
          <Info label="Booked at" value={`${fmtDate(appt.createdAt)} ${fmtTime(appt.createdAt)}`} />
          <Info label="Arrived" value={appt.checkedInAt ? fmtTime(appt.checkedInAt) : '—'} />
          <Info label="Reason for visit" value={appt.visitReason || appt.notes || '—'} />
          {appt.cancellationReason && <Info label="Cancellation reason" value={appt.cancellationReason} />}
          {appt.doctorName && <Info label="Doctor" value={appt.doctorName} />}
        </dl>

        {/* Status: Reception confirms arrival / no-show / cancels. Completing a consultation is the doctor's. */}
        <div className="flex flex-wrap gap-2">
          {(appt.status === 'booked' || appt.status === 'no_show') && (
            <Button size="sm" isLoading={busy === 'checked_in'} disabled={busy !== null} onClick={() => status('checked_in', 'checked in')}>Mark arrived</Button>
          )}
          {appt.status === 'booked' && (
            <Button size="sm" variant="outline" isLoading={busy === 'no_show'} disabled={busy !== null} onClick={() => window.confirm(`Mark token #${appt.tokenNumber} (${appt.patientName}) as a no-show?`) && status('no_show', 'marked no-show')}>No-show</Button>
          )}
          {(appt.status === 'booked' || appt.status === 'checked_in') && (
            <Button
              size="sm"
              variant="ghost"
              isLoading={busy === 'cancelled'}
              disabled={busy !== null}
              onClick={() => {
                const reason = window.prompt(`Cancel token #${appt.tokenNumber} for ${appt.patientName}? Enter a reason:`)?.trim();
                if (reason) void status('cancelled', 'cancelled', reason);
              }}
            >
              Cancel appointment
            </Button>
          )}
          {appt.status === 'in_consultation' && <span className="text-sm text-brand-700">With the doctor{role === 'admin' ? ' — complete it from the Doctor panel.' : '.'}</span>}
          {appt.paymentProvider === 'razorpay' && appt.status === 'cancelled' && (
            <span className="text-[13px] text-warning-700">Paid online: any refund is handled by the Super Admin, not from this screen.</span>
          )}
        </div>

        {/* Corrections and desk notes (no clinical fields) */}
        {(role === 'reception' || role === 'admin') && (
          <form
            className="grid grid-cols-1 gap-3 rounded-2xl bg-ink-50/70 p-4 ring-1 ring-inset ring-line sm:grid-cols-3"
            onSubmit={e => {
              e.preventDefault();
              void act('details', () => receptionService.updateDetails(appt.id, phone, notes), 'Details saved.');
            }}
          >
            <div>
              <label htmlFor="d-phone" className="field-label">Contact mobile</label>
              <input id="d-phone" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="field-control" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="d-notes" className="field-label">Reception notes</label>
              <input id="d-notes" value={notes} maxLength={1000} onChange={e => setNotes(e.target.value)} placeholder="e.g. Called to confirm, will arrive late" className="field-control" />
            </div>
            <div className="flex justify-end sm:col-span-3">
              <Button type="submit" size="sm" variant="soft" isLoading={busy === 'details'} disabled={busy !== null}>Save details</Button>
            </div>
          </form>
        )}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-900">Medical records</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" rightIcon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => onOpenPatient(toPatient(appt))}>Patient file</Button>
              <Button size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUpload({})}>Upload record</Button>
            </div>
          </div>
          <div className="mt-2">
            <RecordsList docs={docs} error={docsError} onReplace={d => setUpload({ replaces: d })} empty="No records for this patient yet." />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink-900">Previous appointments</h3>
          {history === null ? (
            <SkeletonRows rows={2} label="Loading history" />
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
              {history.filter(h => h.id !== appt.id).slice(0, 10).map(h => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>{fmtDate(h.appointmentDate)} · token #{h.tokenNumber}</span>
                  <Badge size="sm" variant={APPOINTMENT_BADGE[h.status].variant}>{APPOINTMENT_BADGE[h.status].label}</Badge>
                </li>
              ))}
              {history.filter(h => h.id !== appt.id).length === 0 && <li className="px-4 py-3 text-sm text-ink-500">No other appointments.</li>}
            </ul>
          )}
        </section>
      </div>

      <UploadRecordModal
        isOpen={upload !== null}
        onClose={() => setUpload(null)}
        onUploaded={() => void loadRelated(appt)}
        patient={toPatient(appt)}
        appointment={appt}
        replaces={upload?.replaces ?? null}
      />
    </Modal>
  );
};

const Info: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0">
    <dt className="text-[13px] text-ink-500">{label}</dt>
    <dd className={cn('break-words font-medium text-ink-900', mono && 'font-mono text-[13px]')}>{value}</dd>
  </div>
);

// ------------------------------------------------------------------ patients
const PatientsView: React.FC<{ initial: PatientRow | null }> = ({ initial }) => {
  const [patient, setPatient] = useState<PatientRow | null>(initial);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [docs, setDocs] = useState<MedicalDocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ replaces?: MedicalDocumentRow } | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p: PatientRow) => {
    setError(null);
    try {
      const [full, a, d] = await Promise.all([receptionService.patient(p.id), receptionService.patientAppointments(p.id), receptionService.documents({ patientProfileId: p.id })]);
      if (full) setPatient(full);
      setAppointments(a);
      setDocs(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this patient.');
    }
  }, []);

  useEffect(() => {
    setPatient(initial);
  }, [initial]);
  useEffect(() => {
    setAppointments(null);
    setDocs(null);
    setMsg(null);
    if (patient) void load(patient);
  }, [patient?.id]);

  // Uses the existing walk-in RPC, which reuses this patient (matched on name + phone) instead of creating a duplicate.
  const walkIn = async () => {
    if (!patient || !window.confirm(`Issue today's walk-in token to ${patient.full_name}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await queueService.registerWalkIn({ fullName: patient.full_name, phone: patient.phone, gender: (patient.gender as 'male' | 'female' | 'other') || 'other' });
      setMsg({ type: 'success', text: `Token #${r.tokenNumber} issued for today.` });
      await load(patient);
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Could not issue a token.' });
    } finally {
      setBusy(false);
    }
  };

  if (!patient) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <PatientPicker onPick={setPatient} />
        <p className="text-[13px] text-ink-500">
          New patient? Register them as a walk-in from the <Link to="/staff" className="link">queue desk</Link> — an existing record with the same name and mobile is reused, not duplicated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <button type="button" onClick={() => setPatient(null)} className="link inline-flex cursor-pointer items-center gap-1 text-sm"><ChevronLeft className="h-4 w-4" /> Search another patient</button>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-ink-900">{patient.full_name}</p>
          <p className="text-sm text-ink-500">
            <span className="font-mono">{patient.patient_id}</span> · +91 {patient.phone}
            {patient.gender && ` · ${patient.gender}`}
            {patient.dob && ` · born ${fmtDate(patient.dob)}`}
            {patient.profile_id ? ' · has an online account' : ' · registered at the desk'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" isLoading={busy} onClick={walkIn}>Walk-in token today</Button>
          <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUpload({})}>Upload record</Button>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-ink-900">Appointments</h3>
        {appointments === null ? <SkeletonRows rows={3} label="Loading appointments" /> : appointments.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No appointments yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
            {appointments.map(a => (
              <li key={a.id}>
                <button type="button" onClick={() => setSelected(a)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-ink-50/50">
                  <span>{fmtDate(a.appointmentDate)} · token #{a.tokenNumber} · {a.queueType === 'online' ? 'Online' : 'Walk-in'}</span>
                  <Badge size="sm" variant={APPOINTMENT_BADGE[a.status].variant}>{APPOINTMENT_BADGE[a.status].label}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink-900">Medical records</h3>
        <div className="mt-2"><RecordsList docs={docs} onReplace={d => setUpload({ replaces: d })} empty="No records uploaded for this patient." /></div>
      </section>

      <UploadRecordModal isOpen={upload !== null} onClose={() => setUpload(null)} onUploaded={() => void load(patient)} patient={patient} replaces={upload?.replaces ?? null} />
      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onChanged={() => load(patient)} onOpenPatient={() => setSelected(null)} />
    </div>
  );
};

// ------------------------------------------------------------------ records
const RecordsView: React.FC = () => {
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showReplaced, setShowReplaced] = useState(false);
  const [docs, setDocs] = useState<MedicalDocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ replaces?: MedicalDocumentRow } | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    setDocs(null);
    setError(null);
    try {
      setDocs(await receptionService.documents({ patientProfileId: patient?.id, type: type || undefined, from: from || undefined, to: to || undefined, includeReplaced: showReplaced }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load records.');
    }
  }, [patient, type, from, to, showReplaced]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <span className="field-label">Patient</span>
          {patient ? (
            <div className="flex items-center gap-2 text-sm">
              <strong className="text-ink-900">{patient.full_name}</strong> <span className="font-mono text-ink-500">{patient.patient_id}</span>
              <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>All patients</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" leftIcon={<Search className="h-4 w-4" />} onClick={() => setPicking(true)}>Find a patient</Button>
          )}
        </div>
        <div>
          <label htmlFor="rv-type" className="field-label">Type</label>
          <select id="rv-type" value={type} onChange={e => setType(e.target.value)} className="field-control w-auto">
            <option value="">All types</option>
            {RECORD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rv-from" className="field-label">Record date from</label>
          <input id="rv-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="field-control w-auto" />
        </div>
        <div>
          <label htmlFor="rv-to" className="field-label">to</label>
          <input id="rv-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="field-control w-auto" />
        </div>
        <label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showReplaced} onChange={e => setShowReplaced(e.target.checked)} className="accent-brand-700" /> Show replaced versions</label>
        <Button className="ml-auto" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUpload({})}>Upload record</Button>
      </div>
      <p className="text-[13px] text-ink-500">Latest 100 documents{patient ? ` for ${patient.full_name}` : ''}. Pathology lab reports are managed on the Pathology orders desk.</p>
      <RecordsList docs={docs} error={error} showPatient={!patient} onReplace={d => setUpload({ replaces: d })} empty="No documents match these filters." />

      <Modal isOpen={picking} onClose={() => setPicking(false)} title="Find a patient">
        <PatientPicker autoFocus onPick={p => { setPatient(p); setPicking(false); }} />
      </Modal>
      <UploadRecordModal
        isOpen={upload !== null}
        onClose={() => setUpload(null)}
        onUploaded={() => void load()}
        patient={upload?.replaces ? (upload.replaces.patient ? { id: upload.replaces.patient_profile_id, patient_id: upload.replaces.patient.patient_id, full_name: upload.replaces.patient.full_name, phone: '', gender: null, dob: null, profile_id: null, created_at: '' } : null) : patient}
        replaces={upload?.replaces ?? null}
      />
    </div>
  );
};
