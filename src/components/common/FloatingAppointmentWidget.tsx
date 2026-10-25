import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { to12h } from '../../lib/contact';

const HIDDEN_ON = ['/book-appointment', '/patient/login', '/staff/login'];

/**
 * Quiet booking shortcut that appears once the visitor scrolls past the first
 * screen on tablet/desktop. Phones have the persistent MobileTabBar instead.
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

  if (HIDDEN_ON.includes(pathname) || pathname.startsWith('/booking/') || pathname.startsWith('/lab-tests')) return null;

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
          {/* Tablet / desktop pill (phones use MobileTabBar) */}
          <motion.div {...motionProps} className="fixed bottom-6 right-6 z-40 hidden md:block print:hidden">
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

        </>
      )}
    </AnimatePresence>
  );
};
