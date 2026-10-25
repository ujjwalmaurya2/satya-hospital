import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BellRing, CheckCircle2, Clock, CreditCard, IndianRupee, RefreshCw, Search, UserCheck, UserPlus, UserX, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { SkeletonRows } from '../../components/common/Skeleton';
import { APPOINTMENT_BADGE, PageHeader, Panel, Segmented } from '../../components/dashboard/Dashboard';
import { useQueueDesk, ActionResult } from '../../hooks/useQueueDesk';
import { useAuth } from '../../context/AuthContext';
import { PaymentCasesPanel } from '../../components/staff/PaymentCasesPanel';
import { DEFAULT_CONSULTATION_FEE_INR, formatInr } from '../../lib/queue';
import { checkOnlineBookingCutoff, getDayName, isOperatingDay, isValidIndianPhone } from '../../lib/tokens';
import { to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';
import { Appointment, AppointmentStatus, FeePaymentMode } from '../../types';

type Filter = 'all' | 'waiting' | 'booked' | 'in_consultation' | 'completed' | 'no_show';

const FILTERS: { id: Filter; label: string; match: (a: Appointment) => boolean }[] = [
  { id: 'all', label: 'All', match: a => a.status !== 'cancelled' },
  { id: 'waiting', label: 'Checked-in', match: a => a.status === 'checked_in' },
  { id: 'booked', label: 'Booked', match: a => a.status === 'booked' },
  { id: 'in_consultation', label: 'In consultation', match: a => a.status === 'in_consultation' },
  { id: 'completed', label: 'Completed', match: a => a.status === 'completed' },
  { id: 'no_show', label: 'No-show', match: a => a.status === 'no_show' },
];

function timeOf(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

function bookedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `walkin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const QueueDesk: React.FC = () => {
  const desk = useQueueDesk();
  const reduce = useReducedMotion();
  const { summary, settings, today, istTime, viewDate, isToday } = desk;
  const { role } = useAuth();
  const fee = settings.consultationFee ?? DEFAULT_CONSULTATION_FEE_INR;

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const run = async (key: string, action: () => Promise<ActionResult>) => {
    setBusy(key);
    const res = await action();
    setBusy(null);
    setNotice(res.ok ? { type: 'success', text: res.message } : { type: 'error', text: res.error });
    return res;
  };

  const booking = useMemo(() => {
    if (!isOperatingDay(today, settings.operatingDays, settings.holidays)) {
      return { open: false, text: `No OPD scheduled today (${getDayName(today)})` };
    }
    const check = checkOnlineBookingCutoff(today, {
      cutoffTimeStr: settings.onlineCutoffTime,
      operatingDays: settings.operatingDays,
      holidays: settings.holidays,
      currentTime: istTime,
      baseDate: today,
    });
    const cutoff = to12h(settings.onlineCutoffTime);
    return check.allowed
      ? { open: true, text: `Online booking open until ${cutoff}` }
      : { open: false, text: `Online booking closed at ${cutoff} · walk-ins only` };
  }, [today, istTime, settings]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (a: Appointment) =>
    !q ||
    a.patientName.toLowerCase().includes(q) ||
    a.patientPhone.includes(q) ||
    (a.contactPhone ?? '').includes(q) ||
    (a.bookingReference ?? '').toLowerCase().includes(q) ||
    a.appointmentCode.toLowerCase().includes(q) ||
    String(a.tokenNumber) === q.replace('#', '');
  const visible = desk.appointments.filter(FILTERS.find(f => f.id === filter)!.match).filter(matchesQuery);
  const prettyDate = new Date(`${viewDate}T12:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });

  const stats = [
    { label: 'Registered', value: summary.total, hint: `${summary.online} online · ${summary.walkIn} walk-in` },
    { label: 'Waiting', value: summary.waiting, hint: 'Checked-in', accent: 'text-warning-700' },
    { label: 'Not arrived', value: summary.booked, hint: 'Booked online' },
    { label: 'Completed', value: summary.completed, hint: `${summary.inConsultation} in room`, accent: 'text-leaf-700' },
    { label: 'No-show', value: summary.noShow, hint: 'Can re-check-in' },
    { label: 'Fees collected', value: formatInr(summary.fees.totalInr), hint: `${summary.fees.cash} cash · ${summary.fees.upi} UPI`, accent: 'text-brand-700' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={prettyDate}
        title="OPD queue desk"
        description={
          <>
            OPD begins <strong className="font-semibold text-ink-800">{to12h(settings.opdStartTime)} IST</strong>
          </>
        }
        actions={
          <>
            <Badge variant={booking.open ? 'mint' : 'warning'} dot>
              {booking.text}
            </Badge>
            <Badge variant={desk.live ? 'medical-blue' : 'neutral'}>
              {desk.live ? <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> : <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />}
              {desk.live ? 'Live · synced' : 'Local demo data'}
            </Badge>
            {desk.live && (
              <Button variant="ghost" size="sm" onClick={() => desk.refresh()} leftIcon={<RefreshCw className="h-4 w-4" />} aria-label="Refresh queue">
                Refresh
              </Button>
            )}
          </>
        }
      />

      {desk.syncError && (
        <Alert type="error" title="Queue sync problem">
          {desk.syncError}
        </Alert>
      )}

      {/* Fixed toast: feedback never shifts the buttons staff are about to click. */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0">
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto rounded-xl shadow-float"
            >
              <Alert type={notice.type} title={notice.type === 'success' ? 'Done' : 'Action not completed'}>
                {notice.text}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Now serving + stats */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
        <section aria-label="Now serving" className="relative overflow-hidden rounded-2xl bg-ink-800 p-6 text-white shadow-card">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-brand-200">Now in consultation</p>
              <p className="mt-2 text-6xl font-bold leading-none tracking-tight tabular-nums">
                {summary.nowServing ? `#${summary.nowServing.tokenNumber}` : '—'}
              </p>
              <p className="mt-3 truncate text-sm text-white/80">{summary.nowServing?.patientName || 'No patient in the room'}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-medium text-white/50">Next up</p>
              <p className="mt-2 text-3xl font-semibold leading-none tabular-nums">{summary.nextUp ? `#${summary.nextUp.tokenNumber}` : '—'}</p>
              <p className="mt-2 max-w-[9rem] truncate text-xs text-white/60">{summary.nextUp?.patientName || 'Nobody checked in'}</p>
            </div>
          </div>
          <Button
            size="lg"
            className="relative mt-6 w-full bg-white text-ink-900 hover:bg-brand-50"
            leftIcon={<BellRing className="h-5 w-5 text-brand-600" />}
            disabled={!isToday || !summary.nextUp || busy !== null}
            isLoading={busy === 'call-next'}
            loadingText="Calling…"
            onClick={() => run('call-next', desk.callNext)}
          >
            Call next token
          </Button>
        </section>

        <section aria-label="Today's numbers" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-soft sm:grid-cols-3">
          {stats.map(s => (
            <div key={s.label} className="bg-white p-5">
              <p className="text-[13px] font-medium text-ink-500">{s.label}</p>
              <p className={cn('mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-ink-900', s.accent)}>{s.value}</p>
              <p className="mt-1 text-xs text-ink-500">{s.hint}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Queue + walk-in */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          flush
          title={isToday ? 'Today’s tokens' : `Tokens for ${prettyDate}`}
          description="Online and walk-in patients share one token sequence"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="queue-date" className="sr-only">Date</label>
              <input id="queue-date" type="date" value={viewDate} onChange={e => e.target.value && desk.setViewDate(e.target.value)} className="field-control h-9 w-auto py-0 text-[13px]" />
              {!isToday && (
                <Button variant="ghost" size="sm" onClick={() => desk.setViewDate(today)}>
                  Today
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              label="Filter by status"
              layoutId="queue-filter"
              value={filter}
              onChange={setFilter}
              items={FILTERS.map(f => ({ id: f.id, label: f.label, count: desk.appointments.filter(f.match).length }))}
            />
            <div className="relative lg:w-64">
              <label htmlFor="queue-search" className="sr-only">Search patients</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                id="queue-search"
                type="search"
                placeholder="Name, phone, reference, token"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="field-control h-9 py-0 pl-9 text-[13px]"
              />
            </div>
          </div>
          {desk.loading ? (
            <SkeletonRows rows={5} label="Loading today’s queue" />
          ) : visible.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-ink-500">
              {q ? 'No tokens match your search.' : filter === 'all' ? (isToday ? 'No tokens issued yet today.' : 'No tokens for this date.') : 'No tokens with this status.'}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {visible.map(appt => (
                  <QueueRow
                    key={appt.id}
                    appt={appt}
                    fee={appt.consultationFeeAmount ?? fee}
                    busyKey={busy}
                    onStatus={status => run(`${appt.id}:${status}`, () => desk.setStatus(appt, status))}
                    onFee={mode => run(`${appt.id}:fee`, () => desk.setFee(appt, mode))}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        {isToday ? (
          <WalkInForm today={today} onSubmit={input => desk.registerWalkIn(input)} />
        ) : (
          <Panel title="Walk-in registration">
            <p className="text-sm text-ink-600">Walk-in tokens can only be issued for today.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => desk.setViewDate(today)}>
              Back to today
            </Button>
          </Panel>
        )}
      </div>

      {desk.live && <PaymentCasesPanel today={today} canResolve={role === 'admin'} />}
    </div>
  );
};

interface QueueRowProps {
  appt: Appointment;
  fee: number;
  busyKey: string | null;
  onStatus: (status: AppointmentStatus) => void;
  onFee: (mode: FeePaymentMode | null) => void;
}

const QueueRow: React.FC<QueueRowProps> = ({ appt, fee, busyKey, onStatus, onFee }) => {
  const { role } = useAuth();
  const disabled = busyKey !== null;
  const loading = (status: AppointmentStatus) => busyKey === `${appt.id}:${status}`;
  const badge = APPOINTMENT_BADGE[appt.status];
  const inRoom = appt.status === 'in_consultation';

  return (
    <motion.li layout="position" initial={false} className={cn('px-5 py-4 sm:px-6', inRoom && 'bg-brand-50/50')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              'flex h-11 w-14 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold tabular-nums text-white',
              inRoom ? 'bg-brand-700' : 'bg-ink-800'
            )}
          >
            #{appt.tokenNumber}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold text-ink-900">{appt.patientName}</p>
              <Badge variant={badge.variant} size="sm" dot>
                {badge.label}
              </Badge>
              <Badge variant={appt.queueType === 'online' ? 'medical-blue' : 'mint'} size="sm">
                {appt.queueType === 'online' ? 'Online' : 'Walk-in'}
              </Badge>
            </div>
            <p className="mt-0.5 font-mono text-xs text-ink-500">
              {appt.bookingReference || appt.appointmentCode}
              {appt.patientPhone ? ` · +91 ${appt.patientPhone}` : ''}
              {appt.createdAt ? ` · booked ${bookedAt(appt.createdAt)}` : ''}
            </p>
            {(appt.visitReason || appt.notes) && <p className="mt-1 line-clamp-1 text-[13px] text-ink-600">{appt.visitReason || appt.notes}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          {appt.status === 'booked' && (
            <Button size="sm" variant="accent" leftIcon={<UserCheck className="h-4 w-4" />} disabled={disabled} isLoading={loading('checked_in')} onClick={() => onStatus('checked_in')}>
              Check-in
            </Button>
          )}
          {appt.status === 'in_consultation' && role === 'admin' && (
            <Button size="sm" variant="accent" leftIcon={<CheckCircle2 className="h-4 w-4" />} disabled={disabled} isLoading={loading('completed')} onClick={() => onStatus('completed')}>
              Mark completed
            </Button>
          )}
          {appt.status === 'in_consultation' && role !== 'admin' && <span className="text-xs font-medium text-brand-700">With the doctor</span>}
          {appt.status === 'no_show' && (
            <Button size="sm" variant="outline" leftIcon={<UserCheck className="h-4 w-4" />} disabled={disabled} isLoading={loading('checked_in')} onClick={() => onStatus('checked_in')}>
              Re-check-in
            </Button>
          )}
          {(appt.status === 'booked' || appt.status === 'checked_in' || appt.status === 'in_consultation') && (
            <Button size="sm" variant="ghost" leftIcon={<UserX className="h-4 w-4" />} disabled={disabled} isLoading={loading('no_show')} onClick={() => onStatus('no_show')}>
              No-show
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:pl-[72px]">
        {appt.paymentProvider === 'razorpay' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-3 py-1 text-xs font-semibold text-leaf-800 ring-1 ring-inset ring-leaf-200">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" /> Paid online{appt.amountPaid ? ` · ${formatInr(appt.amountPaid)}` : ''}
          </span>
        ) : (
          <FeeToggle mode={appt.feePaymentMode ?? null} fee={fee} disabled={disabled} onChange={onFee} />
        )}
        {appt.status === 'checked_in' && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Waiting since {timeOf(appt.checkedInAt || appt.updatedAt)}
          </span>
        )}
        {appt.status === 'completed' && <span className="text-xs font-medium text-leaf-700">Completed {timeOf(appt.completedAt || appt.updatedAt)}</span>}
      </div>
    </motion.li>
  );
};

const FeeToggle: React.FC<{ mode: FeePaymentMode | null; fee: number; disabled: boolean; onChange: (mode: FeePaymentMode | null) => void }> = ({
  mode,
  fee,
  disabled,
  onChange,
}) => {
  const options: { value: FeePaymentMode | null; label: string }[] = [
    { value: null, label: 'Unpaid' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
  ];
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center text-sm font-semibold tabular-nums text-ink-800">
        <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
        {fee}
      </span>
      <div className="inline-flex rounded-full bg-ink-50 p-0.5 ring-1 ring-inset ring-line" role="radiogroup" aria-label={`Consultation fee ${formatInr(fee)}`}>
        {options.map(o => {
          const active = mode === o.value;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => !active && onChange(o.value)}
              className={cn(
                'h-7 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed',
                active ? (o.value ? 'bg-leaf-700 text-white shadow-soft' : 'bg-white text-ink-700 shadow-soft') : 'text-ink-500 hover:text-ink-800'
              )}
            >
              {o.value && active ? `${o.label} paid` : o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface WalkInFormProps {
  /** IST date, used as the latest allowed DOB (newborns can be born today). */
  today: string;
  onSubmit: (input: {
    fullName: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    dob?: string;
    notes?: string;
    idempotencyKey: string;
  }) => Promise<ActionResult & { tokenNumber?: number }>;
}

const WalkInForm: React.FC<WalkInFormProps> = ({ today, onSubmit }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ token: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // One key per intended registration: a double-click re-sends the same key.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Enter the patient's full name.");
    if (!isValidIndianPhone(phone)) return setError('Enter a valid 10-digit mobile number.');

    setSubmitting(true);
    const res = await onSubmit({ fullName: fullName.trim(), phone, gender, dob: dob || undefined, notes: notes.trim() || undefined, idempotencyKey });
    setSubmitting(false);

    if (!res.ok) return setError(res.error);
    setIssued({ token: res.tokenNumber!, name: fullName.trim() });
    setFullName('');
    setPhone('');
    setDob('');
    setNotes('');
    setIdempotencyKey(newIdempotencyKey());
  };

  return (
    <Panel
      className="xl:sticky xl:top-20"
      title={
        <span className="inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-leaf-700" aria-hidden="true" /> Register walk-in
        </span>
      }
      description="Issues the next token in today’s shared queue and checks the patient in."
    >
      <AnimatePresence>
        {issued && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            aria-live="polite"
          >
            <div className="mb-5 rounded-2xl bg-leaf-50 p-4 text-center ring-1 ring-inset ring-leaf-200">
              <p className="text-xs font-semibold text-leaf-800">Token issued</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-ink-900">#{issued.token}</p>
              <p className="mt-1 text-xs text-ink-500">{issued.name} · checked in</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wi-name" className="field-label">Patient full name</label>
          <input id="wi-name" className="field-control" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Aarav Mishra" required />
        </div>
        <div>
          <label htmlFor="wi-phone" className="field-label">Parent / guardian mobile</label>
          <input
            id="wi-phone"
            className="field-control"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="10 digits"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="wi-gender" className="field-label">Sex</label>
            <select id="wi-gender" className="field-control" value={gender} onChange={e => setGender(e.target.value as typeof gender)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="wi-dob" className="field-label">Date of birth</label>
            <input id="wi-dob" className="field-control" type="date" max={today} value={dob} onChange={e => setDob(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="wi-notes" className="field-label">
            Reason for visit <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <input id="wi-notes" className="field-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Fever since 2 days" />
        </div>
        <Button type="submit" variant="accent" className="w-full" isLoading={submitting} loadingText="Issuing token…" leftIcon={<UserPlus className="h-4 w-4" />}>
          Issue token
        </Button>
      </form>
    </Panel>
  );
};
