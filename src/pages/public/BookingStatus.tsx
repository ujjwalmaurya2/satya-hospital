import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Loader2, PhoneCall, RotateCcw } from 'lucide-react';
import { AnchorButton, LinkButton } from '../../components/common/Button';
import { PageHero, Section } from '../../components/site/Section';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { formatInr } from '../../lib/queue';
import { MyBooking, opdBookingService } from '../../services/opdBookingService';

const POLL_MS = 2500;
const POLL_LIMIT_MS = 90_000;
const PENDING = new Set(['awaiting_payment', 'pending_verification']);

function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Booking result page. Polls the server until payment verification and token assignment finish. */
export const BookingStatus: React.FC = () => {
  const { reference = '' } = useParams();
  const location = useLocation();
  const { settings } = useHospital();
  const { isLiveSession, isLoading } = useAuth();
  const initial = (location.state as { booking?: MyBooking } | null)?.booking ?? null;

  const [booking, setBooking] = useState<MyBooking | null>(initial);
  const [notFound, setNotFound] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || isLoading || !isLiveSession) return;
    if (initial?.status === 'confirmed') return;
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const b = await opdBookingService.myBooking(reference);
        if (stopped) return;
        if (!b) {
          setNotFound(true);
          return;
        }
        setBooking(b);
        if (!PENDING.has(b.status)) return;
      } catch {
        /* transient: keep polling */
      }
      if (Date.now() - started > POLL_LIMIT_MS) {
        setTimedOut(true);
        return;
      }
      if (!stopped) window.setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [reference, isLiveSession, isLoading]);

  const callReception = (
    <AnchorButton href={phoneHref(settings.phone)} variant="outline" leftIcon={<PhoneCall className="h-4 w-4 text-brand-600" />}>
      Call reception {phoneDisplay(settings.phone)}
    </AnchorButton>
  );

  let body: React.ReactNode;

  if (!booking && (isLoading || (!notFound && isLiveSession && isSupabaseConfigured))) {
    body = <Pending title="Looking up your booking…" text="This only takes a moment." />;
  } else if (!booking || notFound) {
    body = (
      <Message
        icon={<AlertTriangle className="h-6 w-6" />}
        tone="warning"
        title="We couldn’t find this booking"
        text={isLiveSession || !isSupabaseConfigured ? 'Check the link, or open your appointments in the patient portal.' : 'Please sign in with the Google account you used to book.'}
        actions={<LinkButton to="/patient/appointments">My appointments</LinkButton>}
      />
    );
  } else if (booking.status === 'confirmed') {
    body = (
      <div className="mx-auto max-w-2xl animate-scale-in">
        <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-lift">
          <div className="relative bg-ink-800 px-7 py-8 text-white sm:px-10">
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div>
                <p className="inline-flex items-center gap-2 text-sm text-leaf-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Appointment confirmed
                </p>
                <p className="mt-4 text-sm text-white/60">OPD token</p>
                <p className="text-6xl font-bold leading-none tracking-tight tabular-nums">{booking.tokenNumber != null ? `#${booking.tokenNumber}` : '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Booking reference</p>
                <p className="mt-1 font-mono text-sm font-semibold">{booking.bookingReference}</p>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-7 py-7 text-sm sm:grid-cols-2 sm:px-10">
            <div>
              <dt className="text-ink-500">Patient</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{booking.patientName}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Date</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{prettyDate(booking.appointmentDate)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Payment</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">
                {booking.paymentStatus === 'paid'
                  ? `Paid online${booking.amountPaise ? ` · ${formatInr(booking.amountPaise / 100)}` : ''}`
                  : 'To be paid at reception'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">OPD begins</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{to12h(settings.opdStartTime)}</dd>
            </div>
          </dl>
          <div className="mx-7 mb-7 flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100 sm:mx-10">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <p>
              Please arrive by <strong>{to12h(settings.opdStartTime)}</strong> on {prettyDate(booking.appointmentDate)} and give reception your token number or booking
              reference. Patients are called in token order.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/patient/appointments" className="flex-1" leftIcon={<CalendarDays className="h-4 w-4" />}>
            View in my appointments
          </LinkButton>
          <LinkButton to="/book-appointment" variant="outline" className="flex-1">
            Book another
          </LinkButton>
        </div>
      </div>
    );
  } else if (PENDING.has(booking.status) && !timedOut) {
    body = (
      <Pending
        title={booking.status === 'awaiting_payment' ? 'Confirming your payment…' : 'Verifying your payment…'}
        text="Please keep this page open. Your token appears here as soon as the payment is verified — usually within a few seconds."
      />
    );
  } else if (booking.status === 'needs_reconciliation') {
    body = (
      <Message
        icon={<AlertTriangle className="h-6 w-6" />}
        tone="warning"
        title="We received your payment but couldn’t confirm the slot"
        text={`This can happen if the booking window closed while you were paying. Your payment is safe and recorded against reference ${booking.bookingReference}. The hospital will arrange a refund or another appointment — please contact reception with this reference.`}
        actions={callReception}
      />
    );
  } else if (booking.status === 'refunded' || booking.status === 'resolved') {
    body = (
      <Message
        icon={<CheckCircle2 className="h-6 w-6" />}
        tone="brand"
        title={booking.status === 'refunded' ? 'This payment has been refunded' : 'This booking was resolved by the hospital'}
        text={`Reference ${booking.bookingReference}. Contact reception if you have questions.`}
        actions={callReception}
      />
    );
  } else {
    // cancelled, or still awaiting payment after the polling limit
    body = (
      <Message
        icon={<AlertTriangle className="h-6 w-6" />}
        tone="warning"
        title={timedOut ? 'Payment is still being verified' : 'Payment not completed'}
        text={
          timedOut
            ? `We haven’t received confirmation from the payment provider yet. If money was deducted, the booking will confirm automatically — refresh this page in a few minutes. Reference ${booking.bookingReference}.`
            : `Your appointment is not booked yet and you have not been charged.${booking.lastPaymentError ? ` (${booking.lastPaymentError})` : ''} You can try again.`
        }
        actions={
          <>
            <LinkButton to={`/book-appointment?date=${booking.appointmentDate}`} leftIcon={<RotateCcw className="h-4 w-4" />}>
              Try again
            </LinkButton>
            {callReception}
          </>
        }
      />
    );
  }

  return (
    <>
      <PageHero crumbs={[{ label: 'Book appointment', to: '/book-appointment' }, { label: 'Booking status' }]} eyebrow="OPD appointment" title="Your booking" />
      <Section size="md">{body}</Section>
    </>
  );
};

const Pending: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-card" role="status" aria-live="polite">
    <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600 motion-reduce:animate-none" aria-hidden="true" />
    <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">{title}</h2>
    <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{text}</p>
  </div>
);

const Message: React.FC<{ icon: React.ReactNode; tone: 'warning' | 'brand'; title: string; text: string; actions?: React.ReactNode }> = ({ icon, tone, title, text, actions }) => (
  <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8 text-center shadow-card" role="status">
    <span
      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-inset ${
        tone === 'warning' ? 'bg-warning-50 text-warning-600 ring-warning-200' : 'bg-brand-50 text-brand-700 ring-brand-100'
      }`}
      aria-hidden="true"
    >
      {icon}
    </span>
    <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">{title}</h2>
    <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{text}</p>
    {actions && <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">{actions}</div>}
  </div>
);
