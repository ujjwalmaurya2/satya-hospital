import React from 'react';
import { CalendarCheck, Clock, DoorOpen, Info } from 'lucide-react';
import { LinkButton } from '../../components/common/Button';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { PageHero, Section } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { useHospital } from '../../context/HospitalContext';
import { cn } from '../../lib/cn';

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('');
}

export const Doctors: React.FC = () => {
  const { doctors } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Doctors' }]}
        eyebrow="Consulting doctors"
        title="Physicians and consultant specialists"
        description="Outpatient medicine, pediatric care, surgery and women’s health in Prayagraj. Each profile shows qualifications, consultation room, OPD hours and weekly days."
      />

      <Section size="md">
        <div className="mb-10 flex items-start gap-3 rounded-2xl border border-line bg-white px-5 py-4 text-sm text-ink-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <p>Consultation days and hours can change for leave or emergencies. Please confirm with reception before travelling.</p>
        </div>

        <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" staggerDelay={0.07}>
          {doctors.map(doc => (
            <StaggerItem key={doc.id} distance={12} className="h-full">
              <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
                <div className="relative bg-gradient-to-br from-brand-50 via-white to-leaf-50 px-6 pt-6 pb-5">
                  <div className="flex items-center gap-4">
                    <span
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-brand-800 shadow-card ring-1 ring-line"
                      aria-hidden="true"
                    >
                      {initials(doc.fullName)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold tracking-tight text-ink-900">{doc.fullName}</h2>
                      <p className="text-sm font-medium text-brand-700">{doc.designation}</p>
                      <p className="mt-0.5 text-[13px] text-ink-500">{doc.department}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-6 py-5">
                  <p className="text-sm leading-relaxed text-ink-700">{doc.qualifications}</p>

                  <dl className="mt-5 space-y-2.5 text-sm">
                    <div className="flex items-center gap-2.5 text-ink-700">
                      <DoorOpen className="h-4 w-4 text-ink-400" aria-hidden="true" />
                      <dt className="sr-only">Consultation room</dt>
                      <dd>{doc.consultationRoom}</dd>
                    </div>
                    <div className="flex items-center gap-2.5 text-ink-700">
                      <Clock className="h-4 w-4 text-ink-400" aria-hidden="true" />
                      <dt className="sr-only">OPD hours</dt>
                      <dd>{doc.opdTimings}</dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <p className="text-xs font-medium text-ink-500">Consultation days</p>
                    <ul className="mt-2 flex gap-1.5" aria-label={`Available ${doc.availableDays.join(', ')}`}>
                      {WEEK.map(day => {
                        const on = doc.availableDays.includes(day);
                        return (
                          <li
                            key={day}
                            aria-hidden="true"
                            className={cn(
                              'flex h-8 w-9 items-center justify-center rounded-lg text-[11.5px] font-semibold',
                              on ? 'bg-leaf-100 text-leaf-800 ring-1 ring-inset ring-leaf-200' : 'bg-ink-50 text-ink-300'
                            )}
                          >
                            {day.slice(0, 2)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-auto pt-6">
                    <LinkButton to={`/book-appointment?doctor=${doc.id}`} className="w-full" leftIcon={<CalendarCheck className="h-4 w-4" />}>
                      Book a consultation
                    </LinkButton>
                  </div>
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
