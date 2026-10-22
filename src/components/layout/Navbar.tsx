import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Heart, 
  PhoneCall, 
  Clock, 
  User, 
  ShieldAlert, 
  ChevronRight,
  Building2,
  Stethoscope,
  Activity,
  Milestone,
  Building,
  Images,
  MessageSquareQuote,
  Microscope,
  Calendar,
  FileText,
  Lock,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export interface PrimaryNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, role, user } = useAuth();
  const { settings } = useHospital();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  /**
   * EXACT 10 Primary Navigation Items in Strict Order:
   * 1. Home
   * 2. About
   * 3. Doctor
   * 4. Services
   * 5. Journey
   * 6. Facilities
   * 7. Gallery
   * 8. Testimonials
   * 9. Contact
   * 10. Pathology
   */
  const primaryNavItems: PrimaryNavItem[] = [
    { label: 'Home', path: '/', icon: <Heart className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'About', path: '/about', icon: <Building2 className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Doctor', path: '/doctors', icon: <Stethoscope className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Services', path: '/services', icon: <Activity className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Journey', path: '/journey', icon: <Milestone className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Facilities', path: '/facilities', icon: <Building className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Gallery', path: '/gallery', icon: <Images className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Testimonials', path: '/testimonials', icon: <MessageSquareQuote className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Contact', path: '/contact', icon: <PhoneCall className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Pathology', path: '/pathology-lab', icon: <Microscope className="w-4 h-4 text-[#91BB40]" /> },
  ];

  /**
   * Secondary utility items accessible via hamburger menu on mobile
   */
  const secondaryUtilityItems = [
    { label: 'Pediatric Care Wing', path: '/pediatric-care', icon: <Heart className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Newborn & Infant Clinic', path: '/newborn-care', icon: <Heart className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Patient Dashboard', path: '/patient/dashboard', icon: <User className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'My Appointments & Tokens', path: '/patient/appointments', icon: <Calendar className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Pathology Lab Reports', path: '/patient/reports', icon: <FileText className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Prescriptions & Records', path: '/patient/prescriptions', icon: <FileText className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Hospital News & Advisories', path: '/news', icon: <Building2 className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Privacy & DPDP Policy', path: '/privacy-policy', icon: <Lock className="w-4 h-4 text-[#647785]" /> },
    { label: 'Terms & Conditions', path: '/terms-and-conditions', icon: <Lock className="w-4 h-4 text-[#647785]" /> },
  ];

  const isCurrentActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/pathology-lab') {
      return location.pathname === '/pathology-lab' || location.pathname === '/pathology';
    }
    if (path === '/doctors') {
      return location.pathname === '/doctors' || location.pathname === '/doctor';
    }
    return location.pathname.startsWith(path);
  };

  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';

  return (
    <header className="sticky top-0 z-40 bg-white transition-all duration-200">
      
      {/* Top Clinical & Timings Ribbon */}
      <div className="bg-[#193247] text-white text-[11px] py-1.5 px-4 hidden lg:block border-b border-white/10 tracking-wide">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#EBF6FC] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#3DA9DF]" />
              Pediatric &amp; General OPD: {settings.opdStartTime} AM &bull; Same-Day Online Cutoff: {settings.onlineCutoffTime} AM
            </span>
            <span className="text-white/20">|</span>
            <span className="text-white/70">
              Civil Lines, Prayagraj &bull; Child-Friendly Campus
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href={`tel:${phoneRaw}`} 
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#91BB40]" />
              <span>Reception: <strong>{phoneRaw}</strong></span>
            </a>
            <span className="text-white/20">|</span>
            <Link 
              to="/staff/login" 
              className="text-white/70 hover:text-[#3DA9DF] transition-colors flex items-center gap-1 text-[11px]"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>Staff Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Primary Navigation Bar */}
      <div 
        className={`w-full bg-white transition-all duration-200 border-b border-[#E5ECEF] ${
          scrolled ? 'shadow-xs py-2 sm:py-2.5' : 'py-2.5 sm:py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-2 lg:gap-4">
            
            {/* 1. Left Logo: Satya Hospital & Pathology */}
            <Link 
              to="/" 
              className="flex items-center gap-2.5 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#3DA9DF] rounded-xl shrink-0"
              aria-label="Satya Hospital Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#3DA9DF] to-[#2B92C4] flex items-center justify-center text-white shadow-xs shadow-[#3DA9DF]/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Heart className="w-5 h-5 stroke-[2.3] text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-sm sm:text-base lg:text-[17px] font-extrabold tracking-tight text-[#193247] leading-tight group-hover:text-[#3DA9DF] transition-colors whitespace-nowrap">
                    Satya Hospital
                  </span>
                  <span className="text-[9px] font-bold text-[#486812] px-1.5 py-0.2 rounded-full bg-[#F3F8EC] border border-[#D5E8BA] hidden xl:inline-block">
                    &amp; Pathology
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#647785] tracking-tight flex items-center gap-1 leading-tight">
                  <span className="hidden sm:inline">Pediatric &amp; Family Care</span>
                  <span className="w-1 h-1 rounded-full bg-[#CBD7DD] hidden sm:inline-block"></span>
                  <span className="text-[#3DA9DF] font-semibold">Prayagraj</span>
                </span>
              </div>
            </Link>

            {/* 2. Desktop Navigation: ALL 10 Items Visible in Strict Order */}
            <nav 
              className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 2xl:gap-2 overflow-x-auto scrollbar-none py-1"
              aria-label="Primary Navigation"
            >
              {primaryNavItems.map((item) => {
                const active = isCurrentActive(item.path);
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`relative px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] font-semibold tracking-normal whitespace-nowrap transition-colors ${
                      active
                        ? 'text-[#3DA9DF] bg-[#EBF6FC] font-bold'
                        : 'text-[#193247] hover:text-[#3DA9DF] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <motion.span 
                        layoutId="activeNavIndicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#3DA9DF] rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* 3. Right Utility Section: Patient Portal & Mobile Menu Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Portal Access Button */}
              {isAuthenticated && role === 'patient' ? (
                <Link to="/patient/dashboard" className="hidden sm:block">
                  <Button variant="outline" size="sm" leftIcon={<User className="w-3.5 h-3.5 text-[#3DA9DF]" />} className="text-xs">
                    Portal: {user?.fullName?.split(' ')[0] || 'Patient'}
                  </Button>
                </Link>
              ) : isAuthenticated && role !== 'patient' ? (
                <Link to={`/${role}`} className="hidden sm:block">
                  <Button variant="outline" size="sm" leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-[#3DA9DF]" />} className="text-xs">
                    {role.toUpperCase()}
                  </Button>
                </Link>
              ) : (
                <Link to="/patient/login" className="hidden sm:block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    leftIcon={<User className="w-3.5 h-3.5 text-[#3DA9DF]" />} 
                    className="text-xs font-semibold text-[#193247] hover:text-[#3DA9DF] hover:border-[#3DA9DF]"
                  >
                    Patient Login
                  </Button>
                </Link>
              )}

              {/* Call desk shortcut on tablets/mobile */}
              <a 
                href={`tel:${phoneRaw}`}
                className="p-2 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] hover:bg-[#D4EDF9] transition-colors lg:hidden"
                aria-label={`Call Hospital at ${phoneRaw}`}
              >
                <PhoneCall className="w-4 h-4" />
              </a>

              {/* Mobile / Tablet Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#193247] hover:bg-[#EBF6FC] hover:text-[#3DA9DF] rounded-lg transition-colors cursor-pointer lg:hidden focus:outline-hidden focus:ring-2 focus:ring-[#3DA9DF]"
                aria-label="Toggle navigation drawer"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile & Tablet Full Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="lg:hidden border-b border-[#CBD7DD] bg-white px-4 pt-3 pb-8 space-y-4 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            {/* Quick Operational Status Banner */}
            <div className="py-2.5 px-3 bg-[#EBF6FC] border border-[#BCE1F5] rounded-xl text-xs text-[#193247] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-[#1E78A4]">
                <Clock className="w-3.5 h-3.5 text-[#3DA9DF]" />
                OPD: {settings.opdStartTime} AM Daily
              </span>
              <span className="text-[11px] font-medium text-[#647785]">Cutoff: {settings.onlineCutoffTime} AM</span>
            </div>

            {/* Section 1: ALL 10 PRIMARY LINKS IN EXACT ORDER */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#647785] px-2 py-1">
                Hospital Sections (10)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {primaryNavItems.map((item, idx) => {
                  const active = isCurrentActive(item.path);
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#EBF6FC] text-[#3DA9DF] font-bold border border-[#BCE1F5]'
                          : 'text-[#193247] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold text-[#647785] w-4 text-center">
                          {idx + 1}.
                        </span>
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#CBD7DD]" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Patient Portal & Utility Options */}
            <div className="pt-2 border-t border-[#E5ECEF] space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#647785] px-2 py-1">
                Patient Account &amp; Records
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {secondaryUtilityItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#F3F8EC] text-[#486812] font-semibold'
                          : 'text-[#647785] hover:text-[#193247] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#CBD7DD]" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Bottom Action Buttons */}
            <div className="pt-2 border-t border-[#E5ECEF] space-y-2">
              <Link 
                to="/book-appointment" 
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button 
                  variant="primary" 
                  size="md" 
                  className="w-full font-bold justify-center shadow-xs" 
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Book OPD Appointment Slot
                </Button>
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${phoneRaw}`} className="block w-full">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-center text-xs" 
                    leftIcon={<PhoneCall className="w-3.5 h-3.5 text-[#3DA9DF]" />}
                  >
                    Call Reception
                  </Button>
                </a>

                {isAuthenticated ? (
                  <Link 
                    to="/patient/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-center text-xs" 
                      leftIcon={<User className="w-3.5 h-3.5 text-[#3DA9DF]" />}
                    >
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link 
                    to="/patient/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-center text-xs" 
                      leftIcon={<User className="w-3.5 h-3.5 text-[#3DA9DF]" />}
                    >
                      Patient Login
                    </Button>
                  </Link>
                )}
              </div>

              <div className="pt-1 text-center">
                <Link 
                  to="/staff/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[11px] text-[#647785] hover:text-[#3DA9DF] underline"
                >
                  Authorized Staff &amp; Doctors Portal &rarr;
                </Link>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </header>
  );
};
