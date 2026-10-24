import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, ArrowUpRight, Baby, Bone, CalendarCheck, HeartPulse, Microscope, Sparkles, Stethoscope } from 'lucide-react';
import { LinkButton } from '../../components/common/Button';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { IconTile, PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { useHospital } from '../../context/HospitalContext';
import { cleanSettingText, isPlaceholder } from '../../lib/contact';
import { cn } from '../../lib/cn';

const deptIcon: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="h-5 w-5" />,
  Activity: <Activity className="h-5 w-5" />,
  HeartPulse: <HeartPulse className="h-5 w-5" />,
  Bone: <Bone className="h-5 w-5" />,
  Baby: <Baby className="h-5 w-5" />,
  Microscope: <Microscope className="h-5 w-5" />,
};

export const Services: React.FC = () => {
  const { departments } = useHospital();
  const [selected, setSelected] = useState('all');
  const visible = selected === 'all' ? departments : departments.filter(d => d.id === selected);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Services' }]}
        eyebrow="Departments & services"
        title="Outpatient services under one roof"
        description="Consultant-led outpatient departments for children and adults, with an in-house pathology laboratory."
      >
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { to: '/pediatric-care', title: 'Pediatric care', text: 'Checkups, childhood illness and growth tracking', icon: <Baby className="h-5 w-5" />, tone: 'leaf' as const },
            { to: '/newborn-care', title: 'Newborn & infant care', text: 'Postnatal assessments and baby wellness', icon: <Sparkles className="h-5 w-5" />, tone: 'brand' as const },
          ].map(c => (
            <Link
              key={c.to}
              to={c.to}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-white/80 p-4 backdrop-blur transition-[border-color,box-shadow] hover:border-brand-200 hover:shadow-card"
            >
              <IconTile tone={c.tone}>{c.icon}</IconTile>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{c.title}</p>
                <p className="text-[13px] text-ink-500">{c.text}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-300 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </PageHero>

      <Section size="md">
        <div role="tablist" aria-label="Filter departments" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: 'all', name: 'All departments' }, ...departments].map(d => {
            const active = selected === d.id;
            return (
              <button
                key={d.id}
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(d.id)}
                className={cn(
                  'relative h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors cursor-pointer',
                  active ? 'text-white' : 'border border-line bg-white text-ink-700 hover:border-ink-300'
                )}
              >
                {active && (
                  <motion.span layoutId="dept-pill" className="absolute inset-0 rounded-full bg-ink-800" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                )}
                <span className="relative">{d.name}</span>
              </button>
            );
          })}
        </div>

        <StaggerContainer key={selected} className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2" staggerDelay={0.05}>
          {visible.map(dept => {
            const head = cleanSettingText(dept.headOfDepartment);
            return (
              <StaggerItem key={dept.id} distance={10} className="h-full">
                <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-soft">
                  <div className="flex items-start gap-4">
                    <IconTile tone={dept.slug.includes('path') || dept.slug.includes('paed') ? 'leaf' : 'brand'}>
                      {deptIcon[dept.iconName] ?? <Stethoscope className="h-5 w-5" />}
                    </IconTile>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-ink-900">{dept.name}</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{dept.description}</p>
                    </div>
                  </div>
                  {head && (
                    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-5 text-sm">
                      <span className="text-ink-500">Head of department</span>
                      <span className="font-medium text-ink-900">{head}</span>
                      {isPlaceholder(dept.headOfDepartment) && (
                        <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-500">To be confirmed</span>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                    <LinkButton to="/book-appointment" variant="soft" size="sm" leftIcon={<CalendarCheck className="h-4 w-4" />}>
                      Book appointment
                    </LinkButton>
                    {dept.slug.includes('path') && (
                      <Link to="/pathology-lab" className="link inline-flex items-center gap-1 text-sm">
                        View tests <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                    {dept.slug.includes('paed') && (
                      <Link to="/pediatric-care" className="link inline-flex items-center gap-1 text-sm">
                        Pediatric care <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </Section>

      <CtaBand />
    </>
  );
};
