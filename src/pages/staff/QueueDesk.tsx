import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock,
  IndianRupee,
  RefreshCw,
  UserCheck,
  UserPlus,
  UserX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { useQueueDesk, ActionResult } from '../../hooks/useQueueDesk';
import { DEFAULT_CONSULTATION_FEE_INR, formatInr, STATUS_LABELS } from '../../lib/queue';
import { checkOnlineBookingCutoff, getDayName, isOperatingDay, isValidIndianPhone } from '../../lib/tokens';
import { Appointment, AppointmentStatus, FeePaymentMode } from '../../types';

const STATUS_BADGE: Record<AppointmentStatus, BadgeVariant> = {
  booked: 'neutral',
  checked_in: 'warning',
  in_consultation: 'medical-blue',
  completed: 'success',
  no_show: 'danger',
  cancelled: 'neutral',
};

type Filter = 'all' | 'waiting' | 'booked' | 'in_consultation' | 'completed' | 'no_show';

const FILTERS: { id: Filter; label: string; match: (a: Appointment) => boolean }[] = [
  { id: 'all', label: 'All', match: a => a.status !== 'cancelled' },
  { id: 'waiting', label: 'Checked-in', match: a => a.status === 'checked_in' },
  { id: 'booked', label: 'Booked', match: a => a.status === 'booked' },
  { id: 'in_consultation', label: 'In Consultation', match: a => a.status === 'in_consultation' },
  { id: 'completed', label: 'Completed', match: a => a.status === 'completed' },
  { id: 'no_show', label: 'No-Show', match: a => a.status === 'no_show' },
];

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

function timeOf(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `walkin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const QueueDesk: React.FC = () => {
  const desk = useQueueDesk();
  const { summary, settings, today, istTime } = desk;
  const fee = settings.consultationFee ?? DEFAULT_CONSULTATION_FEE_INR;

  const [filter, setFilter] = useState<Filter>('all');
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
      ? { open: true, text: `Online booking for today open until ${cutoff} IST` }
      : { open: false, text: `Online booking closed at ${cutoff} IST · walk-ins only` };
  }, [today, istTime, settings]);

  const visible = desk.appointments.filter(FILTERS.find(f => f.id === filter)!.match);
  const prettyDate = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#193247]">OPD Queue Desk</h1>
          <p className="text-xs text-[#647785] mt-1">
            {prettyDate} · OPD begins <strong className="text-[#193247]">{to12h(settings.opdStartTime)} IST</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={booking.open ? 'mint' : 'warning'} size="sm" dot>
            {booking.text}
          </Badge>
          {desk.live ? (
            <Badge variant="medical-blue" size="sm">
              <Wifi className="w-3 h-3 mr-1 inline" aria-hidden="true" /> Live · synced across desks
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              <WifiOff className="w-3 h-3 mr-1 inline" aria-hidden="true" /> Local demo data
            </Badge>
          )}
          {desk.live && (
            <button
              type="button"
              onClick={() => desk.refresh()}
              className="p-1.5 rounded-md text-[#647785] hover:text-[#3DA9DF] hover:bg-[#EBF6FC] cursor-pointer"
              aria-label="Refresh queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {desk.syncError && (
        <Alert type="error" title="Queue sync problem">
          {desk.syncError}
        </Alert>
      )}

      {/* Fixed toast so feedback never shifts the buttons staff are about to click. */}
      <div aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-50 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {notice && (
          <div className="pointer-events-auto shadow-lg rounded-lg">
            <Alert type={notice.type} title={notice.type === 'success' ? 'Done' : 'Action not completed'}>
              {notice.text}
            </Alert>
          </div>
        )}
      </div>

      {/* Now serving + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-[#EBF6FC] border-[#BCE1F5]">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E78A4]">Now in consultation</span>
                <div className="text-5xl font-bold text-[#193247] leading-none mt-2 tabular-nums">
                  {summary.nowServing ? `#${summary.nowServing.tokenNumber}` : '—'}
                </div>
                <div className="text-sm text-[#193247] font-semibold mt-2 truncate">
                  {summary.nowServing?.patientName || 'No patient in the room'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647785]">Next up</span>
                <div className="text-2xl font-bold text-[#193247] mt-2 tabular-nums">
                  {summary.nextUp ? `#${summary.nextUp.tokenNumber}` : '—'}
                </div>
                <div className="text-xs text-[#647785] mt-1 max-w-[9rem] truncate">
                  {summary.nextUp?.patientName || 'Nobody checked in'}
                </div>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              leftIcon={<BellRing className="w-5 h-5" />}
              disabled={!summary.nextUp || busy !== null}
              isLoading={busy === 'call-next'}
              onClick={() => run('call-next', desk.callNext)}
            >
              Call Next Token
            </Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#E5ECEF] h-full">
            <Stat label="Registered today" value={summary.total} sub={`${summary.online} online · ${summary.walkIn} walk-in`} />
            <Stat label="Checked-in, waiting" value={summary.waiting} sub="In the lounge" accent="text-[#B45309]" />
            <Stat label="Booked, not arrived" value={summary.booked} sub="Online tokens" />
            <Stat label="Completed" value={summary.completed} sub={`${summary.inConsultation} in room now`} accent="text-[#5F8526]" />
            <Stat label="No-show" value={summary.noShow} sub="Can re-check-in" />
            <Stat
              label="Fees collected"
              value={formatInr(summary.fees.totalInr)}
              sub={`${summary.fees.cash} cash · ${summary.fees.upi} UPI`}
              accent="text-[#1E78A4]"
            />
          </div>
        </Card>
      </div>

      {/* Queue + walk-in */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <h2 className="text-base font-bold text-[#193247]">Today's tokens</h2>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
              {FILTERS.map(f => {
                const n = desk.appointments.filter(f.match).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      filter === f.id ? 'bg-[#3DA9DF] text-white' : 'text-[#647785] hover:bg-[#EBF6FC]'
                    }`}
                  >
                    {f.label} <span className="opacity-75">{n}</span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          {desk.loading ? (
            <MedicalLoader label="Loading today's queue..." />
          ) : visible.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[#647785]">
              {filter === 'all' ? 'No tokens issued yet today.' : 'No tokens with this status.'}
            </p>
          ) : (
            <ul className="divide-y divide-[#E5ECEF]">
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
            </ul>
          )}
        </Card>

        <WalkInForm today={today} onSubmit={input => desk.registerWalkIn(input)} />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; sub: string; accent?: string }> = ({
  label,
  value,
  sub,
  accent = 'text-[#193247]',
}) => (
  <div className="bg-white p-4">
    <span className="text-xs text-[#647785] font-medium block">{label}</span>
    <div className={`text-2xl font-bold mt-1 tabular-nums ${accent}`}>{value}</div>
    <span className="text-[11px] text-[#647785] block mt-0.5">{sub}</span>
  </div>
);

interface QueueRowProps {
  appt: Appointment;
  fee: number;
  busyKey: string | null;
  onStatus: (status: AppointmentStatus) => void;
  onFee: (mode: FeePaymentMode | null) => void;
}

const QueueRow: React.FC<QueueRowProps> = ({ appt, fee, busyKey, onStatus, onFee }) => {
  const disabled = busyKey !== null;
  const loading = (status: AppointmentStatus) => busyKey === `${appt.id}:${status}`;

  return (
    <li
      className={`px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 ${
        appt.status === 'in_consultation' ? 'bg-[#EBF6FC]/60' : ''
      }`}
    >
      <div className="flex items-center gap-3 md:w-[40%] min-w-0">
        <span className="shrink-0 w-14 text-center px-2 py-1.5 rounded-lg bg-[#193247] text-white font-mono font-bold text-sm tabular-nums">
          #{appt.tokenNumber}
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-[#193247] truncate">{appt.patientName}</div>
          <div className="text-[11px] text-[#647785] font-mono truncate">
            {appt.patientId}
            {appt.patientPhone ? ` · +91 ${appt.patientPhone}` : ''}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant={appt.queueType === 'online' ? 'medical-blue' : 'mint'} size="sm">
              {appt.queueType === 'online' ? 'Online' : 'Walk-in'}
            </Badge>
            <Badge variant={STATUS_BADGE[appt.status]} size="sm" dot>
              {STATUS_LABELS[appt.status]}
            </Badge>
          </div>
        </div>
      </div>

      <FeeToggle mode={appt.feePaymentMode ?? null} fee={fee} disabled={disabled} onChange={onFee} />

      <div className="flex flex-wrap items-center gap-1.5 md:ml-auto md:justify-end">
        {appt.status === 'booked' && (
          <Button size="sm" variant="accent" leftIcon={<UserCheck className="w-3.5 h-3.5" />} disabled={disabled} isLoading={loading('checked_in')} onClick={() => onStatus('checked_in')}>
            Check-in
          </Button>
        )}
        {appt.status === 'in_consultation' && (
          <Button size="sm" variant="accent" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} disabled={disabled} isLoading={loading('completed')} onClick={() => onStatus('completed')}>
            Mark Completed
          </Button>
        )}
        {appt.status === 'no_show' && (
          <Button size="sm" variant="outline" leftIcon={<UserCheck className="w-3.5 h-3.5" />} disabled={disabled} isLoading={loading('checked_in')} onClick={() => onStatus('checked_in')}>
            Re-check-in
          </Button>
        )}
        {(appt.status === 'booked' || appt.status === 'checked_in' || appt.status === 'in_consultation') && (
          <Button size="sm" variant="ghost" leftIcon={<UserX className="w-3.5 h-3.5" />} disabled={disabled} isLoading={loading('no_show')} onClick={() => onStatus('no_show')}>
            Mark No-Show
          </Button>
        )}
        {appt.status === 'checked_in' && (
          <span className="text-[11px] text-[#647785] inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" /> Waiting since {timeOf(appt.checkedInAt || appt.updatedAt)}
          </span>
        )}
        {appt.status === 'completed' && (
          <span className="text-[11px] text-[#5F8526] font-semibold">Completed {timeOf(appt.completedAt || appt.updatedAt)}</span>
        )}
      </div>
    </li>
  );
};

const FeeToggle: React.FC<{
  mode: FeePaymentMode | null;
  fee: number;
  disabled: boolean;
  onChange: (mode: FeePaymentMode | null) => void;
}> = ({ mode, fee, disabled, onChange }) => {
  const options: { value: FeePaymentMode | null; label: string }[] = [
    { value: null, label: 'Unpaid' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-[#193247] inline-flex items-center tabular-nums">
        <IndianRupee className="w-3 h-3" aria-hidden="true" />
        {fee}
      </span>
      <div className="inline-flex rounded-lg border border-[#CBD7DD] p-0.5 bg-white" role="radiogroup" aria-label={`Consultation fee ${formatInr(fee)}`}>
        {options.map(o => {
          const active = mode === o.value;
          const activeClass = o.value === null ? 'bg-[#F1F5F9] text-[#475569]' : 'bg-[#91BB40] text-white';
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => !active && onChange(o.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed ${
                active ? activeClass : 'text-[#647785] hover:bg-[#F3F8EC]'
              }`}
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
    const res = await onSubmit({
      fullName: fullName.trim(),
      phone,
      gender,
      dob: dob || undefined,
      notes: notes.trim() || undefined,
      idempotencyKey,
    });
    setSubmitting(false);

    if (!res.ok) return setError(res.error);
    setIssued({ token: res.tokenNumber!, name: fullName.trim() });
    setFullName('');
    setPhone('');
    setDob('');
    setNotes('');
    setIdempotencyKey(newIdempotencyKey());
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-[#CBD7DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#3DA9DF]';

  return (
    <Card className="xl:sticky xl:top-6">
      <CardHeader>
        <div>
          <h2 className="text-base font-bold text-[#193247] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#91BB40]" aria-hidden="true" /> Register Walk-in Patient
          </h2>
          <p className="text-[11px] text-[#647785] mt-0.5">Issues the next token in today's shared queue and checks the patient in.</p>
        </div>
      </CardHeader>
      <CardBody>
        {issued && (
          <div className="mb-4 rounded-xl bg-[#F3F8EC] border border-[#D5E8BA] p-4 text-center" aria-live="polite">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#486812]">Token issued</span>
            <div className="text-4xl font-bold text-[#193247] tabular-nums mt-1">#{issued.token}</div>
            <div className="text-xs text-[#647785] mt-1">{issued.name} · checked in</div>
          </div>
        )}
        {error && (
          <div className="mb-3">
            <Alert type="error" title="Could not register">
              {error}
            </Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="wi-name" className="block text-xs font-semibold text-[#193247] mb-1">
              Patient full name <span className="text-red-500">*</span>
            </label>
            <input id="wi-name" className={input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Aarav Mishra" required />
          </div>
          <div>
            <label htmlFor="wi-phone" className="block text-xs font-semibold text-[#193247] mb-1">
              Parent / guardian mobile <span className="text-red-500">*</span>
            </label>
            <input
              id="wi-phone"
              className={input}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="10-digit number"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="wi-gender" className="block text-xs font-semibold text-[#193247] mb-1">Gender</label>
              <select id="wi-gender" className={`${input} bg-white`} value={gender} onChange={e => setGender(e.target.value as typeof gender)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="wi-dob" className="block text-xs font-semibold text-[#193247] mb-1">Date of birth</label>
              <input id="wi-dob" className={input} type="date" max={today} value={dob} onChange={e => setDob(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="wi-notes" className="block text-xs font-semibold text-[#193247] mb-1">Reason for visit</label>
            <input id="wi-notes" className={input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Fever since 2 days, vaccination" />
          </div>
          <Button type="submit" variant="accent" className="w-full" isLoading={submitting} leftIcon={<UserPlus className="w-4 h-4" />}>
            Issue Token
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};
