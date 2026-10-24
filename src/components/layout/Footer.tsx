import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, Mail, MapPin, PhoneCall } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { cleanSettingText, phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { BrandMark } from '../site/BrandMark';

const columns = [
  {
    title: 'Hospital',
    links: [
      { label: 'About Satya', to: '/about' },
      { label: 'Our doctors', to: '/doctors' },
      { label: 'Services', to: '/services' },
      { label: 'Our journey', to: '/journey' },
      { label: 'Facilities', to: '/facilities' },
      { label: 'Gallery', to: '/gallery' },
      { label: 'Testimonials', to: '/testimonials' },
      { label: 'News & advisories', to: '/news' },
    ],
  },
  {
    title: 'Care',
    links: [
      { label: 'Pediatric care', to: '/pediatric-care' },
      { label: 'Newborn & infant care', to: '/newborn-care' },
      { label: 'Pathology laboratory', to: '/pathology-lab' },
      { label: 'Book an appointment', to: '/book-appointment' },
      { label: 'Contact & directions', to: '/contact' },
    ],
  },
  {
    title: 'Patients',
    links: [
      { label: 'Patient login', to: '/patient/login' },
      { label: 'My appointments', to: '/patient/appointments' },
      { label: 'Lab reports', to: '/patient/reports' },
      { label: 'Prescriptions', to: '/patient/prescriptions' },
      { label: 'Staff portal', to: '/staff/login' },
    ],
  },
];

const legal = [
  { label: 'Privacy (DPDP)', to: '/privacy-policy' },
  { label: 'Terms', to: '/terms-and-conditions' },
  { label: 'Cancellation', to: '/cancellation-policy' },
  { label: 'Refunds', to: '/refund-policy' },
  { label: 'Medical disclaimer', to: '/disclaimer' },
  { label: 'Accessibility', to: '/accessibility' },
];

export const Footer: React.FC = () => {
  const { settings } = useHospital();

  return (
    <footer className="bg-ink-900 text-white/65">
      <div className="border-b border-white/10 bg-ink-950/40">
        <div className="container-page flex flex-col gap-2 py-4 text-[13px] md:flex-row md:items-center md:justify-between">
          <p className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-leaf-400" aria-hidden="true" />
            <span>Online bookings and reports are for routine outpatient care and are not an emergency service.</span>
          </p>
          <p className="md:text-right">
            In an emergency, come to the hospital or call{' '}
            <a href={phoneHref(settings.emergencyPhone)} className="font-semibold text-white underline-offset-4 hover:underline">
              {phoneDisplay(settings.emergencyPhone)}
            </a>
          </p>
        </div>
      </div>

      <div className="container-page grid grid-cols-1 gap-12 py-14 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-4 space-y-6">
          <BrandMark tone="dark" />
          <p className="max-w-sm text-sm leading-relaxed">
            Pediatric outpatient consultations, gentle newborn care and an in-house pathology laboratory in Civil Lines, Prayagraj.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              <span>{cleanSettingText(settings.address)}</span>
            </li>
            <li className="flex items-center gap-3">
              <PhoneCall className="h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              <a href={phoneHref(settings.phone)} className="hover:text-white transition-colors">
                {phoneDisplay(settings.phone)}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                {settings.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              <span>
                OPD from {to12h(settings.opdStartTime)}, Monday to Saturday
                <br />
                <span className="text-white/45">Same-day online booking closes {to12h(settings.onlineCutoffTime)}</span>
              </span>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
          {columns.map(col => (
            <div key={col.title}>
              <h2 className="text-[13px] font-semibold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map(l => (
                  <li key={l.to + l.label}>
                    <Link to={l.to} className="hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-[13px] md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legal.map(l => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-white/45">© {new Date().getFullYear()} Satya Hospital &amp; Pathology, Prayagraj</p>
        </div>
      </div>
    </footer>
  );
};
