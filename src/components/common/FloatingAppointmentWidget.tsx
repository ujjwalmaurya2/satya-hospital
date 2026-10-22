import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const FloatingAppointmentWidget: React.FC = () => {
  const location = useLocation();

  // Hide the floating widget on the actual booking page or full-screen staff/auth dashboards if preferred
  const isBookingPage = location.pathname === '/book-appointment';
  const isStaffDashboard = location.pathname.startsWith('/admin') || 
                           location.pathname.startsWith('/reception') || 
                           location.pathname.startsWith('/doctor') || 
                           location.pathname.startsWith('/pathology-dashboard');

  if (isBookingPage || isStaffDashboard) {
    return null;
  }

  return (
    <aside 
      aria-label="Quick OPD Appointment Booking"
      className="fixed right-4 bottom-5 sm:right-6 sm:bottom-7 z-40 select-none print:hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Link
        to="/book-appointment"
        className="group block relative focus:outline-hidden focus-visible:ring-3 focus-visible:ring-[#3DA9DF] focus-visible:ring-offset-2 rounded-full"
        title="Book OPD Consultation Token at Satya Hospital"
      >
        {/* Holographic Glowing Ambient Aura */}
        <div 
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#3DA9DF] via-[#91BB40] to-[#3DA9DF] opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300 animate-pulse"
        />

        {/* Outer Iridescent Gradient Border Container */}
        <div className="relative p-[1.5px] rounded-full bg-gradient-to-r from-[#3DA9DF] via-[#91BB40] to-[#3DA9DF] shadow-[0_8px_30px_rgba(61,169,223,0.30)] group-hover:shadow-[0_12px_40px_rgba(61,169,223,0.45)] transition-all duration-300">
          
          {/* Glass Card Surface */}
          <div className="relative rounded-full bg-white/95 backdrop-blur-md px-3.5 py-2.5 sm:px-4.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 border border-white/60">
            
            {/* Shimmer Light Sweep Effect */}
            <div 
              aria-hidden="true"
              className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
            >
              <motion.div
                initial={{ x: '-150%' }}
                animate={{ x: '250%' }}
                transition={{
                  repeat: Infinity,
                  repeatDelay: 4.5,
                  duration: 1.8,
                  ease: 'easeInOut',
                }}
                className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
              />
            </div>

            {/* Calendar Icon with Live Pulse Indicator */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#3DA9DF] to-[#2B92C4] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              </div>
              {/* Green Active Queue Pulse Indicator */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#91BB40] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#91BB40] border border-white"></span>
              </span>
            </div>

            {/* Typography Content */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold text-[#193247] tracking-tight group-hover:text-[#3DA9DF] transition-colors leading-tight">
                  Book Appointment
                </span>
                <span className="text-[10px] font-bold text-[#486812] bg-[#F3F8EC] px-1.5 py-0.5 rounded-full border border-[#D5E8BA] hidden md:inline-block leading-none">
                  OPD Token
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#647785] font-medium flex items-center gap-1 leading-tight mt-0.5">
                <Clock className="w-3 h-3 text-[#3DA9DF] shrink-0" />
                <span>Sequential Queue &bull; 09:30 AM</span>
              </span>
            </div>

            {/* Subtle Right Arrow */}
            <div className="w-6 h-6 rounded-full bg-[#EBF6FC] text-[#3DA9DF] hidden sm:flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform duration-200">
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.4]" />
            </div>

          </div>
        </div>
      </Link>
    </aside>
  );
};
