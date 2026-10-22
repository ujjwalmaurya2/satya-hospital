import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Calendar, 
  User, 
  ShieldAlert, 
  Clock, 
  PhoneCall, 
  ChevronDown,
  Heart,
  Baby,
  Microscope,
  Stethoscope,
  Building2,
  Building,
  Milestone,
  Images,
  MessageSquareQuote,
  Newspaper,
  Phone,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, role } = useAuth();
  const { settings } = useHospital();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  }, [location.pathname]);

  // Primary navigation items requested in Childcare UI Spec
  const primaryNavItems: NavItem[] = [
    { label: 'Home', path: '/', icon: <Heart className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'About Us', path: '/about', icon: <Building2 className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Pediatric Care', path: '/pediatric-care', icon: <Baby className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Newborn Care', path: '/newborn-care', icon: <Sparkles className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Pathology & Diagnostics', path: '/pathology-lab', icon: <Microscope className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Appointments', path: '/book-appointment', icon: <Calendar className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Contact', path: '/contact', icon: <PhoneCall className="w-4 h-4 text-[#3DA9DF]" /> },
  ];

  // Secondary hospital links preserved in "More"
  const moreNavItems: NavItem[] = [
    { label: 'Doctors Directory', path: '/doctors', icon: <Stethoscope className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'All Clinical Services', path: '/services', icon: <Heart className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Facilities & Campus', path: '/facilities', icon: <Building className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Hospital Journey', path: '/journey', icon: <Milestone className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Photo Gallery', path: '/gallery', icon: <Images className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Patient Feedback', path: '/testimonials', icon: <MessageSquareQuote className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'News & Health Updates', path: '/news', icon: <Newspaper className="w-4 h-4 text-[#3DA9DF]" /> },
  ];

  const isCurrentActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/pathology-lab') {
      return location.pathname === '/pathology-lab' || location.pathname === '/pathology';
    }
    return location.pathname.startsWith(path);
  };

  const isMoreGroupActive = moreNavItems.some(item => isCurrentActive(item.path));

  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';

  return (
    <header className="sticky top-0 z-50 bg-white transition-all duration-200">
      {/* Top Utility & Operational Hours Bar */}
      <div className="bg-[#193247] text-white text-[11px] py-1.5 px-4 hidden md:block border-b border-white/10 tracking-wide">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#EBF6FC] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#3DA9DF]" />
              Pediatric &amp; General OPD: {settings.opdStartTime} AM Onwards &bull; Same-Day Cutoff: {settings.onlineCutoffTime} AM
            </span>
            <span className="text-white/20">|</span>
            <span className="text-white/70">
              Civil Lines, Prayagraj &bull; Dedicated Child-Friendly Campus
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href={`tel:${phoneRaw}`} 
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#91BB40]" />
              <span>Hospital Desk: <strong>{phoneRaw}</strong></span>
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

      {/* Main Clean White Header */}
      <div 
        className={`w-full bg-white transition-all duration-200 border-b border-[#E5ECEF] ${
          scrolled ? 'shadow-sm py-2.5' : 'py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-3">
            
            {/* Satya Hospital Logo */}
            <Link to="/" className="flex items-center gap-3 group focus:outline-hidden shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#3DA9DF] to-[#2B92C4] flex items-center justify-center text-white shadow-xs shadow-[#3DA9DF]/20 group-hover:scale-105 transition-transform duration-200">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.3] text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#193247] leading-none group-hover:text-[#3DA9DF] transition-colors">
                    Satya Hospital
                  </span>
                  <span className="text-[10px] font-bold text-[#486812] px-1.5 py-0.5 rounded-full bg-[#F3F8EC] border border-[#D5E8BA] hidden sm:inline-block">
                    &amp; Pathology
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#647785] tracking-tight mt-0.5 flex items-center gap-1">
                  <span>Pediatric &amp; Family Care</span>
                  <span className="w-1 h-1 rounded-full bg-[#CBD7DD] inline-block"></span>
                  <span className="text-[#3DA9DF] font-semibold">Prayagraj</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1" aria-label="Main Navigation">
              {primaryNavItems.map((item) => {
                const active = isCurrentActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal whitespace-nowrap transition-all ${
                      active
                        ? 'text-[#3DA9DF] bg-[#EBF6FC]'
                        : 'text-[#193247] hover:text-[#3DA9DF] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {item.label}
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

              {/* More Pages Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    moreDropdownOpen || isMoreGroupActive
                      ? 'text-[#3DA9DF] bg-[#EBF6FC]'
                      : 'text-[#193247] hover:text-[#3DA9DF] hover:bg-[#F8FAFC]'
                  }`}
                  aria-expanded={moreDropdownOpen}
                >
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {moreDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#CBD7DD] shadow-lg py-2 z-50 divide-y divide-[#E5ECEF]"
                    >
                      <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#647785]">
                        Hospital Information
                      </div>
                      <div className="py-1">
                        {moreNavItems.map((item) => {
                          const active = isCurrentActive(item.path);
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                                active
                                  ? 'bg-[#EBF6FC] text-[#3DA9DF] font-semibold'
                                  : 'text-[#193247] hover:bg-[#F8FAFC]'
                              }`}
                            >
                              {item.icon}
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Right Action CTAs: Urgent Enquiry Call + Appointment CTA */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              {/* Call button for urgent enquiries */}
              <a 
                href={`tel:${phoneRaw}`}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CBD7DD] bg-white text-[#193247] text-xs font-semibold hover:border-[#3DA9DF] hover:text-[#3DA9DF] transition-colors shadow-2xs"
                title="Call Hospital Reception for Urgent Enquiries"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#3DA9DF]" />
                <span>Call Hospital</span>
              </a>

              {isAuthenticated && role === 'patient' ? (
                <Link to="/patient/dashboard">
                  <Button variant="outline" size="sm" leftIcon={<User className="w-3.5 h-3.5 text-[#3DA9DF]" />}>
                    Patient Portal
                  </Button>
                </Link>
              ) : isAuthenticated && role !== 'patient' ? (
                <Link to={`/${role}`}>
                  <Button variant="outline" size="sm" leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-[#3DA9DF]" />}>
                    {role.toUpperCase()}
                  </Button>
                </Link>
              ) : (
                <Link to="/patient/login" className="hidden lg:block">
                  <Button variant="ghost" size="sm" leftIcon={<User className="w-3.5 h-3.5 text-[#647785]" />} className="text-xs">
                    Patient Login
                  </Button>
                </Link>
              )}

              {/* Prominent "Book an Appointment" CTA */}
              <Link to="/book-appointment">
                <Button 
                  variant="primary" 
                  size="sm" 
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  className="font-bold text-xs shadow-xs hover:shadow-md"
                >
                  Book an Appointment
                </Button>
              </Link>
            </div>

            {/* Mobile Header Icons: Call + Book + Hamburger */}
            <div className="flex items-center gap-1.5 xl:hidden">
              <a 
                href={`tel:${phoneRaw}`}
                className="p-2 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] hover:bg-[#D4EDF9] transition-colors"
                aria-label="Call Hospital"
              >
                <PhoneCall className="w-4 h-4" />
              </a>

              <Link to="/book-appointment" className="sm:hidden">
                <Button variant="primary" size="sm" className="text-xs px-2.5 py-1.5 font-bold">
                  Book
                </Button>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#193247] hover:bg-[#EBF6FC] rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Animated Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="xl:hidden border-b border-[#E5ECEF] bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg max-h-[85vh] overflow-y-auto"
          >
            {/* Timing Notice */}
            <div className="py-2.5 px-3 bg-[#EBF6FC] border border-[#BCE1F5] rounded-xl text-xs text-[#193247] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-[#1E78A4]">
                <Clock className="w-3.5 h-3.5 text-[#3DA9DF]" />
                OPD: {settings.opdStartTime} AM Onwards
              </span>
              <span className="text-[11px] font-medium text-[#647785]">Cutoff: {settings.onlineCutoffTime} AM</span>
            </div>

            {/* Primary Navigation Links on Mobile */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#647785] px-2 py-1">
                Main Services &amp; Care
              </div>
              {primaryNavItems.map((item) => {
                const active = isCurrentActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-[#EBF6FC] text-[#3DA9DF]'
                        : 'text-[#193247] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Additional Hospital Sections */}
            <div className="pt-2 border-t border-[#E5ECEF] space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#647785] px-2 py-1">
                Hospital Information
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {moreNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-2 p-2 rounded-lg text-[11px] font-medium text-[#193247] hover:bg-[#EBF6FC] hover:text-[#3DA9DF] transition-colors"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Actions: Call & Book */}
            <div className="pt-3 border-t border-[#E5ECEF] space-y-2">
              <Link to="/book-appointment" className="block w-full">
                <Button variant="primary" size="md" className="w-full font-bold justify-center" leftIcon={<Calendar className="w-4 h-4" />}>
                  Book an Appointment
                </Button>
              </Link>
              <a href={`tel:${phoneRaw}`} className="block w-full">
                <Button variant="outline" size="md" className="w-full justify-center" leftIcon={<PhoneCall className="w-4 h-4 text-[#3DA9DF]" />}>
                  Call Reception ({phoneRaw})
                </Button>
              </a>
              <div className="flex items-center justify-between pt-1 px-1">
                <Link to="/patient/login" className="text-xs text-[#3DA9DF] font-semibold hover:underline">
                  Patient Portal Login &rarr;
                </Link>
                <Link to="/staff/login" className="text-xs text-[#647785] hover:underline">
                  Staff Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};