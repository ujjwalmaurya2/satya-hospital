import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ScrollReveal } from '../../components/motion';
import { PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { cn } from '../../lib/cn';

export interface NewsArticle {
  id: string;
  title: string;
  category: 'operational' | 'clinical' | 'lab' | 'community';
  categoryLabel: string;
  publishDate: string;
  department: string;
  readTime: string;
  summary: string;
  fullContent: string[];
  keyPoints: string[];
  badgeVariant: 'teal' | 'sky-blue' | 'mint' | 'warning' | 'neutral';
}

export const hospitalNewsArticles: NewsArticle[] = [
  {
    id: 'news-pediatric-fever',
    title: 'Seasonal Viral Illnesses & Fever: Pediatric Care Advisory for Parents',
    category: 'clinical',
    categoryLabel: 'Pediatric Care',
    publishDate: 'October 20, 2026',
    department: 'Paediatrics & Neonatology Wing',
    readTime: '3 min read',
    summary: 'Clinical guidance on monitoring childhood fever, avoiding self-medication, maintaining hydration, and knowing when to present for an in-person pediatric evaluation.',
    fullContent: [
      'Seasonal temperature changes often bring an increase in acute viral upper respiratory tract infections and childhood fevers in Prayagraj.',
      'Our consulting pediatricians advise parents to maintain gentle oral rehydration, record temperature readings using digital axillary thermometers, and avoid over-the-counter antibiotic or heavy combination fever syrups without medical consultation.',
      'If your child displays persistent high fever beyond 48 hours, refusal to drink fluids, lethargy, or rapid breathing, schedule an early morning OPD consultation token or visit the hospital reception directly.'
    ],
    keyPoints: [
      'Never give aspirin or multi-drug combination cold remedies to toddlers without a prescription',
      'Encourage frequent small sips of fluids, oral rehydration salts (ORS), and light nourishing meals',
      'Online OPD bookings open at 1 day before appointment and close at 09:00 AM on consultation date'
    ],
    badgeVariant: 'teal',
  },
  {
    id: 'news-1',
    title: 'New Calibrated 5-Part Hematology Auto-Analyzer Commissioned',
    category: 'lab',
    categoryLabel: 'Diagnostic & Lab',
    publishDate: 'October 15, 2026',
    department: 'Pathology & Diagnostic Laboratory',
    readTime: '3 min read',
    summary: 'The hospital laboratory has successfully commissioned an automated 5-part differential cell counter, reducing Complete Blood Count (CBC) turnaround times to under 2 hours for OPD patients.',
    fullContent: [
      'Satya Hospital’s clinical laboratory wing has completed installation and multi-level calibration of a 5-part automated hematology analyzer on the hospital ground floor.',
      'This diagnostic upgrade significantly reduces turnaround times for routine Complete Blood Counts (CBC), Erythrocyte Sedimentation Rate (ESR), and differential leukocyte profiling from the previous 4 hours down to under 2 hours.',
      'All diagnostic results continue to undergo a mandatory two-step sign-off by our Senior Pathologist before release to the Patient Health Portal. Emergency acute panels are given priority status.'
    ],
    keyPoints: [
      'Turnaround time reduced to under 2 hours for routine blood counts',
      'Daily 3-level internal quality control runs conducted each morning',
      'Automated barcoded tube indexing prevents specimen mix-ups'
    ],
    badgeVariant: 'sky-blue',
  },
  {
    id: 'news-2',
    title: 'Fair Queue Architecture: Same-Day 09:00 AM Cutoff Operational',
    category: 'operational',
    categoryLabel: 'Queue & OPD',
    publishDate: 'September 28, 2026',
    department: 'Hospital Administration & Reception',
    readTime: '2 min read',
    summary: 'A reminder to patients that online appointment bookings close at 09:00 AM on the day of consultation. Reception desk walk-in registration continues for all arriving patients without interruption.',
    fullContent: [
      'To maintain prompt morning doctor consultation start times at 09:30 AM, Satya Hospital enforces an automated 09:00 AM IST cutoff for same-day online bookings.',
      'This protocol gives consulting physicians and nursing staff 30 minutes to review morning rosters, prepare physical OPD patient cards, and ready diagnostic test requisitions.',
      'Patients arriving after 09:00 AM without an online reservation are welcomed at the ground-floor reception desk, where walk-in tokens are allocated seamlessly from the same sequential daily queue.'
    ],
    keyPoints: [
      'Same-day online booking closes at 09:00 AM IST',
      'OPD consultations begin at 09:30 AM daily',
      'Walk-in reception registration continues throughout morning clinic hours'
    ],
    badgeVariant: 'mint',
  },
  {
    id: 'news-3',
    title: 'Routine Childhood Vaccination Schedule Verification Service',
    category: 'community',
    categoryLabel: 'Child Health',
    publishDate: 'September 10, 2026',
    department: 'Paediatrics & Child Health',
    readTime: '4 min read',
    summary: 'Parents can now bring past immunization cards to their pediatric OPD visits for a complimentary verification of completed and upcoming vaccine doses.',
    fullContent: [
      'Timely childhood immunization is fundamental to long-term health and protection against preventable communicable diseases.',
      'Satya Hospital’s outpatient department now offers record verification during all pediatric visits. Doctors verify records against national and standard recommended timelines, highlighting any catch-up doses needed.',
      'Immunization records are preserved in the patient’s digital portal profile for permanent reference, preventing lost vaccination cards.'
    ],
    keyPoints: [
      'Bring child birth summary and past immunization card to consultation',
      'Guidance on catch-up vaccines for missed infant and school-age doses',
      'Digitized vaccination record accessible securely via Patient Portal'
    ],
    badgeVariant: 'teal',
  },
];

export const News: React.FC = () => {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<NewsArticle | null>(null);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'clinical', label: 'Clinical advisories' },
    { id: 'operational', label: 'OPD notices' },
    { id: 'lab', label: 'Laboratory' },
    { id: 'community', label: 'Child health' },
  ];

  const q = query.trim().toLowerCase();
  const list = hospitalNewsArticles.filter(
    a =>
      (category === 'all' || a.category === category) &&
      (!q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.department.toLowerCase().includes(q))
  );
  const [featured, ...rest] = list;

  return (
    <>
      <PageHero
        crumbs={[{ label: 'News' }]}
        eyebrow="News & advisories"
        title="Hospital bulletins and health updates"
        description="Operational notices, pediatric health advisories and laboratory updates from Satya Hospital."
      />

      <Section size="md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="News categories" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map(c => {
              const on = c.id === category;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'relative h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors cursor-pointer',
                    on ? 'text-white' : 'border border-line bg-white text-ink-700 hover:border-ink-300'
                  )}
                >
                  {on && <motion.span layoutId="news-pill" className="absolute inset-0 rounded-full bg-ink-800" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <span className="relative">{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full lg:w-80">
            <label htmlFor="news-search" className="sr-only">Search news</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="news-search"
              type="search"
              placeholder="Search bulletins"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="field-control pl-10"
            />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-line bg-white">
            <EmptyState
              title="No matching bulletins"
              description="Try a different search term or category."
              actionLabel="Clear filters"
              onAction={() => {
                setQuery('');
                setCategory('all');
              }}
            />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {featured && (
              <ScrollReveal className="lg:col-span-3" distance={12}>
                <button
                  type="button"
                  onClick={() => setActive(featured)}
                  className="group flex h-full w-full flex-col justify-between rounded-3xl bg-ink-800 p-8 text-left text-white transition-shadow hover:shadow-lift sm:p-10 cursor-pointer"
                >
                  <div>
                    <p className="text-sm text-brand-300">
                      {featured.categoryLabel} · {featured.publishDate}
                    </p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug tracking-tight sm:text-[1.9rem]">{featured.title}</h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-white/70">{featured.summary}</p>
                  </div>
                  <span className="mt-10 inline-flex items-center gap-2 text-sm font-semibold">
                    Read bulletin <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    <span className="ml-auto font-normal text-white/50">{featured.readTime}</span>
                  </span>
                </button>
              </ScrollReveal>
            )}
            <div className="flex flex-col gap-4 lg:col-span-2">
              {rest.map(a => (
                <ScrollReveal key={a.id} distance={10}>
                  <button
                    type="button"
                    onClick={() => setActive(a)}
                    className="group w-full rounded-3xl border border-line bg-white p-6 text-left transition-[border-color,box-shadow] hover:border-brand-200 hover:shadow-card cursor-pointer"
                  >
                    <p className="text-[13px] text-ink-500">
                      <span className="font-medium text-leaf-700">{a.categoryLabel}</span> · {a.publishDate}
                    </p>
                    <h3 className="mt-2 font-semibold leading-snug text-ink-900 group-hover:text-brand-700">{a.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-500">{a.summary}</p>
                  </button>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Modal isOpen={Boolean(active)} onClose={() => setActive(null)} title={active?.title ?? ''} description={active ? `${active.categoryLabel} · ${active.publishDate} · ${active.department}` : ''} maxWidth="2xl">
        {active && (
          <article className="space-y-4 text-[15px] leading-relaxed text-ink-700">
            {active.fullContent.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {active.keyPoints.length > 0 && (
              <div className="rounded-2xl bg-leaf-50 p-5 ring-1 ring-leaf-200/70">
                <h3 className="text-sm font-semibold text-ink-900">Key points</h3>
                <ul className="mt-3 space-y-2.5">
                  {active.keyPoints.map(k => (
                    <li key={k} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        )}
      </Modal>

      <CtaBand />
    </>
  );
};
