import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Baby, Calendar, CalendarCheck, CheckCircle2, Clock, Info, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { PageHero, Section } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { checkOnlineBookingCutoff, getHospitalTodayDate, getNextEligibleOpdDate, isValidIndianPhone } from '../../lib/tokens';
import { to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';
import { Appointment } from '../../types';

export const BookAppointment: React.FC = () => {
  const { settings, doctors, registerPatient, bookOnlineAppointment, searchPatients } = useHospital();
  const { user, patientProfile } = useAuth();

  const [searchParams] = useSearchParams();
  const qDoctor = searchParams.get('doctor');
  const qDate = searchParams.get('date');

  const todayStr = getHospitalTodayDate();
  const nextEligibleDate = getNextEligibleOpdDate({
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  const initialDocId = qDoctor && doctors.some(d => d.id === qDoctor) ? qDoctor : (doctors[0]?.id || '');
  const initialDate = qDate || nextEligibleDate;

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDocId);
  const [appointmentType, setAppointmentType] = useState<string>('pediatric');
  const [fullName, setFullName] = useState<string>(patientProfile?.fullName || user?.fullName || '');
  const [guardianName, setGuardianName] = useState<string>('');
  const [phone, setPhone] = useState<string>(patientProfile?.phone || user?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(patientProfile?.gender || 'male');
  const [age, setAge] = useState<string>(patientProfile?.age?.toString() || '4');
  const [ageUnit, setAgeUnit] = useState<'years' | 'months'>('years');
  const [notes, setNotes] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);

  // Status state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check cutoff live on selected date
  const cutoffStatus = checkOnlineBookingCutoff(selectedDate, {
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!agreeTerms) {
      setErrorMsg('You must acknowledge the hospital privacy notice and OPD policy.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }

    if (!isValidIndianPhone(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Check cutoff
    if (!cutoffStatus.allowed) {
      setErrorMsg(cutoffStatus.reason || 'Online bookings for today have closed.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Ensure patient record exists or register
      let patientIdToBook = patientProfile?.id;

      if (!patientIdToBook) {
        // Reuse an existing record only when phone AND name match: siblings often share a parent's number.
        const existing = searchPatients(phone.trim()).filter(
          p => p.phone === phone.trim() && p.fullName.trim().toLowerCase() === fullName.trim().toLowerCase()
        );
        if (existing.length > 0) {
          patientIdToBook = existing[0].id;
        } else {
          const calculatedAgeYears = ageUnit === 'months' 
            ? Math.max(1, Math.round(parseInt(age, 10) / 12)) 
            : parseInt(age, 10) || undefined;

          const regResult = registerPatient(
            {
              fullName: fullName.trim(),
              phone: phone.trim(),
              gender,
              age: calculatedAgeYears,
              emergencyContact: guardianName ? `Guardian: ${guardianName.trim()}` : undefined,
            },
            'patient'
          );
          if (!regResult.success || !regResult.patient) {
            setErrorMsg(regResult.error || 'Failed to create patient record.');
            setIsSubmitting(false);
            return;
          }
          patientIdToBook = regResult.patient.id;
        }
      }

      // Step 2: Book the online appointment with idempotency key
      const idempotencyKey = `idemp_${patientIdToBook}_${selectedDate}_${Date.now()}`;
      const compositeNotes = [
        appointmentType === 'pediatric' ? '[Pediatric Consultation]' : appointmentType === 'newborn' ? '[Newborn Care]' : '[General OPD]',
        guardianName ? `Guardian: ${guardianName.trim()}` : null,
        notes.trim() ? notes.trim() : null
      ].filter(Boolean).join(' | ');

      const bookResult = bookOnlineAppointment({
        patientProfileId: patientIdToBook,
        appointmentDate: selectedDate,
        doctorId: selectedDoctorId,
        notes: compositeNotes || undefined,
        idempotencyKey,
      });

      if (!bookResult.success || !bookResult.appointment) {
        setErrorMsg(bookResult.error || 'Appointment booking failed.');
        setIsSubmitting(false);
        return;
      }

      setConfirmedBooking(bookResult.appointment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const doctor = doctors.find(d => d.id === selectedDoctorId);
  const prettyDate = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const careTypes = [
    { id: 'pediatric', label: 'Pediatric care', icon: <Baby className="h-5 w-5" /> },
    { id: 'newborn', label: 'Newborn care', icon: <Sparkles className="h-5 w-5" /> },
    { id: 'general', label: 'General OPD', icon: <Stethoscope className="h-5 w-5" /> },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Book appointment' }]}
        eyebrow="OPD token reservation"
        title={confirmedBooking ? 'Your token is reserved' : 'Book an OPD appointment'}
        description={
          confirmedBooking
            ? 'Keep your token number and reference code handy when you arrive at reception.'
            : `Reserve a sequential consultation token online. Same-day online booking closes at ${to12h(settings.onlineCutoffTime)} IST.`
        }
      />

      <Section size="md">
        {confirmedBooking ? (
          <div className="mx-auto max-w-2xl animate-scale-in">
            <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-lift">
              <div className="relative bg-ink-800 px-7 py-8 text-white sm:px-10">
                <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
                <div className="relative flex items-start justify-between gap-6">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm text-leaf-300">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmed
                    </p>
                    <p className="mt-4 text-sm text-white/60">OPD token</p>
                    <p className="text-6xl font-bold leading-none tracking-tight tabular-nums">#{confirmedBooking.tokenNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Reference</p>
                    <p className="mt-1 font-mono text-sm font-semibold">{confirmedBooking.appointmentCode}</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-canvas" />
                <div aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-canvas" />
                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-7 py-7 text-sm sm:grid-cols-2 sm:px-10">
                  {[
                    ['Patient', confirmedBooking.patientName],
                    ['Hospital patient ID', confirmedBooking.patientId],
                    ['Date', prettyDate(confirmedBooking.appointmentDate)],
                    ['Doctor', confirmedBooking.doctorName || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-ink-500">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-ink-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mx-7 mb-7 flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100 sm:mx-10">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                  <p>
                    Please arrive at reception by <strong>{to12h(settings.opdStartTime)}</strong> on {prettyDate(confirmedBooking.appointmentDate)} and give your token
                    number or registered mobile number to check in.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/patient/dashboard" className="flex-1">
                Go to patient portal
              </LinkButton>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConfirmedBooking(null);
                  setSelectedDate(nextEligibleDate);
                  setNotes('');
                }}
              >
                Book another appointment
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-8" noValidate>
              {errorMsg && (
                <Alert type="error" title="We couldn’t book this appointment">
                  {errorMsg}
                </Alert>
              )}

              {/* 1. Visit */}
              <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <legend className="sr-only">Visit details</legend>
                <p className="text-xs font-semibold text-leaf-700">Step 1</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-900">Visit details</h2>

                <div className="mt-6">
                  <p className="field-label" id="care-type-label">Type of care</p>
                  <div role="radiogroup" aria-labelledby="care-type-label" className="grid grid-cols-3 gap-2.5">
                    {careTypes.map(t => {
                      const on = appointmentType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setAppointmentType(t.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-[13px] font-semibold transition-[border-color,background-color,color] cursor-pointer',
                            on ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/15' : 'border-line text-ink-600 hover:border-ink-300'
                          )}
                        >
                          {t.icon}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="b-date" className="field-label">Appointment date</label>
                    <input
                      id="b-date"
                      type="date"
                      min={todayStr}
                      value={selectedDate}
                      onChange={e => {
                        setSelectedDate(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="field-control"
                      aria-describedby="b-date-hint"
                      required
                    />
                    <p id="b-date-hint" className="field-hint">
                      OPD from {to12h(settings.opdStartTime)} · same-day cutoff {to12h(settings.onlineCutoffTime)}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="b-doctor" className="field-label">Doctor</label>
                    <select id="b-doctor" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} className="field-control" aria-describedby="b-doc-hint">
                      {doctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.fullName} — {doc.department}
                        </option>
                      ))}
                    </select>
                    <p id="b-doc-hint" className="field-hint">{doctor?.consultationRoom || 'OPD hall'}</p>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {!cutoffStatus.allowed && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-5 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
                        <p className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          Online booking isn’t open for this date
                        </p>
                        <p className="mt-1.5 leading-relaxed">{cutoffStatus.reason}</p>
                        {cutoffStatus.nextEligibleDate && cutoffStatus.nextEligibleDate !== selectedDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(cutoffStatus.nextEligibleDate!);
                              setErrorMsg(null);
                            }}
                            className="link mt-2 inline-flex items-center gap-1 cursor-pointer"
                          >
                            Switch to {prettyDate(cutoffStatus.nextEligibleDate)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </fieldset>

              {/* 2. Patient */}
              <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <legend className="sr-only">Patient details</legend>
                <p className="text-xs font-semibold text-leaf-700">Step 2</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-900">Patient details</h2>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="b-name" className="field-label">Patient’s full name</label>
                    <input id="b-name" autoComplete="name" placeholder="e.g. Aarav Sharma" value={fullName} onChange={e => setFullName(e.target.value)} className="field-control" required />
                  </div>
                  <div>
                    <label htmlFor="b-guardian" className="field-label">
                      Parent / guardian <span className="font-normal text-ink-400">(for children)</span>
                    </label>
                    <input id="b-guardian" placeholder="e.g. Manoj Sharma (father)" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="field-control" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div>
                    <label htmlFor="b-phone" className="field-label">Mobile number</label>
                    <input
                      id="b-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10 digits"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="field-control"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="b-gender" className="field-label">Sex</label>
                    <select id="b-gender" value={gender} onChange={e => setGender(e.target.value as 'male' | 'female' | 'other')} className="field-control">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="b-age" className="text-[13px] font-semibold text-ink-800">Age</label>
                      <div role="radiogroup" aria-label="Age unit" className="inline-flex rounded-full bg-ink-50 p-0.5 text-[11px] font-semibold">
                        {(['years', 'months'] as const).map(u => (
                          <button
                            key={u}
                            type="button"
                            role="radio"
                            aria-checked={ageUnit === u}
                            onClick={() => setAgeUnit(u)}
                            className={cn('rounded-full px-2.5 py-0.5 capitalize cursor-pointer', ageUnit === u ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500')}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input id="b-age" type="number" min={1} max={ageUnit === 'months' ? 24 : 120} value={age} onChange={e => setAge(e.target.value)} className="field-control" required />
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="b-notes" className="field-label">
                    Reason for visit <span className="font-normal text-ink-400">(optional)</span>
                  </label>
                  <textarea
                    id="b-notes"
                    rows={3}
                    placeholder="e.g. Mild fever since yesterday, routine vaccination"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="field-control resize-y"
                  />
                </div>
              </fieldset>

              {/* 3. Confirm */}
              <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-line-strong accent-brand-700"
                  />
                  <span>
                    I confirm these details are accurate and agree to the{' '}
                    <Link to="/terms-and-conditions" className="link">terms &amp; conditions</Link> and{' '}
                    <Link to="/privacy-policy" className="link">privacy policy</Link> (DPDP Act).
                  </span>
                </label>
                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full"
                  isLoading={isSubmitting}
                  loadingText="Reserving your token…"
                  disabled={!cutoffStatus.allowed}
                  leftIcon={<CalendarCheck className="h-[18px] w-[18px]" />}
                >
                  Confirm appointment
                </Button>
                <p className="mt-3 text-center text-[13px] text-ink-500">Free to reserve — the consultation fee is paid at reception.</p>
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
                        <dd className="font-medium text-ink-900">{selectedDate ? prettyDate(selectedDate) : 'Choose a date'}</dd>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                      <div>
                        <dt className="sr-only">Doctor</dt>
                        <dd className="font-medium text-ink-900">{doctor?.fullName}</dd>
                        <dd className="text-ink-500">{doctor?.consultationRoom}</dd>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                      <div>
                        <dt className="sr-only">Time</dt>
                        <dd className="font-medium text-ink-900">OPD from {to12h(settings.opdStartTime)}</dd>
                        <dd className="text-ink-500">Called in token order</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <div className="rounded-3xl bg-leaf-50 p-6 ring-1 ring-leaf-200/70">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Info className="h-4 w-4 text-leaf-700" aria-hidden="true" /> How the queue works
                  </h2>
                  <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-ink-600">
                    <li>Same-day online booking closes at {to12h(settings.onlineCutoffTime)} IST.</li>
                    <li>Doctors begin consultations at {to12h(settings.opdStartTime)}.</li>
                    <li>Online and walk-in patients share one token sequence. Walk-in registration continues at reception after the cutoff.</li>
                  </ul>
                </div>

                <p className="flex items-center gap-2 px-1 text-[13px] text-ink-500">
                  <ShieldCheck className="h-4 w-4 text-leaf-600" aria-hidden="true" /> No online payment is taken.
                </p>
              </div>
            </aside>
          </div>
        )}
      </Section>
    </>
  );
};
