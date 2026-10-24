import React from 'react';
import { Baby, CheckCircle2, Clock, HeartPulse, Microscope, ShieldCheck } from 'lucide-react';
import { ScrollReveal } from '../../components/motion';
import { PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';

export interface JourneyMilestone {
  period: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
}

export const journeyMilestones: JourneyMilestone[] = [
  {
    period: 'Foundation',
    title: 'Satya Hospital opens in Civil Lines',
    subtitle: 'A commitment to accessible, ethical outpatient medicine',
    description:
      'Satya Hospital was established in Civil Lines, Prayagraj to bring compassionate community care and modern clinical practice together — with honest information and patient-first consultations from the start.',
    highlights: ['Dedicated outpatient (OPD) chambers', 'Ground-floor, accessible reception desk', 'General medicine and family care consultations'],
    icon: <HeartPulse className="h-5 w-5" />,
  },
  {
    period: 'Pediatric focus',
    title: 'A consultation suite for children',
    subtitle: 'Care for newborns, infants and adolescents',
    description:
      'Children need gentle, calm medical spaces. Dedicated pediatric chambers were set up with sanitised examination mats, calibrated growth tracking and unhurried conversations with parents.',
    highlights: ['Child-appropriate equipment and examination spaces', 'Routine immunisation tracking', 'Infant wellness assessments and feeding guidance'],
    icon: <Baby className="h-5 w-5" />,
  },
  {
    period: 'Laboratory',
    title: 'An in-house pathology laboratory',
    subtitle: 'Automated analysers and pathologist verification',
    description:
      'Clinical decisions need prompt, accurate results. Calibrated haematology and biochemistry analysers were installed on the premises, with gentle micro-sampling for children.',
    highlights: ['Automated biochemistry and haematology testing', 'Pathologist sign-off before any report is released', 'Quick turnaround for routine outpatient blood panels'],
    icon: <Microscope className="h-5 w-5" />,
  },
  {
    period: 'Fair queue',
    title: 'One sequential token queue',
    subtitle: 'Predictable waits, with no queue-jumping',
    description:
      'Online reservations and walk-in patients now receive token numbers from the same daily sequence, without distinction — so waiting times are fair and predictable.',
    highlights: ['Online booking opens one day before the visit', `Same-day online booking closes at 09:00 AM`, 'No duplicate tokens'],
    icon: <Clock className="h-5 w-5" />,
  },
  {
    period: 'Digital records',
    title: 'A secure patient portal',
    subtitle: 'Paperless records and private report delivery',
    description:
      'Patients can view verified lab reports, scanned prescriptions and upcoming OPD tokens from any device, with access limited to their own records.',
    highlights: ["Designed in line with India's DPDP Act", 'Each patient sees only their own records', 'Verified pathology reports as downloadable PDFs'],
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export const Journey: React.FC = () => (
  <>
    <PageHero
      crumbs={[{ label: 'Journey' }]}
      eyebrow="Our journey"
      title="How Satya Hospital grew, step by step"
      description="From a focused community clinic to a pediatric and diagnostic centre in Civil Lines, Prayagraj — the milestones that shaped our patient-first model."
    />

    <Section size="lg">
      <ol className="relative mx-auto max-w-4xl">
        <div aria-hidden="true" className="absolute left-[23px] top-3 bottom-3 w-px bg-gradient-to-b from-brand-300 via-leaf-300 to-line sm:left-[31px]" />
        {journeyMilestones.map((m, i) => (
          <li key={m.title} className="relative pb-14 pl-16 last:pb-0 sm:pl-24">
            <span
              className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              {m.icon}
            </span>
            <ScrollReveal distance={14} delay={0.04}>
              <p className="text-sm font-semibold text-leaf-700">
                {String(i + 1).padStart(2, '0')} · {m.period}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">{m.title}</h2>
              <p className="mt-1 text-[15px] font-medium text-brand-700">{m.subtitle}</p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-600">{m.description}</p>
              <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {m.highlights.map(h => (
                  <li key={h} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </li>
        ))}
      </ol>
    </Section>

    <CtaBand title="Experience child-first, family-centred care" />
  </>
);
