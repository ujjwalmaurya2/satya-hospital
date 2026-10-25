import React from 'react';
import { Link } from 'react-router-dom';
import { Baby, Building2, CalendarDays, CalendarPlus, ChevronRight, ClipboardList, Clock, FlaskConical, MapPin, Microscope, PhoneCall, Stethoscope, Syringe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { cleanSettingText, phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

function greeting() {
  const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const press = 'transition-transform active:scale-[0.98] motion-reduce:active:scale-100';

/** App-style home for phones (hidden from md up, where the full home page shows). */
export const MobileHome: React.FC<{ nextEligibleDate: string }> = ({ nextEligibleDate }) => {
  const { settings } = useHospital();
  const { user, patientProfile, isAuthenticated } = useAuth();
  const firstName = isAuthenticated ? (patientProfile?.fullName || user?.fullName || '').split(' ')[0] : '';

  const quick = [
    { label: 'Appointments', to: '/patient/appointments', icon: CalendarDays },
    { label: 'Lab orders', to: '/patient/lab-orders', icon: ClipboardList },
    { label: 'Doctors', to: '/doctors', icon: Stethoscope },
  ];
  // Existing pages only; newborn care has its own photo card above these.
  const services = [
    { label: 'Child care', to: '/pediatric-care', icon: Baby },
    { label: 'Vaccination', to: '/pediatric-care', icon: Syringe },
    { label: 'Pathology lab', to: '/pathology-lab', icon: Microscope },
    { label: 'Facilities', to: '/facilities', icon: Building2 },
  ];

  return (
    <div className="space-y-7 pb-4 md:hidden">
      <header className="container-page pt-5">
        <p className="text-[13px] font-medium text-ink-500">
          {greeting()}
          {firstName && `, ${firstName}`}
        </p>
        <h1 className="mt-0.5 text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-ink-900">How can we help today?</h1>
      </header>

      {/* Primary journeys: doctor (OPD) and lab tests are separate bookings. */}
      <section className="container-page" aria-label="Book">
        <Link to="/book-appointment" className={cn('relative block overflow-hidden rounded-3xl bg-ink-900 text-white shadow-lift', press)}>
          <img
            src="/images/pediatric-hero-800.webp"
            alt=""
            width={800}
            height={446}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/55 to-ink-950/0" />
          <div className="relative flex min-h-[236px] flex-col justify-between gap-6 p-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-950/55 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Next OPD · {shortDate(nextEligibleDate)}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700">
                <CalendarPlus className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold leading-tight">Book doctor appointment</span>
                <span className="mt-0.5 block text-[13px] text-white/80">OPD from {to12h(settings.opdStartTime)}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
            </span>
          </div>
        </Link>

        <Link to="/lab-tests" className={cn('mt-3 flex items-center gap-3 rounded-3xl border border-leaf-200 bg-leaf-50 p-4', press)}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-leaf-700 text-white">
            <FlaskConical className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-ink-900">Book lab tests</span>
            <span className="block text-[13px] text-ink-600">Tests & packages · no appointment needed</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
        </Link>
      </section>

      <section className="container-page" aria-label="Quick links">
        <ul className="grid grid-cols-4 gap-2">
          {quick.map(q => (
            <li key={q.label}>
              <QuickLink to={q.to} label={q.label} icon={<q.icon className="h-6 w-6" aria-hidden="true" />} />
            </li>
          ))}
          <li>
            <a href={phoneHref(settings.phone)} className={cn('flex flex-col items-center gap-1.5 rounded-2xl py-2 text-center', press)}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line">
                <PhoneCall className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-ink-700">Call</span>
            </a>
          </li>
        </ul>
      </section>

      <section className="container-page" aria-labelledby="m-services">
        <h2 id="m-services" className="text-lg font-semibold tracking-tight text-ink-900">Our care</h2>
        <Link to="/newborn-care" className={cn('relative mt-3 block overflow-hidden rounded-3xl', press)}>
          <img src="/images/newborn-care-800.webp" alt="A doctor gently examining a baby" width={800} height={446} loading="lazy" className="aspect-[16/8] w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-4 pt-10 text-base font-semibold text-white">Newborn & infant care</span>
        </Link>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {services.map(s => (
            <li key={s.label}>
              <Link to={s.to} className={cn('flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5', press)}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold leading-snug text-ink-900">{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page" aria-labelledby="m-visit">
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <img src="/images/satya-hospital-building-800.webp" alt="The Satya Hospital building in Civil Lines, Prayagraj" width={800} height={446} loading="lazy" className="aspect-[16/7] w-full object-cover" />
          <div className="p-5">
            <h2 id="m-visit" className="text-base font-semibold text-ink-900">Visit us</h2>
            <p className="mt-1 flex items-start gap-2 text-sm text-ink-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
              {cleanSettingText(settings.address)}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-600">
              <Clock className="h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
              OPD from {to12h(settings.opdStartTime)}, Mon–Sat · online booking closes {to12h(settings.onlineCutoffTime)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a href={phoneHref(settings.phone)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-700 text-sm font-semibold text-white">
                <PhoneCall className="h-[18px] w-[18px]" aria-hidden="true" /> Call
              </a>
              <Link to="/contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line-strong text-sm font-semibold text-ink-800">
                <MapPin className="h-[18px] w-[18px]" aria-hidden="true" /> Directions
              </Link>
            </div>
            <p className="mt-3 text-center text-[13px] text-ink-500">
              Emergency{' '}
              <a href={phoneHref(settings.emergencyPhone)} className="font-semibold text-danger-700">
                {phoneDisplay(settings.emergencyPhone)}
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const QuickLink: React.FC<{ to: string; label: string; icon: React.ReactNode }> = ({ to, label, icon }) => (
  <Link to={to} className={cn('flex flex-col items-center gap-1.5 rounded-2xl py-2 text-center', press)}>
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line">{icon}</span>
    <span className="text-xs font-medium leading-tight text-ink-700">{label}</span>
  </Link>
);
