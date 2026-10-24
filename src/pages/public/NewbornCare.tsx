import React from 'react';
import { AlertTriangle, Baby, CalendarCheck, CheckCircle2, Heart, PhoneCall, Scale, ShieldCheck, Sparkles, Thermometer } from 'lucide-react';
import { AnchorButton, LinkButton } from '../../components/common/Button';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';
import { IconTile, PageHero, Section, SectionHeading } from '../../components/site/Section';
import { CtaBand } from '../../components/site/CtaBand';
import { useHospital } from '../../context/HospitalContext';
import { phoneDisplay, phoneHref } from '../../lib/contact';

const services = [
  { title: 'Newborn physical assessment', text: 'Examination of reflexes, muscle tone, heart sounds, breathing rhythm and the abdomen by our consultant.', icon: <Baby className="h-5 w-5" /> },
  { title: 'Weight gain & growth', text: 'Careful weighing and length tracking to follow postnatal weight, growth velocity and feeding adequacy.', icon: <Scale className="h-5 w-5" /> },
  { title: 'Jaundice assessment', text: 'Clinical review of skin and eye colour, with same-day serum bilirubin testing in our laboratory if needed.', icon: <Thermometer className="h-5 w-5" /> },
  { title: 'Feeding & lactation guidance', text: 'Support with latching, feeding frequency, burping and common feeding difficulties.', icon: <Heart className="h-5 w-5" /> },
  { title: 'Cord & skin care', text: 'Cord stump checks, safe cleansing routines and gentle care for nappy rash and cradle cap.', icon: <Sparkles className="h-5 w-5" /> },
  { title: 'Primary immunisation', text: 'Tracking against the national schedule (BCG, Hepatitis B, OPV, Pentavalent, Rotavirus, PCV) with records kept for you.', icon: <ShieldCheck className="h-5 w-5" /> },
];

const room = ['Sanitised infant examination mats', 'Calibrated digital baby scales', 'Parents stay beside their baby', 'Same-day laboratory reports available'];

export const NewbornCare: React.FC = () => {
  const { settings } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Services', to: '/services' }, { label: 'Newborn care' }]}
        eyebrow="Newborn & infant clinic"
        title="Gentle care for your newborn. Peace of mind for you."
        description="The first months need a gentle touch, careful observation and reassurance for parents. Our consultations are tailored for babies up to 12 months."
        image={{ src: '/images/newborn-care.jpg', alt: 'A doctor gently examining a newborn while the mother watches', position: '62% center' }}
        actions={
          <>
            <LinkButton to="/book-appointment" leftIcon={<CalendarCheck className="h-4 w-4" />}>
              Book a newborn visit
            </LinkButton>
            <AnchorButton href={phoneHref(settings.phone)} variant="outline" leftIcon={<PhoneCall className="h-4 w-4 text-brand-600" />}>
              Call reception
            </AnchorButton>
          </>
        }
      />

      <Section size="lg">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <ScrollReveal className="lg:col-span-5" distance={14}>
            <p className="eyebrow">The examination room</p>
            <h2 className="display-2 mt-3">Hygienic, calm and reassuring</h2>
            <p className="lead mt-4">
              Examination spaces are sanitised, temperature-regulated and equipped with calibrated infant scales — so assessments stay low-stress.
            </p>
            <ul className="mt-8 space-y-3.5">
              {room.map(r => (
                <li key={r} className="flex items-center gap-3 text-[15px] text-ink-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
                  {r}
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7" staggerDelay={0.05}>
            {services.map((s, i) => (
              <StaggerItem key={s.title} distance={10} className="h-full">
                <div className="h-full rounded-3xl border border-line bg-white p-6">
                  <IconTile tone={i % 2 ? 'leaf' : 'brand'}>{s.icon}</IconTile>
                  <h3 className="heading-3 mt-5 text-base">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      <section className="container-page">
        <ScrollReveal distance={12}>
          <div role="note" className="flex flex-col gap-5 rounded-3xl border border-danger-200 bg-danger-50 p-7 sm:flex-row sm:p-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-danger-600 ring-1 ring-danger-200" aria-hidden="true">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-danger-700">When to seek care immediately</h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
                If your newborn has a temperature above 100.4°F (38°C), refuses several feeds in a row, is unusually drowsy, has a sunken soft
                spot, or is breathing fast with grunting, do not wait for an online slot. Go to the emergency desk or the nearest neonatal centre
                straight away.
              </p>
              <a href={phoneHref(settings.emergencyPhone)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-danger-700 hover:underline">
                <PhoneCall className="h-4 w-4" aria-hidden="true" /> Emergency {phoneDisplay(settings.emergencyPhone)}
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <CtaBand />
    </>
  );
};
