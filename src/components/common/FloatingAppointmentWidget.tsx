import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarCheck, PhoneCall } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { phoneHref, to12h } from '../../lib/contact';

const HIDDEN_ON = ['/book-appointment', '/patient/login', '/staff/login'];

/**
 * Quiet booking shortcut that appears once the visitor scrolls past the first
 * screen: a pill on tablet/desktop, a two-button action bar on phones.
 */
export const FloatingAppointmentWidget: React.FC = () => {
  const { pathname } = useLocation();
  const { settings } = useHospital();
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after the first screen; step aside once the footer (which has its own CTAs) is in view.
    const onScroll = () => {
      const footerTop = document.querySelector('footer')?.getBoundingClientRect().top ?? Infinity;
      setVisible(window.scrollY > 480 && footerTop > window.innerHeight - 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  if (HIDDEN_ON.includes(pathname) || pathname.startsWith('/booking/')) return null;

  const motionProps = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Tablet / desktop pill */}
          <motion.div {...motionProps} className="fixed bottom-6 right-6 z-40 hidden sm:block print:hidden">
            <Link
              to="/book-appointment"
              className="group flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-4 shadow-float ring-1 ring-ink-900/5 transition-shadow hover:shadow-lift"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-white">
                <CalendarCheck className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-ink-900">Book appointment</span>
                <span className="text-xs text-ink-500">OPD from {to12h(settings.opdStartTime)}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </motion.div>

          {/* Phone action bar */}
          <motion.div
            {...motionProps}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 backdrop-blur-md sm:hidden print:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-[auto_1fr] gap-2.5">
              <a
                href={phoneHref(settings.phone)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink-800"
              >
                <PhoneCall className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Call
              </a>
              <Link
                to="/book-appointment"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-700 text-sm font-semibold text-white"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Book appointment
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
