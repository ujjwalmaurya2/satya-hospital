import React from 'react';
import { ArrowRight, Baby, CheckCircle2, ListOrdered, ShieldCheck } from 'lucide-react';
import { LinkButton } from '../../components/common/Button';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';
import { IconTile, PageHero, Section, SectionHeading } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';

const principles = [
  {
    icon: <Baby className="h-5 w-5" />,
    tone: 'leaf' as const,
    title: 'Child and family centred',
    text: 'Gentle examinations and clear explanations. Doctors take time to listen to parents, review symptoms and explain treatment plans simply.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    tone: 'brand' as const,
    title: 'Honest, verified information',
    text: "Every laboratory report is verified by a pathologist before release, and patient records are protected in line with India's DPDP Act.",
  },
  {
    icon: <ListOrdered className="h-5 w-5" />,
    tone: 'ink' as const,
    title: 'A transparent queue',
    text: 'Online bookings and reception walk-ins share one predictable token sequence — fewer crowds and more respect for family time.',
  },
];

const standards = [
  ['Consultation chambers', 'Private examination rooms equipped for outpatient consultations.'],
  ['Calibrated analysers', 'Automated biochemistry and haematology analysers with daily internal quality control.'],
  ['Digital health records', 'Prescriptions are scanned and reports delivered as PDFs through the patient portal.'],
  ['Step-free access', 'A ramped entrance and accessible reception desk for wheelchairs and baby strollers.'],
  ['Comfortable waiting areas', 'Air-conditioned seating with token display screens so families know when their turn is near.'],
  ['Helpful reception', 'Staff to register walk-in patients and infants and answer questions about your token.'],
];

export const About: React.FC = () => (
  <>
    <PageHero
      crumbs={[{ label: 'About' }]}
      eyebrow="About Satya Hospital & Pathology"
      title="Compassionate pediatric and family care, rooted in clinical precision"
      description="Satya Hospital in Civil Lines, Prayagraj provides structured outpatient pediatric care, newborn wellness monitoring and diagnostic pathology — with a fair digital queue and secure access to health records."
      image={{ src: '/images/satya-hospital-building.jpg', alt: 'Satya Hospital building, Civil Lines, Prayagraj', position: '55% 40%' }}
      actions={
        <>
          <LinkButton to="/facilities" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Explore facilities
          </LinkButton>
          <LinkButton to="/journey" variant="outline">
            Our journey
          </LinkButton>
        </>
      }
    />

    <Section size="lg">
      <ScrollReveal distance={14}>
        <SectionHeading eyebrow="What guides us" title="Three principles behind every visit" />
      </ScrollReveal>
      <StaggerContainer className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3" staggerDelay={0.07}>
        {principles.map(p => (
          <StaggerItem key={p.title} distance={12} className="bg-white p-8">
            <IconTile tone={p.tone}>{p.icon}</IconTile>
            <h3 className="heading-3 mt-6">{p.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{p.text}</p>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>

    <Section size="lg" tone="mint">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <ScrollReveal className="lg:col-span-4" distance={14}>
          <p className="eyebrow">Our campus</p>
          <h2 className="display-2 mt-3">Clinical facilities and standards</h2>
          <p className="lead mt-4">Designed for pediatric hygiene, patient comfort and efficient diagnostic workflows.</p>
          <LinkButton to="/facilities" variant="outline" className="mt-8" rightIcon={<ArrowRight className="h-4 w-4" />}>
            See all facilities
          </LinkButton>
        </ScrollReveal>
        <StaggerContainer className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8" staggerDelay={0.05}>
          {standards.map(([title, text]) => (
            <StaggerItem key={title} distance={10} className="flex gap-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </Section>

    <CtaBand title="Questions, or ready to book?" />
  </>
);
