import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarCheck, Check, CreditCard, LogOut, ShieldCheck } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { PageHero, Section } from '../../components/site/Section';
import { AuthShell } from '../../components/site/AuthShell';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { checkOnlineBookingCutoff, getHospitalDateWithOffset, getHospitalTodayDate, getNextEligibleOpdDate } from '../../lib/tokens';
import { to12h } from '../../lib/contact';
import { formatInr } from '../../lib/queue';
import { newBookingKey, OpdFormErrors, OpdFormValues, validateOpdForm } from '../../lib/opdForm';
import { openRazorpayCheckout } from '../../lib/razorpayCheckout';
import { Eligibility, MyBooking, opdBookingService, PaymentConfig } from '../../services/opdBookingService';
import { cn } from '../../lib/cn';

type Phase = 'idle' | 'submitting' | 'paying' | 'verifying';

const DATE_CHIPS = 7;
const REASONS = ['Fever', 'Cough & cold', 'Vaccination', 'Routine check-up', 'Stomach upset', 'Skin rash'];
const GENDERS: { value: OpdFormValues['gender']; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: '', label: 'Skip' },
];

function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function chipDate(iso: string, today: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const fmt = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-IN', { ...o, timeZone: 'Asia/Kolkata' });
  const top = iso === today ? 'Today' : iso === getHospitalDateWithOffset(1, today) ? 'Tomorrow' : fmt({ weekday: 'short' });
  return { top, bottom: fmt({ day: 'numeric', month: 'short' }) };
}

const STEPS = ['Sign in', 'Details', 'Payment', 'Confirmed'];

/** Progress through the booking flow; shared with the confirmation page. */
export const BookingSteps: React.FC<{ current: number; className?: string }> = ({ current, className }) => (
  <ol className={cn('flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px] font-medium', className)} aria-label="Booking progress">
    {STEPS.map((label, i) => (
      <li key={label} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs ring-1 ring-inset',
            i < current && 'bg-leaf-600 text-white ring-leaf-600',
            i === current && 'bg-brand-700 text-white ring-brand-700',
            i > current && 'bg-white text-ink-400 ring-line-strong'
          )}
        >
          {i < current ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
        </span>
        <span className={i === current ? 'text-ink-900' : 'text-ink-500'}>{label}</span>
        {i < STEPS.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-5 bg-line-strong sm:w-8" />}
      </li>
    ))}
  </ol>
);

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, doctors, registerPatient, bookOnlineAppointment, searchPatients } = useHospital();
  const { user, patientProfile, role, isAuthenticated: anySession, isLiveSession, isLoading, authError, loginWithGoogle, logout } = useAuth();

  const live = isSupabaseConfigured;
  // With Supabase, a stored demo login has no JWT and every booking RPC would be denied, so only a real session counts.
  const isAuthenticated = live ? isLiveSession : anySession;
  const isPatient = isAuthenticated && role === 'patient';
  const signedInAsStaff = isAuthenticated && role !== 'patient';
  const maxDays = settings.maxAdvanceBookingDays || 30;
  const rules = { cutoffTimeStr: settings.onlineCutoffTime, operatingDays: settings.operatingDays, holidays: settings.holidays, maxAdvanceDays: maxDays };

  const todayStr = getHospitalTodayDate();
  const nextEligibleDate = getNextEligibleOpdDate(rules);
  const qDate = searchParams.get('date');

  const [values, setValues] = useState<OpdFormValues>({
    appointmentDate: qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : nextEligibleDate,
    // The Google account usually belongs to the parent, so only an existing patient record prefills the name.
    patientName: patientProfile?.fullName || '',
    phone: patientProfile?.phone || user?.phone || '',
    gender: '',
    reason: '',
  });
  const [errors, setErrors] = useState<OpdFormErrors>({});
  const [agree, setAgree] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newBookingKey);
  const [payment, setPayment] = useState<PaymentConfig | null>(live ? null : { onlinePaymentEnabled: false, consultationFee: settings.consultationFee, currency: 'INR' });
  const [serverCheck, setServerCheck] = useState<Eligibility | null>(null);

  // Prefill once the profile arrives (e.g. after the Google redirect).
  useEffect(() => {
    setValues(v => ({
      ...v,
      patientName: v.patientName || patientProfile?.fullName || '',
      phone: v.phone || patientProfile?.phone || user?.phone || '',
    }));
  }, [patientProfile?.fullName, patientProfile?.phone, user?.phone]);

  // A new key whenever the details change; identical retries reuse the same key.
  useEffect(() => setIdempotencyKey(newBookingKey()), [values.appointmentDate, values.patientName, values.phone, values.gender, values.reason]);

  useEffect(() => {
    if (!live) return;
    opdBookingService.paymentConfig().then(setPayment).catch(() => setPayment({ onlinePaymentEnabled: false, consultationFee: null, currency: 'INR' }));
  }, [live]);

  // Server-side eligibility (authoritative) for the chosen date.
  useEffect(() => {
    if (!live || !isPatient || !values.appointmentDate) return;
    let alive = true;
    setServerCheck(null);
    opdBookingService
      .eligibility(values.appointmentDate)
      .then(r => alive && setServerCheck(r))
      .catch(() => alive && setServerCheck(null));
    return () => {
      alive = false;
    };
  }, [live, isPatient, values.appointmentDate]);

  // The next few open OPD days as one-tap choices; the date input covers anything later.
  const dateOptions = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= maxDays && out.length < DATE_CHIPS; i++) {
      const d = getHospitalDateWithOffset(i, todayStr);
      if (checkOnlineBookingCutoff(d, rules).allowed) out.push(d);
    }
    return out;
  }, [todayStr, maxDays, settings.onlineCutoffTime, settings.operatingDays, settings.holidays]);

  const localCheck = checkOnlineBookingCutoff(values.appointmentDate, rules);
  const dateCheck = serverCheck
    ? { allowed: serverCheck.allowed, reason: serverCheck.reason ?? undefined, nextEligibleDate: serverCheck.nextEligibleDate ?? undefined }
    : localCheck;

  const set = <K extends keyof OpdFormValues>(key: K, value: OpdFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
    setFormError(null);
  };

  const addReason = (r: string) => {
    const current = values.reason.trim();
    if (current.toLowerCase().includes(r.toLowerCase())) return;
    set('reason', current ? `${current}, ${r}` : r);
  };

  const payOnline = Boolean(payment?.onlinePaymentEnabled);
  const busy = phase !== 'idle';

  const startGoogle = async () => {
    setFormError(null);
    try {
      await loginWithGoogle(`/book-appointment?date=${encodeURIComponent(values.appointmentDate)}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Google sign-in could not start. Please try again.');
    }
  };

  /** Local demo mode (no Supabase): keeps the original in-browser booking flow. */
  const submitDemo = () => {
    const name = values.patientName.trim();
    let patientId = searchPatients(values.phone).find(p => p.phone === values.phone && p.fullName.trim().toLowerCase() === name.toLowerCase())?.id;
    if (!patientId) {
      const reg = registerPatient({ fullName: name, phone: values.phone, gender: values.gender || undefined }, 'patient');
      if (!reg.success || !reg.patient) throw new Error(reg.error || 'Could not create the patient record.');
      patientId = reg.patient.id;
    }
    const res = bookOnlineAppointment({
      patientProfileId: patientId,
      appointmentDate: values.appointmentDate,
      doctorId: doctors[0]?.id,
      notes: values.reason.trim(),
      idempotencyKey,
    });
    if (!res.success || !res.appointment) throw new Error(res.error || 'Booking failed.');
    const booking: MyBooking = {
      status: 'confirmed',
      paymentStatus: 'pay_at_reception',
      bookingReference: res.appointment.appointmentCode,
      appointmentDate: res.appointment.appointmentDate,
      patientName: res.appointment.patientName,
      tokenNumber: res.appointment.tokenNumber,
    };
    navigate(`/booking/${encodeURIComponent(booking.bookingReference)}`, { state: { booking } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const v = validateOpdForm(values);
    setErrors(v);
    if (Object.keys(v).length) {
      setFormError('Please check the highlighted fields.');
      document.getElementById(`b-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    if (!dateCheck.allowed) {
      setFormError(dateCheck.reason || 'Online booking is not open for this date.');
      return;
    }
    if (!agree) {
      setFormError('Please confirm the details and accept the terms to continue.');
      return;
    }

    const input = {
      appointmentDate: values.appointmentDate,
      patientName: values.patientName.trim(),
      phone: values.phone,
      gender: values.gender || null,
      reason: values.reason.trim(),
      idempotencyKey,
    };

    setPhase('submitting');
    try {
      if (!live) {
        submitDemo();
        return;
      }

      if (!payOnline) {
        const booking = await opdBookingService.bookPayAtReception(input);
        navigate(`/booking/${encodeURIComponent(booking.bookingReference)}`, { state: { booking } });
        return;
      }

      const order = await opdBookingService.createOrder(input);
      if ('alreadyPaid' in order) {
        navigate(`/booking/${encodeURIComponent(order.bookingReference)}`);
        return;
      }

      setPhase('paying');
      const result = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.razorpayOrderId,
        amountPaise: order.amountPaise,
        currency: order.currency,
        description: `OPD consultation · ${prettyDate(order.appointmentDate)}`,
        prefill: { name: order.patientName, contact: order.phone, email: user?.email },
      });

      if (result.kind === 'success') {
        setPhase('verifying');
        // The confirmation page polls the server, so a slow verification still resolves.
        await opdBookingService.verifyPayment(result.response).catch(() => undefined);
        navigate(`/booking/${encodeURIComponent(order.bookingReference)}`);
        return;
      }

      if (result.kind === 'failed') {
        setFormError(`${result.message} No money has been taken for a failed attempt. You can try again — the same booking will be reused.`);
      } else {
        await opdBookingService.cancelPending(order.bookingReference).catch(() => undefined);
        setNotice('Payment was cancelled. Your appointment is not booked yet — you can pay whenever you are ready.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPhase('idle');
    }
  };

  const fee = payment?.consultationFee ? formatInr(payment.consultationFee) : null;
  const submitLabel = useMemo(() => {
    if (phase === 'paying') return 'Waiting for payment…';
    if (phase === 'verifying') return 'Confirming payment…';
    if (payOnline) return fee ? `Pay ${fee} & book` : 'Proceed to payment';
    return 'Confirm appointment';
  }, [phase, payOnline, fee]);

  // ---------------------------------------------------------------- views
  if (isLoading) {
    return (
      <Section size="md">
        <MedicalLoader label="Checking your session…" />
      </Section>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthShell
        title="Sign in to book your appointment"
        description="Use your Google account to book. Your tokens, receipts and reports stay together and private, and you’ll come straight back to the booking form."
        image={{ src: '/images/pediatric-hero.jpg', alt: 'A pediatrician with a young patient at Satya Hospital' }}
        quote={{ heading: 'Your OPD token in under two minutes.', text: 'Sign in, tell us who is visiting, pay securely and get your token number straight away.' }}
      >
        <div className="space-y-5">
          <BookingSteps current={0} />
          {(authError || formError) && <Alert type="error">{formError || authError}</Alert>}
          {!live && (
            <Alert type="info" className="text-xs">
              Supabase is not configured, so this continues with a demo patient and no real payment.
            </Alert>
          )}
          <Button size="lg" variant="outline" className="w-full gap-3" onClick={startGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>
          <p className="flex items-start gap-2 border-t border-line pt-5 text-[13px] text-ink-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
            We only use your name and email from Google. Handled in line with India’s DPDP Act.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (signedInAsStaff) {
    return (
      <Section size="md">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-7 text-center shadow-card sm:p-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">You’re signed in as staff</h2>
          <p className="mt-2 text-[15px] text-ink-600">Register patients from the reception queue desk, or sign out to book as a patient.</p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <LinkButton to="/staff">Open queue desk</LinkButton>
            <Button variant="outline" onClick={() => logout()} leftIcon={<LogOut className="h-4 w-4" />}>
              Sign out
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  const otherDate = !dateOptions.includes(values.appointmentDate);

  return (
    <>
      <PageHero crumbs={[{ label: 'Book appointment' }]} eyebrow="OPD appointment" title="Book an OPD appointment">
        <BookingSteps current={phase === 'paying' || phase === 'verifying' ? 2 : 1} className="mt-7" />
      </PageHero>
      <Section size="md">
        <form id="booking-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-12" aria-describedby={formError ? 'booking-error' : undefined}>
          <div className="space-y-6 lg:col-span-8">
            <div aria-live="polite" className="space-y-3 empty:hidden">
              {formError && (
                <Alert type="error" title="We couldn’t continue">
                  <span id="booking-error">{formError}</span>
                </Alert>
              )}
              {notice && <Alert type="info">{notice}</Alert>}
            </div>

            {/* 1. Date */}
            <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={busy}>
              <legend className="sr-only">Appointment date</legend>
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">When would you like to visit?</h2>
              <p className="mt-1 text-sm text-ink-500">
                OPD starts at {to12h(settings.opdStartTime)}. Same-day online booking closes at {to12h(settings.onlineCutoffTime)} IST.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7" role="radiogroup" aria-label="Choose a date">
                {dateOptions.map(d => {
                  const { top, bottom } = chipDate(d, todayStr);
                  const selected = d === values.appointmentDate;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set('appointmentDate', d)}
                      className={cn(
                        'flex cursor-pointer flex-col items-center rounded-2xl border px-2 py-3 text-center transition-colors',
                        selected ? 'border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600' : 'border-line bg-white text-ink-700 hover:border-brand-300'
                      )}
                    >
                      <span className="text-xs font-medium text-ink-500">{top}</span>
                      <span className="mt-0.5 text-[15px] font-semibold">{bottom}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label htmlFor="b-appointmentDate" className="text-sm text-ink-600">
                  Or pick another date
                </label>
                <input
                  id="b-appointmentDate"
                  type="date"
                  min={todayStr}
                  max={getHospitalDateWithOffset(maxDays, todayStr)}
                  value={values.appointmentDate}
                  onChange={e => set('appointmentDate', e.target.value)}
                  className={cn('field-control w-auto py-2', otherDate && 'border-brand-600 ring-1 ring-brand-600')}
                  aria-invalid={Boolean(errors.appointmentDate) || !dateCheck.allowed}
                />
              </div>
              {errors.appointmentDate && <p className="field-error">{errors.appointmentDate}</p>}
              {!dateCheck.allowed && (
                <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700" role="status">
                  <p className="flex items-start gap-2 font-medium">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {dateCheck.reason}
                  </p>
                  {dateCheck.nextEligibleDate && dateCheck.nextEligibleDate !== values.appointmentDate && (
                    <button type="button" onClick={() => set('appointmentDate', dateCheck.nextEligibleDate!)} className="link mt-2 inline-flex cursor-pointer items-center gap-1">
                      Book {prettyDate(dateCheck.nextEligibleDate)} instead <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </fieldset>

            {/* 2. Patient */}
            <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={busy}>
              <legend className="sr-only">Patient details</legend>
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">Who is visiting?</h2>
              <p className="mt-1 text-sm text-ink-500">Booking for your child? Enter the child’s name — we’ll keep each family member’s record separately.</p>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="b-patientName" className="field-label">Patient’s full name</label>
                  <input
                    id="b-patientName"
                    autoComplete="off"
                    placeholder="e.g. Aarav Sharma"
                    value={values.patientName}
                    onChange={e => set('patientName', e.target.value)}
                    className="field-control"
                    aria-invalid={Boolean(errors.patientName)}
                    required
                  />
                  {errors.patientName && <p className="field-error">{errors.patientName}</p>}
                </div>
                <div>
                  <label htmlFor="b-phone" className="field-label">Parent / contact mobile</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">+91</span>
                    <input
                      id="b-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={values.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
                      className="field-control pl-12"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby="b-phone-hint"
                      required
                    />
                  </div>
                  <p id="b-phone-hint" className="field-hint">Reception will call this number if anything changes.</p>
                  {errors.phone && <p className="field-error">{errors.phone}</p>}
                </div>
                <div>
                  <span id="b-gender-label" className="field-label">
                    Gender <span className="font-normal text-ink-400">(optional)</span>
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-ink-50 p-1" role="radiogroup" aria-labelledby="b-gender-label">
                    {GENDERS.map(g => (
                      <button
                        key={g.label}
                        type="button"
                        role="radio"
                        aria-checked={values.gender === g.value}
                        onClick={() => set('gender', g.value)}
                        className={cn(
                          'cursor-pointer rounded-xl py-2 text-sm font-medium transition-colors',
                          values.gender === g.value ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* 3. Reason */}
            <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={busy}>
              <legend className="sr-only">Reason for visit</legend>
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">What’s the visit for?</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => addReason(r)}
                    className="cursor-pointer rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    + {r}
                  </button>
                ))}
              </div>
              <label htmlFor="b-reason" className="sr-only">Reason for visit</label>
              <textarea
                id="b-reason"
                rows={3}
                maxLength={500}
                placeholder="Tap a reason above or describe the symptoms, e.g. fever since yesterday"
                value={values.reason}
                onChange={e => set('reason', e.target.value)}
                className="field-control mt-4 resize-y"
                aria-invalid={Boolean(errors.reason)}
                required
              />
              <div className="mt-1 flex justify-between gap-3">
                {errors.reason ? <p className="field-error mt-0">{errors.reason}</p> : <span />}
                <span className="text-xs text-ink-400">{values.reason.length}/500</span>
              </div>
            </fieldset>
          </div>

          {/* Summary + pay */}
          <aside className="lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-28">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
                <h2 className="text-sm font-semibold text-ink-900">Booking summary</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Date</dt>
                    <dd className="text-right font-medium text-ink-900">{values.appointmentDate ? prettyDate(values.appointmentDate) : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Patient</dt>
                    <dd className="text-right font-medium text-ink-900">{values.patientName.trim() || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Reporting time</dt>
                    <dd className="text-right font-medium text-ink-900">{to12h(settings.opdStartTime)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-line pt-3">
                    <dt className="font-medium text-ink-900">Consultation fee</dt>
                    <dd className="text-right font-semibold text-ink-900">{payment === null ? 'Checking…' : payOnline ? fee : 'Pay at reception'}</dd>
                  </div>
                </dl>

                <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink-600">
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-700" disabled={busy} />
                  <span>
                    These details are correct and I agree to the <Link to="/terms-and-conditions" className="link">terms</Link>,{' '}
                    <Link to="/cancellation-policy" className="link">cancellation</Link> and <Link to="/privacy-policy" className="link">privacy</Link> policies.
                  </span>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-5 w-full"
                  isLoading={busy}
                  loadingText={submitLabel}
                  disabled={payment === null}
                  leftIcon={payOnline ? <CreditCard className="h-[18px] w-[18px]" /> : <CalendarCheck className="h-[18px] w-[18px]" />}
                >
                  {submitLabel}
                </Button>
                <p className="mt-3 text-center text-xs text-ink-500">
                  {payOnline ? 'Secure payment by Razorpay — UPI, cards, net banking. Your token is issued once payment is verified.' : 'No online payment is taken. Pay the fee at reception.'}
                </p>
              </div>
              <p className="flex items-center gap-2 px-1 text-[13px] text-ink-500">
                <ShieldCheck className="h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                <span className="min-w-0 truncate">Signed in as {user?.email || user?.fullName}</span>
                <button type="button" onClick={() => logout()} className="link ml-auto shrink-0 cursor-pointer">
                  Switch
                </button>
              </p>
            </div>
          </aside>
        </form>
      </Section>
    </>
  );
};
