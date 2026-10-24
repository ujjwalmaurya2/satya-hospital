import React from 'react';
import { Activity, Baby, CalendarCheck, CheckCircle2, Clock, FileText, Heart, Info, PhoneCall, ShieldCheck, Wind } from 'lucide-react';
import { AnchorButton, LinkButton } from '../../components/common/Button';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';
import { IconTile, PageHero, Section, SectionHeading } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { useHospital } from '../../context/HospitalContext';
import { phoneHref, to12h } from '../../lib/contact';

const services = [
  { title: 'General pediatric consultation', text: 'Diagnosis and management of common childhood illness — seasonal fever, viral infections, cough and cold, and tummy complaints.', icon: <Baby className="h-5 w-5" />, tag: 'Daily OPD' },
  { title: 'Growth & development', text: 'Systematic tracking of height, weight and BMI percentiles and developmental milestones.', icon: <Activity className="h-5 w-5" />, tag: 'Preventive' },
  { title: 'Vaccination guidance', text: 'National and standard immunisation schedules, record keeping and safe administration.', icon: <ShieldCheck className="h-5 w-5" />, tag: 'Immunisation' },
  { title: 'Nutrition & diet', text: 'Practical advice for toddlers and growing children — fussy eating, deficiencies and healthy habits.', icon: <Heart className="h-5 w-5" />, tag: 'Counselling' },
  { title: 'Respiratory & allergy care', text: 'Gentle outpatient management of wheezing, childhood asthma and allergic rhinitis.', icon: <Wind className="h-5 w-5" />, tag: 'Clinical OPD' },
  { title: 'Laboratory coordination', text: 'Blood counts and urine analysis in our own laboratory, with reports verified by the pathologist.', icon: <FileText className="h-5 w-5" />, tag: 'In-house lab' },
];

const prep = [
  ['Carry previous records', 'Past prescriptions, the vaccination card and any recent lab reports.'],
  ['Note the symptoms', 'When the fever began, medicines and doses already given, and changes in diet.'],
  ['Bring a comfort toy', 'A favourite blanket or toy helps young children feel secure in the examination room.'],
  ['Know the queue', 'Online tokens and walk-ins are called in one sequence, so arriving early does not skip the order.'],
];

export const PediatricCare: React.FC = () => {
  const { settings } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Services', to: '/services' }, { label: 'Pediatric care' }]}
        eyebrow="Pediatric & adolescent care"
        title="Child-centred care, with empathy and medical rigour"
        description="Outpatient pediatric care where your child’s comfort comes first. Our doctors take time to listen, examine gently and give clear guidance."
        image={{ src: '/images/pediatric-hero.jpg', alt: 'A pediatrician examining a smiling child seated beside his mother', position: '62% center' }}
        actions={
          <>
            <LinkButton to="/book-appointment" leftIcon={<CalendarCheck className="h-4 w-4" />}>
              Book a consultation
            </LinkButton>
            <AnchorButton href={phoneHref(settings.phone)} variant="outline" leftIcon={<PhoneCall className="h-4 w-4 text-brand-600" />}>
              Call reception
            </AnchorButton>
          </>
        }
      >
        <p className="mt-8 inline-flex items-center gap-2 text-sm text-ink-600">
          <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
          OPD from <strong className="font-semibold text-ink-900">{to12h(settings.opdStartTime)}</strong> · same-day online booking closes{' '}
          <strong className="font-semibold text-ink-900">{to12h(settings.onlineCutoffTime)}</strong>
        </p>
      </PageHero>

      <Section size="lg">
        <ScrollReveal distance={14}>
          <SectionHeading eyebrow="What we offer" title="Pediatric services" description="Available during scheduled outpatient hours." />
        </ScrollReveal>
        <StaggerContainer className="mt-12 grid grid-cols-1 gap-x-12 gap-y-2 md:grid-cols-2" staggerDelay={0.05}>
          {services.map((s, i) => (
            <StaggerItem key={s.title} distance={10}>
              <div className="flex gap-5 border-t border-line py-7">
                <IconTile tone={i % 2 ? 'leaf' : 'brand'}>{s.icon}</IconTile>
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="heading-3">{s.title}</h3>
                    <span className="text-xs font-medium text-ink-400">{s.tag}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{s.text}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      <Section size="lg" tone="tint">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <ScrollReveal className="lg:col-span-7" distance={14}>
            <p className="eyebrow">For parents</p>
            <h2 className="display-2 mt-3">Preparing for your child’s consultation</h2>
            <p className="lead mt-4">A doctor’s visit can feel daunting for children and parents. These steps help keep it calm and useful.</p>
            <ul className="mt-9 space-y-6">
              {prep.map(([t, d]) => (
                <li key={t} className="flex gap-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink-900">{t}</p>
                    <p className="mt-0.5 text-[15px] text-ink-600">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollReveal>
          <ScrollReveal className="lg:col-span-5" distance={14} delay={0.06}>
            <aside className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-line">
              <IconTile tone="leaf">
                <Info className="h-5 w-5" />
              </IconTile>
              <h3 className="heading-3 mt-5">A note on availability</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                Satya Hospital provides outpatient consultations and coordinated diagnostic tests. Doctor availability follows the hospital’s
                clinical roster.
              </p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <LinkButton to="/doctors" variant="outline" className="flex-1">
                  Doctor profiles
                </LinkButton>
                <LinkButton to="/book-appointment" className="flex-1">
                  Book a token
                </LinkButton>
              </div>
            </aside>
          </ScrollReveal>
        </div>
      </Section>

      <CtaBand />
    </>
  );
};
