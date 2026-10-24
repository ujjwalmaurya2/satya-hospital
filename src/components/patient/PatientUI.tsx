import React, { useState } from 'react';
import { CalendarDays, DoorOpen, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';
import { Badge } from '../common/Badge';
import { APPOINTMENT_BADGE } from '../dashboard/Dashboard';
import { Appointment } from '../../types';
import { cn } from '../../lib/cn';

/** Opens a patient's own document via a short-lived signed URL; surfaces errors inline. */
export function usePatientDocumentOpener() {
  const { patientProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const open = (storageKey: string) => {
    setError(null);
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'patient', patientProfile?.patientId, patientProfile?.patientId);
    if (res.success && res.url) window.open(res.url, '_blank', 'noopener');
    else setError(res.error || 'We couldn’t open this document. Please try again.');
  };
  return { open, error, clearError: () => setError(null) };
}

export function prettyDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { ...opts, timeZone: 'Asia/Kolkata' });
}

const ACTIVE = new Set(['booked', 'checked_in', 'in_consultation']);

/** Ticket-style appointment row used on the overview and appointments pages. */
export const AppointmentItem: React.FC<{ appt: Appointment; action?: React.ReactNode }> = ({ appt, action }) => {
  const badge = APPOINTMENT_BADGE[appt.status];
  const active = ACTIVE.has(appt.status);
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
      <div
        className={cn(
          'flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl',
          active ? 'bg-brand-700 text-white' : 'bg-ink-50 text-ink-500 ring-1 ring-inset ring-line'
        )}
      >
        <span className={cn('text-[10px] font-semibold uppercase tracking-wide', active ? 'text-brand-100' : 'text-ink-400')}>Token</span>
        <span className="text-xl font-bold leading-none tabular-nums">#{appt.tokenNumber}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant} size="sm" dot>
            {badge.label}
          </Badge>
          <span className="text-xs text-ink-400">{appt.queueType === 'online' ? 'Online booking' : 'Walk-in'}</span>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-900">
            <CalendarDays className="h-4 w-4 text-ink-400" aria-hidden="true" />
            {prettyDate(appt.appointmentDate)}
          </span>
          {appt.doctorName && (
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4 text-ink-400" aria-hidden="true" />
              {appt.doctorName}
            </span>
          )}
        </p>
        <p className="mt-1 truncate text-[13px] text-ink-500">
          <span className="font-mono text-xs">{appt.appointmentCode}</span>
          {appt.notes ? ` · ${appt.notes}` : ''}
        </p>
        {appt.cancellationReason && appt.status === 'cancelled' && <p className="mt-1 text-[13px] text-danger-700">Reason: {appt.cancellationReason}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const InlineNote: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; tone?: 'brand' | 'leaf' | 'warning' }> = ({ icon, children, tone = 'brand' }) => (
  <div
    className={cn(
      'flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed ring-1 ring-inset',
      tone === 'brand' && 'bg-brand-50 text-brand-900 ring-brand-100',
      tone === 'leaf' && 'bg-leaf-50 text-leaf-900 ring-leaf-200/70',
      tone === 'warning' && 'bg-warning-50 text-warning-700 ring-warning-200'
    )}
  >
    {icon && <span className="mt-px shrink-0" aria-hidden="true">{icon}</span>}
    <div>{children}</div>
  </div>
);

export const RoomHint: React.FC<{ room?: string }> = ({ room }) =>
  room ? (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
      <DoorOpen className="h-4 w-4 text-ink-400" aria-hidden="true" />
      {room}
    </span>
  ) : null;
