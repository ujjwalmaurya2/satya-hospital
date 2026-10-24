import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { supabaseService } from '../../services/supabaseService';

export interface PatientTestimonial {
  id: string;
  patientName: string;
  locality: string;
  department: string;
  serviceType: string;
  comment: string;
  verifiedStatus: string;
  date?: string;
}

/** Local fallback used until approved testimonials are available from Supabase. */
export const patientTestimonials: PatientTestimonial[] = [
  {
    id: 't-1',
    patientName: 'Ramesh K. Verma',
    locality: 'Tagore Town, Prayagraj',
    department: 'General Medicine',
    serviceType: 'OPD Consultation',
    comment:
      'The 09:00 AM online token system and single queue saved us more than two hours of waiting. Dr. V. K. Sharma listened patiently and explained my seasonal cough medication clearly without unnecessary tests.',
    verifiedStatus: 'OPD patient',
    date: 'February 2026',
  },
  {
    id: 't-2',
    patientName: 'Sunita Devi Sharma',
    locality: 'Allahpur, Prayagraj',
    department: 'Pathology & Diagnostic Laboratory',
    serviceType: 'Pathology & Diagnostics',
    comment:
      'I gave my blood sample at 08:30 AM at the pathology collection counter. My complete blood count and thyroid reports were signed by the pathologist and downloadable on my phone before noon. Exceptionally clean lab.',
    verifiedStatus: 'Lab patient',
    date: 'January 2026',
  },
  {
    id: 't-3',
    patientName: 'Anil Kumar Maurya',
    locality: 'George Town, Prayagraj',
    department: 'Orthopaedics & Joint Care',
    serviceType: 'Queue & Reception',
    comment:
      'Even though I registered as a walk-in at reception after missing the 09:00 AM online cutoff, my token was called strictly in order on the waiting room screen. Complete fairness.',
    verifiedStatus: 'Walk-in patient',
    date: 'March 2026',
  },
  {
    id: 't-4',
    patientName: 'Priya M. Srivastava',
    locality: 'Civil Lines, Prayagraj',
    department: 'Obstetrics & Gynaecology',
    serviceType: 'OPD Consultation',
    comment:
      'Dr. Mishra was very courteous during my antenatal consultation. The first-floor consultation room was calm, hygienic and well organised. Staff helped me politely with my toddler.',
    verifiedStatus: 'OPD patient',
    date: 'January 2026',
  },
  {
    id: 't-5',
    patientName: 'Mohd. Tariq Siddiqui',
    locality: 'Kareli, Prayagraj',
    department: 'Day Care & Observation',
    serviceType: 'Day Care & Minor Procedure',
    comment:
      'Received wound suturing in the minor procedure room after a small vehicle scrape. The nursing care in the day care recovery bay was attentive and the dressing was done with great care.',
    verifiedStatus: 'Day care patient',
    date: 'February 2026',
  },
];

function initials(name: string) {
  return name
    .replace(/^(Dr|Mohd)\.?\s*/i, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('');
}

export const Testimonials: React.FC = () => {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<PatientTestimonial[]>(patientTestimonials);
  const [current, setCurrent] = useState(0);

  // Prefer admin-approved testimonials from the database when available.
  useEffect(() => {
    let alive = true;
    supabaseService.getApprovedTestimonials().then(rows => {
      if (alive && rows && rows.length > 0) {
        setItems(rows.map(r => ({ ...r })));
        setCurrent(0);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const active = items[current];
  const go = (dir: 1 | -1) => setCurrent(c => (c + dir + items.length) % items.length);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Testimonials' }]}
        eyebrow="Patient experiences"
        title="What families say about their visit"
        description="Feedback from patients and parents who visited for outpatient clinics, pediatric care and diagnostic tests."
      />

      <Section size="md">
        <div className="relative overflow-hidden rounded-[32px] bg-ink-800 px-6 py-12 text-white sm:px-14 sm:py-16">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
          <Quote className="relative h-10 w-10 text-brand-300" aria-hidden="true" />
          <div className="relative mt-6 min-h-[200px] sm:min-h-[170px]" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              {active && (
                <motion.figure
                  key={active.id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <blockquote className="max-w-4xl text-xl font-medium leading-relaxed tracking-[-0.01em] sm:text-[1.65rem] sm:leading-[1.5]">
                    “{active.comment}”
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold ring-1 ring-white/20" aria-hidden="true">
                      {initials(active.patientName)}
                    </span>
                    <span>
                      <span className="block font-semibold">{active.patientName}</span>
                      <span className="block text-sm text-white/60">
                        {active.locality} · {active.serviceType}
                      </span>
                    </span>
                  </figcaption>
                </motion.figure>
              )}
            </AnimatePresence>
          </div>
          <div className="relative mt-10 flex items-center justify-between border-t border-white/10 pt-6">
            <div className="flex gap-1.5" aria-hidden="true">
              {items.map((t, i) => (
                <span key={t.id} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/25 hover:bg-white/10 cursor-pointer"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/25 hover:bg-white/10 cursor-pointer"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section size="md" className="pt-0">
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">All feedback</h2>
        <StaggerContainer className="mt-8 columns-1 gap-5 md:columns-2 lg:columns-3 [&>*]:mb-5" staggerDelay={0.05}>
          {items.map(t => (
            <StaggerItem key={t.id} distance={10} className="break-inside-avoid">
              <figure className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <p className="text-xs font-semibold text-leaf-700">{t.department}</p>
                <blockquote className="mt-3 text-[15px] leading-relaxed text-ink-700">“{t.comment}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800" aria-hidden="true">
                    {initials(t.patientName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink-900">{t.patientName}</span>
                    <span className="block text-[13px] text-ink-500">
                      {t.locality}
                      {t.date ? ` · ${t.date}` : ''}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      <CtaBand />
    </>
  );
};
