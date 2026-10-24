import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Barcode, Cpu, FileLock2, FileText, FlaskConical, PhoneCall, Search, UserCheck } from 'lucide-react';
import { AnchorButton, LinkButton } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';
import { PageHero, Section, SectionHeading } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';
import { phoneDisplay, phoneHref } from '../../lib/contact';
import { cn } from '../../lib/cn';

const steps = [
  { icon: <Barcode className="h-5 w-5" />, title: 'Labelled collection', text: 'Each sample gets a unique accession number at collection to prevent mix-ups.' },
  { icon: <Cpu className="h-5 w-5" />, title: 'Automated analysis', text: 'Processed on calibrated analysers with daily internal quality control.' },
  { icon: <UserCheck className="h-5 w-5" />, title: 'Pathologist sign-off', text: 'A qualified pathologist reviews the results before the report is authorised.' },
  { icon: <FileLock2 className="h-5 w-5" />, title: 'Secure PDF access', text: 'Reports open in your patient portal through private, time-limited links.' },
];

export const Pathology: React.FC = () => {
  const { pathologyTests, settings } = useHospital();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => ['All', ...Array.from(new Set(pathologyTests.map(t => t.category)))], [pathologyTests]);

  const tests = pathologyTests.filter(t => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q);
    return matchesQuery && (category === 'All' || t.category === category);
  });

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Pathology lab' }]}
        eyebrow="In-house diagnostic laboratory"
        title="Clinical pathology you can rely on"
        description="Haematology, biochemistry and clinical pathology processed on-site. Every report is validated before it is published to your patient account."
        actions={
          <>
            <LinkButton to="/patient/reports" leftIcon={<FileText className="h-4 w-4" />}>
              Access my reports
            </LinkButton>
            <AnchorButton href={phoneHref(settings.phone)} variant="outline" leftIcon={<PhoneCall className="h-4 w-4 text-brand-600" />}>
              Call the lab desk
            </AnchorButton>
          </>
        }
        aside={
          <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-50 text-leaf-700 ring-1 ring-inset ring-leaf-200" aria-hidden="true">
                <FlaskConical className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink-900">Sample collection</p>
                <p className="text-sm text-ink-500">Daily, 08:00 AM – 02:00 PM</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
              <div>
                <dt className="text-ink-500">Tests listed</dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink-900">{pathologyTests.length}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Reports</dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink-900">Pathologist verified</dd>
              </div>
            </dl>
          </div>
        }
      />

      <Section size="lg">
        <ScrollReveal distance={14}>
          <SectionHeading eyebrow="Quality safeguards" title="From collection to your report" align="center" />
        </ScrollReveal>
        <StaggerContainer className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8" staggerDelay={0.07}>
          {steps.map((s, i) => (
            <StaggerItem key={s.title} distance={12} className="relative">
              {i < steps.length - 1 && (
                <div aria-hidden="true" className="absolute left-14 right-0 top-6 hidden h-px bg-gradient-to-r from-line-strong to-transparent lg:block" />
              )}
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line" aria-hidden="true">
                {s.icon}
              </span>
              <p className="mt-5 text-xs font-semibold text-leaf-700">Step {i + 1}</p>
              <h3 className="heading-3 mt-1">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.text}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      <Section size="md" tone="tint" id="tests">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Test catalogue</p>
            <h2 className="display-2 mt-3">Tests and in-house rates</h2>
            <p className="lead mt-3">Specimen, fasting needs and expected turnaround for each test.</p>
          </div>
          <div className="relative w-full md:w-80">
            <label htmlFor="test-search" className="sr-only">Search tests</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="test-search"
              type="search"
              placeholder="Search by name or code, e.g. CBC"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="field-control pl-10"
            />
          </div>
        </div>

        <div role="tablist" aria-label="Test categories" className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map(c => {
            const active = c === category;
            return (
              <button
                key={c}
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c)}
                className={cn(
                  'relative h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors cursor-pointer',
                  active ? 'text-white' : 'border border-line bg-white text-ink-700 hover:border-ink-300'
                )}
              >
                {active && <motion.span layoutId="test-cat" className="absolute inset-0 rounded-full bg-ink-800" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">{c}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          {tests.length === 0 ? (
            <EmptyState
              title="No tests match your search"
              description={`Nothing found for “${query}”. Check the spelling or choose another category.`}
              actionLabel="Clear filters"
              onAction={() => {
                setQuery('');
                setCategory('All');
              }}
            />
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-6 border-b border-line bg-ink-50/60 px-6 py-3 text-xs font-semibold text-ink-500 md:grid">
                <span>Test</span>
                <span>Specimen</span>
                <span>Fasting</span>
                <span>Turnaround</span>
                <span className="w-20 text-right">Rate</span>
              </div>
              <ul className="divide-y divide-line">
                {tests.map(t => (
                  <li key={t.id} className="grid grid-cols-1 gap-x-6 gap-y-2 px-6 py-4 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] md:items-center">
                    <div className="flex items-start justify-between gap-4 md:block">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{t.name}</p>
                        <p className="mt-0.5 text-[13px] text-ink-500">
                          <span className="font-mono text-xs">{t.testCode}</span> · {t.category}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-semibold tabular-nums text-ink-900 md:hidden">₹{t.price}</p>
                    </div>
                    <p className="text-sm text-ink-700">
                      <span className="text-ink-400 md:hidden">Specimen: </span>
                      {t.specimenType}
                    </p>
                    <p className="text-sm">
                      {t.fastingRequired ? (
                        <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-700 ring-1 ring-inset ring-warning-200">8–10 h fasting</span>
                      ) : (
                        <span className="text-ink-500">Not required</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-700">
                      <span className="text-ink-400 md:hidden">Turnaround: </span>~{t.turnaroundHours} hours
                    </p>
                    <p className="hidden w-20 text-right text-base font-semibold tabular-nums text-ink-900 md:block">₹{t.price}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="mt-5 text-sm text-ink-500">
          Questions about fasting or sample drop-off? Call the laboratory desk on{' '}
          <a href={phoneHref(settings.phone)} className="link">
            {phoneDisplay(settings.phone)}
          </a>
          .
        </p>
      </Section>

      <div className="h-16 sm:h-20" />
    </>
  );
};
