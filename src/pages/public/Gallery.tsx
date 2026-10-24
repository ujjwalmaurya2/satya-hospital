import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Baby, Bed, Building, Camera, CheckCircle2, ChevronLeft, ChevronRight, Expand, Microscope, Sparkles, Stethoscope, X } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { cn } from '../../lib/cn';

export interface GalleryItem {
  id: string;
  title: string;
  category: 'chambers' | 'pathology' | 'daycare' | 'reception';
  categoryLabel: string;
  roomInfo: string;
  description: string;
  equipment: string[];
  icon: React.ReactNode;
  imageSrc?: string;
}

export const hospitalGalleryItems: GalleryItem[] = [
  {
    id: 'gal-campus',
    title: 'Satya Hospital & Pathology main campus',
    category: 'reception',
    categoryLabel: 'Hospital campus',
    roomInfo: 'Civil Lines Road, Prayagraj',
    description:
      'Exterior of Satya Hospital & Pathology: the multi-storey clinical building, ground-floor reception, step-free ramp and outpatient consultation suites.',
    equipment: ['Step-free ramp access', 'Ground-floor emergency intake', 'Ambulance and patient drop-off'],
    icon: <Building className="h-6 w-6" />,
    imageSrc: '/images/satya-hospital-building.jpg',
  },
  {
    id: 'gal-pediatric',
    title: 'Pediatric consultation chamber',
    category: 'chambers',
    categoryLabel: 'Pediatric wing',
    roomInfo: 'Suite 103, Ground Floor',
    description:
      'A warm, child-friendly consultation chamber where doctors examine gently and unhurriedly, with parents seated alongside.',
    equipment: ['Calibrated pediatric stethoscope', 'Child-safe examination mat', 'Gentle examination lighting'],
    icon: <Baby className="h-6 w-6" />,
    imageSrc: '/images/pediatric-hero.jpg',
  },
  {
    id: 'gal-newborn',
    title: 'Newborn & infant examination suite',
    category: 'chambers',
    categoryLabel: 'Newborn care',
    roomInfo: 'Infant Wellness Room 105',
    description:
      'A clean, climate-regulated examination area with digital baby scales, length-measuring mats and natural daylight.',
    equipment: ['Digital infant scale', 'Infant length-measuring mat', 'Sanitised disposable bed rolls'],
    icon: <Sparkles className="h-6 w-6" />,
    imageSrc: '/images/newborn-care.jpg',
  },
  {
    id: 'gal-1',
    title: 'Consultation suite — General Medicine',
    category: 'chambers',
    categoryLabel: 'OPD chambers',
    roomInfo: 'Room 101, Ground Floor',
    description: 'A private outpatient examination chamber with diagnostic wall units, an examination couch and a confidential consultation desk.',
    equipment: ['Diagnostic wall set', 'Digital sphygmomanometer', 'Queue terminal link'],
    icon: <Stethoscope className="h-6 w-6" />,
  },
  {
    id: 'gal-2',
    title: 'Clinical pathology analyser suite',
    category: 'pathology',
    categoryLabel: 'Pathology lab',
    roomInfo: 'Lab Wing, Ground Floor',
    description: 'Calibrated automated biochemistry and haematology analysers with daily multi-level quality control runs.',
    equipment: ['Auto-biochemistry analyser', '3-part haematology cell counter', 'Cold-chain refrigerator'],
    icon: <Microscope className="h-6 w-6" />,
  },
  {
    id: 'gal-3',
    title: 'Day care observation & recovery bay',
    category: 'daycare',
    categoryLabel: 'Day care & OT',
    roomInfo: 'East Wing, Observation Ward',
    description: 'Observation beds for short-stay IV therapy, post-procedure monitoring and dehydration management.',
    equipment: ['Adjustable recovery beds', 'Multi-parameter vital monitors', 'Central oxygen points'],
    icon: <Bed className="h-6 w-6" />,
  },
  {
    id: 'gal-4',
    title: 'Minor procedure & OT room',
    category: 'daycare',
    categoryLabel: 'Day care & OT',
    roomInfo: 'Clinical Wing, Procedure Suite',
    description: 'An aseptic environment for minor surgical procedures, wound suturing, abscess drainage and dressings.',
    equipment: ['Shadowless surgical LED lamp', 'Autoclave instrument station', 'Resuscitation tray'],
    icon: <Building className="h-6 w-6" />,
  },
  {
    id: 'gal-5',
    title: 'Central reception & token desk',
    category: 'reception',
    categoryLabel: 'Reception & waiting',
    roomInfo: 'Hospital Main Entrance',
    description: 'Patient reception with the sequential queue display screen and registration counter.',
    equipment: ['Unified queue terminal', 'Token printer', 'Waiting-area display'],
    icon: <Building className="h-6 w-6" />,
  },
];

const tabs = [
  { id: 'all', label: 'All areas' },
  { id: 'chambers', label: 'Consultation suites' },
  { id: 'pathology', label: 'Pathology lab' },
  { id: 'daycare', label: 'Day care & minor OT' },
  { id: 'reception', label: 'Reception & campus' },
];

export const Gallery: React.FC = () => {
  const [category, setCategory] = useState('all');
  const [index, setIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const items = category === 'all' ? hospitalGalleryItems : hospitalGalleryItems.filter(i => i.category === category);
  const active = index !== null ? items[index] : null;
  const isOpen = index !== null;

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex(i => (i === null ? 0 : (i + 1) % items.length));
      if (e.key === 'ArrowLeft') setIndex(i => (i === null ? 0 : (i - 1 + items.length) % items.length));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastTrigger.current?.focus();
    };
  }, [isOpen, items.length]);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Gallery' }]}
        eyebrow="Visual tour"
        title="Inside Satya Hospital"
        description="Consultation rooms, the infant examination suite, the laboratory and reception in Civil Lines, Prayagraj. More photographs are being added."
      />

      <Section size="md">
        <div role="tablist" aria-label="Gallery areas" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {tabs.map(t => {
            const on = t.id === category;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setCategory(t.id);
                  setIndex(null);
                }}
                className={cn(
                  'relative h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors cursor-pointer',
                  on ? 'text-white' : 'border border-line bg-white text-ink-700 hover:border-ink-300'
                )}
              >
                {on && <motion.span layoutId="gal-pill" className="absolute inset-0 rounded-full bg-ink-800" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <StaggerContainer key={category} className="mt-10 grid grid-cols-1 auto-rows-[240px] gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[260px]" staggerDelay={0.05}>
          {items.map((item, i) => {
            const feature = Boolean(item.imageSrc) && i === 0;
            return (
              <StaggerItem key={item.id} distance={10} className={cn('h-full', feature && 'sm:col-span-2 sm:row-span-2')}>
                <button
                  type="button"
                  onClick={e => {
                    lastTrigger.current = e.currentTarget;
                    setIndex(i);
                  }}
                  className="group relative block h-full w-full overflow-hidden rounded-3xl text-left ring-1 ring-ink-900/5 cursor-pointer"
                  aria-label={`View ${item.title}`}
                >
                  {item.imageSrc ? (
                    <>
                      <img
                        src={item.imageSrc}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/5 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-leaf-50">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_center,var(--color-ink-200)_1px,transparent_1px)] [background-size:18px_18px]"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-[40%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line"
                      >
                        {item.icon}
                      </span>
                      <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink-500 ring-1 ring-line">
                        <Camera className="h-3 w-3" aria-hidden="true" /> Photo coming soon
                      </span>
                    </div>
                  )}
                  <div className={cn('absolute inset-x-0 bottom-0 p-5 sm:p-6', item.imageSrc ? 'text-white' : 'text-ink-900')}>
                    <p className={cn('text-xs font-medium', item.imageSrc ? 'text-white/75' : 'text-leaf-700')}>{item.categoryLabel}</p>
                    <p className={cn('mt-1 font-semibold tracking-tight', feature ? 'text-2xl' : 'text-[17px]')}>{item.title}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-800 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Expand className="h-4 w-4" />
                  </span>
                </button>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </Section>

      {createPortal(
        <AnimatePresence>
          {active && index !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/80 backdrop-blur-sm sm:items-center sm:p-6"
              onClick={() => setIndex(null)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={active.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-float sm:rounded-3xl"
              >
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setIndex(null)}
                  className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-soft hover:bg-white cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                {active.imageSrc ? (
                  <img src={active.imageSrc} alt={active.title} className="aspect-[16/9] w-full bg-ink-100 object-cover" />
                ) : (
                  <div className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-50 to-leaf-50">
                    <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line" aria-hidden="true">
                      {active.icon}
                    </span>
                    <span className="text-xs font-medium text-ink-500">Photograph coming soon</span>
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <p className="text-sm font-medium text-leaf-700">
                    {active.categoryLabel} · {active.roomInfo}
                  </p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-900">{active.title}</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{active.description}</p>
                  <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {active.equipment.map(eq => (
                      <li key={eq} className="flex items-center gap-2.5 text-sm text-ink-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                        {eq}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIndex((index - 1 + items.length) % items.length)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink-700 hover:border-ink-400 cursor-pointer"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIndex((index + 1) % items.length)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink-700 hover:border-ink-400 cursor-pointer"
                        aria-label="Next"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                    <span className="text-sm tabular-nums text-ink-500">
                      {index + 1} of {items.length}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <CtaBand />
    </>
  );
};
