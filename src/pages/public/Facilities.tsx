import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, Bed, CheckCircle2, Clock, MapPin, Microscope, Stethoscope, Syringe } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { cn } from '../../lib/cn';

export interface HospitalFacility {
  id: string;
  category: 'pediatric' | 'opd' | 'lab' | 'daycare' | 'tech';
  title: string;
  badge: string;
  location: string;
  timing: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}

export const hospitalFacilities: HospitalFacility[] = [
  {
    id: 'fac-pediatric-wing',
    category: 'pediatric',
    title: 'Child-Friendly Pediatric Consultation Wing',
    badge: 'Child & Infant Care',
    location: 'Ground Floor, Pediatric Suite',
    timing: '09:30 AM – 02:00 PM Daily',
    description: 'Bright, colorful, sanitized consultation room equipped specifically for children, with gentle medical toys and comfortable parent seating.',
    features: [
      'Gentle pediatric examination bed with sanitized disposable covers',
      'Child-appropriate diagnostic equipment (stethoscopes, otoscopes, scales)',
      'Direct link to the unified sequential token queue'
    ],
    icon: <Baby className="h-5 w-5" />,
  },
  {
    id: 'fac-opd-chambers',
    category: 'opd',
    title: 'Outpatient Consultation Chambers',
    badge: 'Ground & First Floor',
    location: 'Chambers 101 to 106',
    timing: '09:30 AM – 02:00 PM Daily',
    description: 'Sound-isolated, hygienic examination suites dedicated to private doctor-patient consultations in General Medicine, Surgery, Gynaecology, and Orthopaedics.',
    features: [
      'Private clinical examination beds and step stools',
      'Digital diagnostic wall sets (Ophthalmoscope / Otoscope)',
      'Workstation connection to hospital management software'
    ],
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    id: 'fac-path-lab',
    category: 'lab',
    title: 'Automated Pathology Laboratory',
    badge: 'Certified Diagnostic Lab',
    location: 'Ground Floor, Lab Wing',
    timing: '08:00 AM – 02:00 PM (Sample Intake)',
    description: 'Equipped with calibrated 3-part / 5-part hematology and auto-biochemistry analyzers. Routine blood and urine tests processed with multi-level internal quality control.',
    features: [
      'Automated biochemistry & electrolyte analyzers',
      'Micro-sampling needle kits for gentle pediatric phlebotomy',
      'Mandatory two-step sign-off by Senior Pathologist'
    ],
    icon: <Microscope className="h-5 w-5" />,
  },
  {
    id: 'fac-daycare',
    category: 'daycare',
    title: 'Day Care Observation & Short-Stay Unit',
    badge: 'Clinical Observation',
    location: 'Ground Floor, East Wing',
    timing: '09:00 AM – 06:00 PM',
    description: 'Designed for patients requiring short-term intravenous medications, post-procedure observation, dehydration management, or vital monitoring under nursing supervision.',
    features: [
      'Adjustable patient recovery beds with nurse call alerts',
      'Multi-parameter monitors for continuous vitals tracking',
      'Dedicated nursing station with oxygen delivery points'
    ],
    icon: <Bed className="h-5 w-5" />,
  },
  {
    id: 'fac-minor-ot',
    category: 'daycare',
    title: 'Minor Operation Theatre (OT) & Procedure Suite',
    badge: 'Sterile Minor Procedures',
    location: 'Ground Floor, Clinical Wing',
    timing: 'Scheduled & Urgent Hours',
    description: 'Sterile procedure room equipped for aseptic outpatient surgical procedures, abscess drainage, minor wound debridement, surgical suturing, and dressing.',
    features: [
      'Surgical shadowless LED lighting and autoclave-sterilized instruments',
      'Local anaesthesia delivery station and cardiac monitoring',
      'Strict infection control and biomedical waste disposal protocols'
    ],
    icon: <Syringe className="h-5 w-5" />,
  },
  {
    id: 'fac-reception-kiosk',
    category: 'tech',
    title: 'Central Reception & Unified Token Kiosk',
    badge: 'Single Sequential Queue',
    location: 'Main Hospital Entrance',
    timing: '08:30 AM – 08:00 PM Daily',
    description: 'Modern reception desk synchronizing online booking verifications with in-person walk-in registrations onto the single sequential daily token queue.',
    features: [
      'Real-time token display monitor in waiting area',
      'Stroller and ramp accessibility from parking to consultation rooms',
      'Instant verification and printed token slips'
    ],
    icon: <Clock className="h-5 w-5" />,
  },
];

const categories = [
  { id: 'all', label: 'All facilities' },
  { id: 'pediatric', label: 'Pediatric wing' },
  { id: 'opd', label: 'OPD & clinics' },
  { id: 'lab', label: 'Laboratory' },
  { id: 'daycare', label: 'Day care & minor OT' },
  { id: 'tech', label: 'Reception & queue' },
] as const;

type CategoryId = (typeof categories)[number]['id'];

export const Facilities: React.FC = () => {
  const [active, setActive] = useState<CategoryId>('all');
  const list = active === 'all' ? hospitalFacilities : hospitalFacilities.filter(f => f.category === active);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Facilities' }]}
        eyebrow="Facilities & amenities"
        title="Spaces designed for hygiene, accuracy and comfort"
        description="Child-friendly consultation rooms, an automated laboratory and calm waiting areas for families during morning OPD."
        image={{ src: '/images/satya-hospital-building.jpg', alt: 'Satya Hospital building and entrance', position: '55% 45%' }}
      />

      <Section size="md">
        <div role="tablist" aria-label="Facility categories" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map(c => {
            const on = c.id === active;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(c.id)}
                className={cn(
                  'relative h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors cursor-pointer',
                  on ? 'text-white' : 'border border-line bg-white text-ink-700 hover:border-ink-300'
                )}
              >
                {on && <motion.span layoutId="fac-pill" className="absolute inset-0 rounded-full bg-ink-800" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">{c.label}</span>
              </button>
            );
          })}
        </div>

        <StaggerContainer key={active} className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2" staggerDelay={0.05}>
          {list.map((f, i) => (
            <StaggerItem key={f.id} distance={10} className="h-full">
              <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-soft">
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset',
                      i % 2 ? 'bg-leaf-50 text-leaf-700 ring-leaf-200/70' : 'bg-brand-50 text-brand-700 ring-brand-100'
                    )}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-leaf-700">{f.badge}</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">{f.title}</h2>
                  </div>
                </div>
                <p className="mt-5 text-[15px] leading-relaxed text-ink-600">{f.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {f.features.map(ft => (
                    <li key={ft} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                      {ft}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-[13px] text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    {f.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    {f.timing}
                  </span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      <CtaBand />
    </>
  );
};
