import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Baby,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Heart,
  ListOrdered,
  MapPin,
  Microscope,
  PhoneCall,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { AnchorButton, Button, LinkButton } from '../../components/common/Button';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';
import { IconTile, Section, SectionHeading } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { useHospital } from '../../context/HospitalContext';
import { checkOnlineBookingCutoff, getHospitalDateWithOffset, getHospitalTodayDate, getNextEligibleOpdDate } from '../../lib/tokens';
import { cleanSettingText, phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';

function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });
}

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('');
}

export const Home: React.FC = () => {
  const { settings, departments, doctors, pathologyTests } = useHospital();
  const navigate = useNavigate();

  const nextEligibleDate = getNextEligibleOpdDate({
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  // Quick booking: pick a date, then sign in and complete details on /book-appointment.
  const [date, setDate] = useState(nextEligibleDate);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const maxDays = settings.maxAdvanceBookingDays || 30;

  const cutoff = checkOnlineBookingCutoff(date, {
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
    maxAdvanceDays: maxDays,
  });

  const submitQuickBooking = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/book-appointment?date=${encodeURIComponent(date)}`);
  };

  const opd = to12h(settings.opdStartTime);
  const cutoffTime = to12h(settings.onlineCutoffTime);

  const reasons = [
    { title: 'Child-centred care', text: 'Gentle, low-stress examinations designed around young patients.', icon: <Baby className="h-5 w-5" />, tone: 'brand' as const },
    { title: 'A fair single queue', text: 'Online and walk-in patients share one sequential token list — no skipping.', icon: <ListOrdered className="h-5 w-5" />, tone: 'leaf' as const },
    { title: 'Parent-friendly booking', text: `Book online a day ahead; same-day booking closes at ${cutoffTime}.`, icon: <CalendarDays className="h-5 w-5" />, tone: 'brand' as const },
    { title: 'In-house laboratory', text: 'Pathology reports are verified by a pathologist before release.', icon: <Microscope className="h-5 w-5" />, tone: 'leaf' as const },
  ];

  const services = [
    { title: 'Newborn & infant care', text: 'Checkups for babies up to 12 months — reflexes, weight gain and gentle feeding guidance.', icon: <Sparkles className="h-5 w-5" />, to: '/newborn-care' },
    { title: 'Growth & development', text: 'Regular screenings of growth percentiles, milestones and nutrition.', icon: <Activity className="h-5 w-5" />, to: '/pediatric-care' },
    { title: 'Vaccination & immunisation', text: 'National and standard immunisation schedules with clear digital records for parents.', icon: <Syringe className="h-5 w-5" />, to: '/pediatric-care' },
    { title: 'Childhood illness', text: 'Diagnosis and care for seasonal infections, allergies, colic and skin conditions.', icon: <Heart className="h-5 w-5" />, to: '/pediatric-care' },
    { title: 'Pathology & diagnostics', text: 'Child-friendly blood and urine testing in our own laboratory.', icon: <Microscope className="h-5 w-5" />, to: '/pathology-lab' },
  ];

  const guidance = [
    { title: 'Before the visit', text: "Note fever timings, current medicines and appetite changes, and bring your child's immunisation booklet." },
    { title: 'Keep vaccine records', text: 'We check the immunisation record at every wellness visit and guide you on any overdue doses.' },
    { title: 'Reports online', text: 'Verified pathology reports can be downloaded as PDFs from the patient portal — no waiting for printouts.' },
  ];

  const faqs = [
    {
      q: 'What time does online OPD booking close?',
      a: `Online booking for a given day closes at ${cutoffTime} IST on that day, so the morning list can be finalised. Walk-in registration at reception continues once OPD begins at ${opd}.`,
    },
    {
      q: 'How does the shared token queue work?',
      a: 'Online bookings and walk-ins share one sequential daily queue. No token is issued twice, and patients are called strictly in order.',
    },
    {
      q: "How should we prepare for a child's first consultation?",
      a: 'Please bring previous medical records, the birth summary and the vaccination book. A favourite small toy can help your child feel at ease during the examination.',
    },
    {
      q: 'When can I see my child’s pathology report?',
      a: 'After processing, every report is reviewed and signed off by the pathologist. It is then published to your patient portal as a downloadable PDF.',
    },
    {
      q: 'Do I need to pay online to book a token?',
      a:
        settings.isOnlinePaymentEnabled && settings.isPolicyApprovedByHospital && settings.consultationFee
          ? `Yes. The OPD consultation fee is paid securely online when you book, and your token is issued once the payment is verified.`
          : 'No online payment is required at present. Consultation fees are paid at the reception desk when you arrive.',
    },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------------ HERO */}
      <section className="relative">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-canvas to-canvas" />
        <div aria-hidden="true" className="absolute -top-48 right-[-12%] -z-10 h-[560px] w-[760px] rounded-full bg-brand-200/30 blur-3xl" />
        <div aria-hidden="true" className="absolute top-72 -left-40 -z-10 h-80 w-[420px] rounded-full bg-leaf-100 blur-3xl" />

        <div className="container-page grid grid-cols-1 items-center gap-12 pt-10 pb-24 sm:pt-14 lg:grid-cols-12 lg:gap-10 lg:pt-16 lg:pb-32">
          <div className="lg:col-span-6 xl:col-span-6">
            <p className="eyebrow animate-rise">Pediatric &amp; family care · Civil Lines, Prayagraj</p>
            <h1 className="display-1 mt-5 animate-rise [animation-delay:70ms]">
              Expert care for your child.{' '}
              <span className="text-brand-600">Comfort for your family.</span>
            </h1>
            <p className="lead mt-6 max-w-xl animate-rise [animation-delay:140ms]">
              Structured pediatric consultations, gentle newborn care and an in-house pathology laboratory — designed to make
              doctor visits reassuring for children and straightforward for parents.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row animate-rise [animation-delay:210ms]">
              <LinkButton to="/book-appointment" size="lg" leftIcon={<CalendarCheck className="h-[18px] w-[18px]" />}>
                Book an appointment
              </LinkButton>
              <AnchorButton href={phoneHref(settings.phone)} size="lg" variant="outline" leftIcon={<PhoneCall className="h-[18px] w-[18px] text-brand-600" />}>
                Call the hospital
              </AnchorButton>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-6 animate-rise [animation-delay:280ms]">
              <div>
                <dt className="text-[13px] text-ink-500">OPD begins</dt>
                <dd className="mt-1 text-[15px] font-semibold text-ink-900">{opd}, Mon–Sat</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-500">Same-day online booking</dt>
                <dd className="mt-1 text-[15px] font-semibold text-ink-900">Closes {cutoffTime}</dd>
              </div>
            </dl>
          </div>

          {/* Visual composition */}
          <div className="relative lg:col-span-6 animate-rise [animation-delay:120ms]">
            <div className="relative overflow-hidden rounded-[32px] bg-ink-50 shadow-lift ring-1 ring-ink-900/5 aspect-[6/5] sm:aspect-[5/4] lg:aspect-[6/5]">
              <img
                src="/images/pediatric-hero.jpg"
                alt="A pediatrician listening to a young child's chest while the child sits with his mother"
                className="h-full w-full object-cover object-[58%_center]"
                loading="eager"
                fetchPriority="high"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/25 to-transparent" />
            </div>

            {/* Authentic campus inset */}
            <figure className="absolute -bottom-10 -left-4 hidden w-56 overflow-hidden rounded-2xl bg-white p-2 shadow-float ring-1 ring-ink-900/5 sm:block lg:-left-10 xl:w-64">
              <img
                src="/images/satya-hospital-building.jpg"
                alt="The Satya Hospital building in Civil Lines, Prayagraj"
                className="aspect-[16/10] w-full rounded-xl object-cover"
                loading="eager"
              />
              <figcaption className="flex items-center gap-1.5 px-1.5 pt-2 pb-0.5 text-[12.5px] font-medium text-ink-700">
                <MapPin className="h-3.5 w-3.5 text-leaf-600" aria-hidden="true" />
                Our Civil Lines campus
              </figcaption>
            </figure>

            {/* Next booking date */}
            <div className="absolute -top-5 right-4 hidden rounded-2xl bg-white/95 px-4 py-3 shadow-float ring-1 ring-ink-900/5 backdrop-blur sm:block lg:-right-4">
              <p className="text-xs text-ink-500">Next OPD day</p>
              <p className="mt-0.5 text-sm font-semibold text-ink-900">{prettyDate(nextEligibleDate)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- QUICK BOOKING */}
      <div className="container-page relative z-10 -mt-12 sm:-mt-16">
        <ScrollReveal distance={12}>
          <form
            onSubmit={submitQuickBooking}
            className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7"
            aria-labelledby="quick-booking-title"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="quick-booking-title" className="text-lg font-semibold tracking-tight text-ink-900">
                  Book an OPD appointment
                </h2>
                <p className="text-sm text-ink-500">Choose a date, then sign in with Google to add the patient’s details.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="sm:w-64">
                <label htmlFor="qb-date" className="field-label">Appointment date</label>
                <input
                  id="qb-date"
                  type="date"
                  className="field-control"
                  min={getHospitalTodayDate()}
                  max={getHospitalDateWithOffset(maxDays)}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="md" className="h-[46px] w-full sm:w-auto" disabled={!cutoff.allowed} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Book OPD
              </Button>
              <p className="text-[13px] text-ink-500 sm:ml-auto sm:max-w-xs sm:text-right">
                Book up to {maxDays} days ahead. Same-day online booking closes at {cutoffTime}.
              </p>
            </div>
            <AnimatePresence initial={false}>
              {!cutoff.allowed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-[13px] text-warning-700 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {cutoff.reason}
                    </span>
                    {cutoff.nextEligibleDate && cutoff.nextEligibleDate !== date && (
                      <button type="button" onClick={() => setDate(cutoff.nextEligibleDate!)} className="link shrink-0 text-left cursor-pointer">
                        Use {prettyDate(cutoff.nextEligibleDate)}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </ScrollReveal>
      </div>

      {/* ----------------------------------------------------- WHY SATYA */}
      <Section size="md" className="pt-16 sm:pt-20">
        <StaggerContainer className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.06}>
          {reasons.map(r => (
            <StaggerItem key={r.title} distance={12}>
              <IconTile tone={r.tone}>{r.icon}</IconTile>
              <h3 className="heading-3 mt-4 text-base">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{r.text}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* ----------------------------------------------------- SERVICES (bento) */}
      <Section size="md" className="pt-4">
        <ScrollReveal distance={14}>
          <SectionHeading
            eyebrow="Pediatric care"
            title="Healthcare designed around your child"
            description="From newborn wellness and immunisation to childhood illness and diagnostics — all under one roof in Prayagraj."
            action={
              <LinkButton to="/pediatric-care" variant="outline" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Pediatric care
              </LinkButton>
            }
          />
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2">
          <ScrollReveal className="lg:row-span-2" distance={14}>
            <Link
              to="/pediatric-care"
              className="group relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-ink-800 p-7 text-white sm:p-8"
            >
              <img
                src="/images/newborn-care.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[62%_center] opacity-85 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/35 to-transparent" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" /> Daily OPD
                </span>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">Pediatric consultation</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">
                  Outpatient examinations for infants, toddlers and adolescents — common illnesses, fever and routine wellness.
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  Learn more <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2 lg:row-span-2" staggerDelay={0.05}>
            {services.map((s, i) => (
              <StaggerItem key={s.title} distance={12} className={cn(i === services.length - 1 && 'sm:col-span-2')}>
                <Link
                  to={s.to}
                  className="group flex h-full flex-col rounded-3xl border border-line bg-white p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between">
                    <IconTile tone={i % 2 ? 'leaf' : 'brand'}>{s.icon}</IconTile>
                    <ArrowUpRight className="h-5 w-5 text-ink-300 transition-colors group-hover:text-brand-600" aria-hidden="true" />
                  </div>
                  <h3 className="heading-3 mt-5 text-base">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.text}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ----------------------------------------------------- ABOUT (authentic photo) */}
      <Section size="lg" tone="tint">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <ScrollReveal className="lg:col-span-6" direction="right" distance={16}>
            <div className="relative">
              <div className="overflow-hidden rounded-[28px] shadow-lift ring-1 ring-ink-900/5">
                <img
                  src="/images/satya-hospital-building.jpg"
                  alt="Front of Satya Hospital, Civil Lines, Prayagraj"
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div aria-hidden="true" className="absolute -bottom-5 -right-5 -z-10 h-full w-full rounded-[28px] bg-leaf-200/50" />
            </div>
          </ScrollReveal>
          <ScrollReveal className="lg:col-span-6" direction="left" distance={16}>
            <p className="eyebrow">About Satya Hospital</p>
            <h2 className="display-2 mt-3">Compassionate care, rooted in clinical ethics</h2>
            <p className="lead mt-5">
              Satya Hospital in Civil Lines, Prayagraj is committed to compassionate outpatient care and diagnostic accuracy. Our
              doctors take the time to examine gently and to answer parents’ questions fully.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                ['Hygienic clinical environment', 'Clean consultation rooms, sanitised infant examination areas and calm waiting spaces.'],
                ['One fair queue', 'Online appointments and walk-in patients are called strictly in token order.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink-900">{t}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton to="/about" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Our story
              </LinkButton>
              <LinkButton to="/facilities" variant="ghost">
                View facilities
              </LinkButton>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* ----------------------------------------------------- DOCTORS */}
      <Section size="lg">
        <ScrollReveal distance={14}>
          <SectionHeading
            eyebrow="Consulting doctors"
            title="Meet the medical team"
            description="Each profile lists the doctor’s qualifications, department and consultation room."
            action={
              <LinkButton to="/doctors" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                All doctors
              </LinkButton>
            }
          />
        </ScrollReveal>
        <StaggerContainer className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.06}>
          {doctors.map(doc => (
            <StaggerItem key={doc.id} distance={12} className="h-full">
              <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-leaf-100 text-lg font-semibold text-brand-800" aria-hidden="true">
                    {initials(doc.fullName)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold tracking-tight text-ink-900">{doc.fullName}</h3>
                    <p className="text-sm text-brand-700">{doc.designation}</p>
                  </div>
                </div>
                <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 text-ink-500">Qualifications</dt>
                    <dd className="font-medium text-ink-800">{doc.qualifications}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 text-ink-500">Department</dt>
                    <dd className="font-medium text-ink-800">{doc.department}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 text-ink-500">OPD</dt>
                    <dd className="font-medium text-ink-800">{doc.opdTimings}</dd>
                  </div>
                </dl>
                <div className="mt-auto pt-6">
                  <LinkButton to={`/book-appointment?doctor=${doc.id}`} variant="soft" className="w-full" leftIcon={<CalendarCheck className="h-4 w-4" />}>
                    Book with {doc.fullName.replace(/^Dr\.?\s*/, 'Dr. ').split(' ').slice(0, 2).join(' ')}
                  </LinkButton>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* ----------------------------------------------------- PATHOLOGY */}
      <Section size="lg" tone="navy" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[480px] w-[480px] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <ScrollReveal className="lg:col-span-5" distance={14}>
            <p className="eyebrow text-brand-300">In-house laboratory</p>
            <h2 className="display-2 mt-3 text-white">Clinical pathology for children and adults</h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-white/70">
              Blood, serum and urine diagnostics are processed on-site, with fine-needle sampling for young patients and verification by a
              qualified pathologist before any report is released.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                ['Gentle pediatric sampling', 'Fine micro-needles and supportive techniques to minimise distress.'],
                ['Two-step sign-off', 'Every report is verified before it is published to the patient portal.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3.5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-leaf-400" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-white">{t}</p>
                    <p className="mt-0.5 text-sm text-white/60">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton to="/pathology-lab" className="bg-white text-ink-900 hover:bg-brand-50" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Explore tests
              </LinkButton>
              <LinkButton
                to="/patient/reports"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:border-white/50 hover:text-white"
                leftIcon={<FileText className="h-4 w-4" />}
              >
                My reports
              </LinkButton>
            </div>
          </ScrollReveal>

          <ScrollReveal className="lg:col-span-7" distance={14} delay={0.06}>
            <div className="overflow-hidden rounded-3xl bg-white text-ink-800 shadow-float">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <p className="text-sm font-semibold text-ink-900">Frequently requested tests</p>
                <p className="text-xs text-ink-500">In-house rates</p>
              </div>
              <ul className="divide-y divide-line">
                {pathologyTests.slice(0, 5).map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{t.name}</p>
                      <p className="mt-0.5 text-[13px] text-ink-500">
                        {t.category} · {t.specimenType}
                        {t.fastingRequired ? ' · Fasting' : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-ink-900">₹{t.price}</p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-1 border-t border-line bg-ink-50/60 px-6 py-4 text-[13px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Sample collection daily, 08:00 AM – 02:00 PM</span>
                <Link to="/pathology-lab" className="link">
                  All {pathologyTests.length} tests
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* ----------------------------------------------------- PARENT GUIDANCE */}
      <Section size="lg">
        <ScrollReveal distance={14}>
          <SectionHeading eyebrow="For parents" title="Helpful things to know" align="center" />
        </ScrollReveal>
        <div className="relative mt-14">
          <div aria-hidden="true" className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent md:block" />
          <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {guidance.map((g, i) => (
              <li key={g.title} className="text-center">
                <ScrollReveal delay={i * 0.06} distance={12}>
                  <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-semibold text-brand-700 shadow-card ring-1 ring-line">
                    {i + 1}
                  </span>
                  <h3 className="heading-3 mt-5">{g.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{g.text}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ----------------------------------------------------- FAQ */}
      <Section size="md" className="border-t border-line">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow">Parent support</p>
            <h2 className="display-2 mt-3">Frequently asked questions</h2>
            <p className="lead mt-4">OPD timings, the token queue and pathology reports.</p>
            <LinkButton to="/contact" variant="outline" className="mt-7" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Ask the reception desk
            </LinkButton>
          </div>
          <div className="lg:col-span-8 divide-y divide-line border-y border-line">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q}>
                  <h3>
                    <button
                      type="button"
                      id={`faq-q-${i}`}
                      aria-expanded={open}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left text-[16px] font-semibold text-ink-900 cursor-pointer"
                    >
                      {f.q}
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 transition-[transform,background-color]',
                          open ? 'rotate-45 bg-brand-700 text-white ring-brand-700' : 'text-ink-500 ring-line-strong'
                        )}
                        aria-hidden="true"
                      >
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`faq-a-${i}`}
                        role="region"
                        aria-labelledby={`faq-q-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-6 pr-12 text-[15px] leading-relaxed text-ink-600">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------- VISIT */}
      <Section size="sm" className="pb-0">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: <Clock className="h-5 w-5" />,
              title: 'OPD hours',
              body: (
                <>
                  From {opd}, Monday to Saturday. Same-day online booking closes {cutoffTime}.
                </>
              ),
            },
            {
              icon: <MapPin className="h-5 w-5" />,
              title: 'Address',
              body: <>{cleanSettingText(settings.address)}</>,
              link: { to: '/contact', label: 'Directions' },
            },
            {
              icon: <PhoneCall className="h-5 w-5" />,
              title: 'Phone',
              body: (
                <>
                  Reception{' '}
                  <a href={phoneHref(settings.phone)} className="font-semibold text-ink-900 hover:underline">
                    {phoneDisplay(settings.phone)}
                  </a>
                  <br />
                  Emergency{' '}
                  <a href={phoneHref(settings.emergencyPhone)} className="font-semibold text-danger-700 hover:underline">
                    {phoneDisplay(settings.emergencyPhone)}
                  </a>
                </>
              ),
            },
          ].map(c => (
            <div key={c.title} className="rounded-3xl border border-line bg-white p-6">
              <IconTile tone="ink">{c.icon}</IconTile>
              <h3 className="heading-3 mt-4 text-base">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{c.body}</p>
              {c.link && (
                <Link to={c.link.to} className="link mt-3 inline-flex items-center gap-1 text-sm">
                  {c.link.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </div>
  );
};
