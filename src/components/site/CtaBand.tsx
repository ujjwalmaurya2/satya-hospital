import React from 'react';
import { CalendarCheck, PhoneCall } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { AnchorButton, LinkButton } from '../common/Button';

interface CtaBandProps {
  title?: string;
  description?: string;
}

/** Closing appointment call-to-action used at the end of public pages. */
export const CtaBand: React.FC<CtaBandProps> = ({
  title = 'Book your OPD token for tomorrow',
  description,
}) => {
  const { settings } = useHospital();
  const text =
    description ??
    `Online booking opens one day ahead and closes at ${to12h(settings.onlineCutoffTime)} on the day of your visit. Walk-in tokens are issued at reception once OPD begins at ${to12h(settings.opdStartTime)}.`;

  return (
    <section className="container-page py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[32px] bg-ink-800 px-6 py-12 sm:px-12 sm:py-14">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-leaf-500/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 opacity-[0.07] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="display-2 text-white">{title}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">{text}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <LinkButton
              to="/book-appointment"
              size="lg"
              className="bg-white text-ink-900 hover:bg-brand-50"
              leftIcon={<CalendarCheck className="w-[18px] h-[18px] text-brand-600" />}
            >
              Book appointment
            </LinkButton>
            <AnchorButton
              href={phoneHref(settings.phone)}
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/40"
              leftIcon={<PhoneCall className="w-[18px] h-[18px]" />}
            >
              {phoneDisplay(settings.phone)}
            </AnchorButton>
          </div>
        </div>
      </div>
    </section>
  );
};
