import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Calendar, CalendarCheck, Clock, CreditCard, Info, Lock, LogOut, ShieldCheck, Stethoscope } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { PageHero, Section } from '../../components/site/Section';
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

const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, doctors, registerPatient, bookOnlineAppointment, searchPatients } = useHospital();
  const { user, patientProfile, role, isAuthenticated, isLiveSession, isLoading, loginWithGoogle, loginAsQuickPatient, logout } = useAuth();

  const live = isSupabaseConfigured;
  const isPatient = isAuthenticated && role === 'patient';
  const signedInAsStaff = isAuthenticated && role !== 'patient';
  const maxDays = settings.maxAdvanceBookingDays || 30;

  const todayStr = getHospitalTodayDate();
  const nextEligibleDate = getNextEligibleOpdDate({ cutoffTimeStr: settings.onlineCutoffTime, operatingDays: settings.operatingDays, holidays: settings.holidays });
  const qDate = searchParams.get('date');

  const [values, setValues] = useState<OpdFormValues>({
    appointmentDate: qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : nextEligibleDate,
    patientName: patientProfile?.fullName || user?.fullName || '',
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
      patientName: v.patientName || patientProfile?.fullName || user?.fullName || '',
      phone: v.phone || patientProfile?.phone || user?.phone || '',
    }));
  }, [patientProfile?.fullName, patientProfile?.phone, user?.fullName, user?.phone]);

  // A new key whenever the details change; identical retries reuse the same key.
  useEffect(() => setIdempotencyKey(newBookingKey()), [values.appointmentDate, values.patientName, values.phone, values.gender, values.reason]);

  useEffect(() => {
    if (!live) return;
    opdBookingService.paymentConfig().then(setPayment).catch(() => setPayment({ onlinePaymentEnabled: false, consultationFee: null, currency: 'INR' }));
  }, [live]);

  // Server-side eligibility (authoritative) for the chosen date.
  useEffect(() => {
    if (!live || !values.appointmentDate) return;
    let alive = true;
    opdBookingService
      .eligibility(values.appointmentDate)
      .then(r => alive && setServerCheck(r))
      .catch(() => alive && setServerCheck(null));
    return () => {
      alive = false;
    };
  }, [live, values.appointmentDate]);

  const localCheck = checkOnlineBookingCutoff(values.appointmentDate, {
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
    maxAdvanceDays: maxDays,
  });
  const dateCheck = serverCheck
    ? { allowed: serverCheck.allowed, reason: serverCheck.reason ?? undefined, nextEligibleDate: serverCheck.nextEligibleDate ?? undefined }
    : localCheck;

  const set = <K extends keyof OpdFormValues>(key: K, value: OpdFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
    setFormError(null);
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
      return;
    }
    if (!agree) {
      setFormError('Please confirm the details and accept the terms to continue.');
      return;
    }
    if (!dateCheck.allowed) {
      setFormError(dateCheck.reason || 'Online booking is not open for this date.');
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

  const submitLabel = useMemo(() => {
    if (phase === 'paying') return 'Waiting for payment…';
    if (phase === 'verifying') return 'Confirming payment…';
    if (payOnline) return `Proceed to payment${payment?.consultationFee ? ` · ${formatInr(payment.consultationFee)}` : ''}`;
    return 'Confirm appointment';
  }, [phase, payOnline, payment]);

  // ---------------------------------------------------------------- views
  const gate = (
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-7 text-center shadow-card sm:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" aria-hidden="true">
        <Lock className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">Sign in to book your OPD visit</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
        We use your Google account to keep your bookings, tokens and reports together and private. You’ll come straight back here.
      </p>
      {!live && (
        <Alert type="info" className="mt-5 text-left text-xs">
          <strong>Vercel Preview Note:</strong> Supabase environment variables are not configured in Vercel settings. Continuing below will use a preview patient profile to test the booking flow.
        </Alert>
      )}
      {formError && <Alert type="error" className="mt-5 text-left">{formError}</Alert>}
      <Button size="lg" variant="outline" className="mt-7 w-full gap-3" onClick={startGoogle} isLoading={isLoading} loadingText="Opening Google…">
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-400 font-medium">or direct booking</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button size="lg" variant="primary" className="mt-3 w-full gap-2" onClick={() => loginAsQuickPatient()}>
        Book with Mobile Number (Direct OPD Form) &rarr;
      </Button>
      <p className="mt-4 text-[13px] text-ink-500">
        Already registered at reception? <Link to="/patient/login" className="link">Use your patient ID</Link>
      </p>
    </div>
  );

  const staffNotice = (
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
  );

  const form = (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <form onSubmit={handleSubmit} noValidate className="space-y-6 lg:col-span-8" aria-describedby={formError ? 'booking-error' : undefined}>
        <div aria-live="polite" className="space-y-3">
          {formError && (
            <Alert type="error" title="We couldn’t continue">
              <span id="booking-error">{formError}</span>
            </Alert>
          )}
          {notice && <Alert type="info">{notice}</Alert>}
        </div>

        <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={busy}>
          <legend className="sr-only">Appointment</legend>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Appointment</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-100">
              <Stethoscope className="h-4 w-4" aria-hidden="true" /> OPD consultation
            </span>
          </div>

          <div className="mt-6">
            <label htmlFor="b-date" className="field-label">Appointment date</label>
            <input
              id="b-date"
              type="date"
              min={todayStr}
              max={getHospitalDateWithOffset(maxDays, todayStr)}
              value={values.appointmentDate}
              onChange={e => set('appointmentDate', e.target.value)}
              className="field-control sm:max-w-xs"
              aria-invalid={Boolean(errors.appointmentDate) || !dateCheck.allowed}
              aria-describedby="b-date-hint"
              required
            />
            <p id="b-date-hint" className="field-hint">
              Book up to {maxDays} days ahead. Same-day online booking closes at {to12h(settings.onlineCutoffTime)} IST; OPD begins at {to12h(settings.opdStartTime)}.
            </p>
            {errors.appointmentDate && <p className="field-error">{errors.appointmentDate}</p>}
            <AnimatePresence initial={false}>
              {!dateCheck.allowed && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700" role="status">
                    <p className="flex items-start gap-2 font-medium">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {dateCheck.reason}
                    </p>
                    {dateCheck.nextEligibleDate && dateCheck.nextEligibleDate !== values.appointmentDate && (
                      <button type="button" onClick={() => set('appointmentDate', dateCheck.nextEligibleDate!)} className="link mt-2 inline-flex items-center gap-1 cursor-pointer">
                        Book {prettyDate(dateCheck.nextEligibleDate)} instead <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={busy}>
          <legend className="sr-only">Patient details</legend>
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Patient details</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="b-name" className="field-label">Patient name</label>
              <input
                id="b-name"
                autoComplete="name"
                value={values.patientName}
                onChange={e => set('patientName', e.target.value)}
                className="field-control"
                aria-invalid={Boolean(errors.patientName)}
                aria-describedby="b-name-hint"
                required
              />
              <p id="b-name-hint" className="field-hint">Booking for your child? Enter the child’s name.</p>
              {errors.patientName && <p className="field-error">{errors.patientName}</p>}
            </div>
            <div>
              <label htmlFor="b-phone" className="field-label">Mobile number</label>
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
                  required
                />
              </div>
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="b-gender" className="field-label">
                Gender <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <select id="b-gender" value={values.gender} onChange={e => set('gender', e.target.value as OpdFormValues['gender'])} className="field-control">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="b-reason" className="field-label">Reason for visit</label>
              <textarea
                id="b-reason"
                rows={3}
                maxLength={500}
                placeholder="e.g. Fever since yesterday, routine check-up"
                value={values.reason}
                onChange={e => set('reason', e.target.value)}
                className="field-control resize-y"
                aria-invalid={Boolean(errors.reason)}
                required
              />
              {errors.reason && <p className="field-error">{errors.reason}</p>}
            </div>
          </div>
        </fieldset>

        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-600">
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-700" disabled={busy} />
            <span>
              I confirm these details are accurate and agree to the <Link to="/terms-and-conditions" className="link">terms</Link>,{' '}
              <Link to="/cancellation-policy" className="link">cancellation</Link> and <Link to="/privacy-policy" className="link">privacy</Link> policies.
            </span>
          </label>
          <Button
            type="submit"
            size="lg"
            className="mt-6 w-full"
            isLoading={busy}
            loadingText={submitLabel}
            disabled={payment === null}
            leftIcon={payOnline ? <CreditCard className="h-[18px] w-[18px]" /> : <CalendarCheck className="h-[18px] w-[18px]" />}
          >
            {submitLabel}
          </Button>
          <p className="mt-3 text-center text-[13px] text-ink-500">
            {payOnline
              ? 'You’ll pay securely with Razorpay. Your token is issued only after the payment is verified.'
              : 'No online payment is taken. The consultation fee is paid at reception.'}
          </p>
        </div>
      </form>

      <aside className="lg:col-span-4">
        <div className="space-y-5 lg:sticky lg:top-28">
          <div className="rounded-3xl border border-line bg-white p-6">
            <h2 className="text-sm font-semibold text-ink-900">Your visit</h2>
            <dl className="mt-4 space-y-3.5 text-sm">
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Date</dt>
                  <dd className="font-medium text-ink-900">{values.appointmentDate ? prettyDate(values.appointmentDate) : 'Choose a date'}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Time</dt>
                  <dd className="font-medium text-ink-900">OPD from {to12h(settings.opdStartTime)}</dd>
                  <dd className="text-ink-500">Patients are called in token order</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Payment</dt>
                  <dd className="font-medium text-ink-900">
                    {payment === null ? 'Checking…' : payOnline ? `Consultation fee ${payment.consultationFee ? formatInr(payment.consultationFee) : ''}` : 'Pay at reception'}
                  </dd>
                  <dd className="text-ink-500">{payOnline ? 'Paid online before confirmation' : 'Online payment not enabled'}</dd>
                </div>
              </div>
            </dl>
          </div>
          <div className="rounded-3xl bg-leaf-50 p-6 ring-1 ring-leaf-200/70">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Info className="h-4 w-4 text-leaf-700" aria-hidden="true" /> How the queue works
            </h2>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-ink-600">
              <li>Online and walk-in patients share one token sequence for the day.</li>
              <li>Same-day online booking closes at {to12h(settings.onlineCutoffTime)}; reception registers walk-ins after that.</li>
            </ul>
          </div>
          <p className="flex items-center gap-2 px-1 text-[13px] text-ink-500">
            <ShieldCheck className="h-4 w-4 text-leaf-600" aria-hidden="true" />
            Signed in as {user?.email || user?.fullName}
          </p>
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Book appointment' }]}
        eyebrow="OPD appointment"
        title="Book an OPD appointment"
        description={`Choose a date and tell us who is visiting. Same-day online booking closes at ${to12h(settings.onlineCutoffTime)} IST.`}
      />
      <Section size="md">
        {isLoading ? <MedicalLoader label="Checking your session…" /> : signedInAsStaff ? staffNotice : !isPatient ? gate : form}
      </Section>
    </>
  );
};
