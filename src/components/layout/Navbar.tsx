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
  ChevronRight,
  ChevronDown,
  Activity,
  HeartPulse,
  Microscope,
  Stethoscope,
  Building2,
  Building,
  Milestone,
  Images,
  MessageSquareQuote,
  Newspaper
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export interface NavItem {
  label: string;
  shortLabel?: string;
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
      setScrolled(window.scrollY > 15);
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

  // All 11 dedicated multi-page sections requested
  const allNavLinks: NavItem[] = [
    { label: 'Home', path: '/', icon: <HeartPulse className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'About', path: '/about', icon: <Building2 className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Doctors', path: '/doctors', icon: <Stethoscope className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Services', path: '/services', icon: <Activity className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Doctor, Pathology & Lab', shortLabel: 'Pathology & Lab', path: '/pathology-lab', icon: <Microscope className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Journey', path: '/journey', icon: <Milestone className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Facilities', path: '/facilities', icon: <Building className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'Gallery', path: '/gallery', icon: <Images className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Testimonials', path: '/testimonials', icon: <MessageSquareQuote className="w-4 h-4 text-[#91BB40]" /> },
    { label: 'News & Updates', shortLabel: 'News', path: '/news', icon: <Newspaper className="w-4 h-4 text-[#3DA9DF]" /> },
    { label: 'Contact', path: '/contact', icon: <PhoneCall className="w-4 h-4 text-[#3DA9DF]" /> },
  ];

  // Primary desktop links (displayed inline on standard desktop)
  const primaryDesktopLinks = allNavLinks.slice(0, 5); // Home, About, Doctors, Services, Pathology & Lab
  // Overflow links accessed via "More" dropdown on standard desktop
  const moreDesktopLinks = allNavLinks.slice(5); // Journey, Facilities, Gallery, Testimonials, News, Contact

  const isCurrentActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/pathology-lab') {
      return location.pathname === '/pathology-lab' || location.pathname === '/pathology';
    }
    return location.pathname.startsWith(path);
  };

  const isMoreGroupActive = moreDesktopLinks.some(link => isCurrentActive(link.path));

  return (
    <header className="sticky top-0 z-50 transition-all duration-200">
      {/* Top Utility / OPD Hours Strip */}
      <div className="bg-[#243447] text-white text-[11px] py-1.5 px-4 hidden md:block border-b border-white/10 tracking-wide">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#91BB40] font-semibold">
              <Clock className="w-3.5 h-3.5" />
              OPD Timings: {settings.opdStartTime} AM Onwards &bull; Same-Day Online Cutoff: {settings.onlineCutoffTime} AM IST
            </span>
            <span className="text-white/30">|</span>
            <span className="text-white/80 font-medium">
              Civil Lines Road, Prayagraj, UP
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={`tel:${settings.emergencyPhone.split(' ')[0]}`} 
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors group"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#3DA9DF] group-hover:scale-110 transition-transform" />
              <span>Emergency Hotline: <strong className="text-white">{settings.emergencyPhone.split(' ')[0]}</strong></span>
            </a>
            <span className="text-white/30">|</span>
            <Link 
              to="/staff/login" 
              className="text-white/80 hover:text-[#91BB40] transition-colors flex items-center gap-1 font-medium"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#91BB40]" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Nav Bar with Scroll-aware glass backdrop */}
      <div 
        className={`w-full transition-all duration-200 border-b ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md border-[#E1E8ED] shadow-sm py-2' 
            : 'bg-white/90 backdrop-blur-sm border-[#E1E8ED]/70 py-3'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-3">
            
            {/* Logo / Brand */}
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-hidden shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#3DA9DF] to-[#1E78A4] flex items-center justify-center text-white shadow-sm shadow-[#3DA9DF]/20 group-hover:scale-105 transition-transform duration-200">
                <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#243447] leading-none group-hover:text-[#3DA9DF] transition-colors">
                  Satya Hospital
                </span>
                <span className="text-[10px] font-semibold text-[#91BB40] tracking-wider mt-0.5 uppercase flex items-center gap-1">
                  <span>&amp; Pathology Lab</span>
                  <span className="w-1 h-1 rounded-full bg-[#91BB40]/70 inline-block"></span>
                  <span className="text-[9px] text-[#667085] normal-case">Prayagraj</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (2xl+ displays all 11 inline) */}
            <nav className="hidden 2xl:flex items-center gap-1" aria-label="Main Navigation">
              {allNavLinks.map((link) => {
                const active = isCurrentActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal whitespace-nowrap transition-all ${
                      active
                        ? 'text-[#1E78A4] bg-[#EBF6FC]'
                        : 'text-[#243447] hover:text-[#3DA9DF] hover:bg-[#F4F8FA]'
                    }`}
                  >
                    {link.shortLabel || link.label}
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

            {/* Responsive Desktop Navigation for lg & xl screens (1024px to 1535px) */}
            <nav className="hidden lg:flex 2xl:hidden items-center gap-1" aria-label="Main Navigation Condensed">
              {primaryDesktopLinks.map((link) => {
                const active = isCurrentActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'text-[#1E78A4] bg-[#EBF6FC]'
                        : 'text-[#243447] hover:text-[#3DA9DF] hover:bg-[#F4F8FA]'
                    }`}
                  >
                    {link.shortLabel || link.label}
                    {active && (
                      <motion.span 
                        layoutId="activeNavIndicatorCompact"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#3DA9DF] rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* "More" dropdown for secondary pages on desktop */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    moreDropdownOpen || isMoreGroupActive
                      ? 'text-[#1E78A4] bg-[#EBF6FC]'
                      : 'text-[#243447] hover:text-[#3DA9DF] hover:bg-[#F4F8FA]'
                  }`}
                  aria-expanded={moreDropdownOpen}
                >
                  <span>More Pages</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {moreDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#CBD5E1] shadow-xl py-2 z-50 divide-y divide-[#E1E8ED]"
                    >
                      <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                        Hospital Sections &amp; Bulletins
                      </div>
                      <div className="py-1">
                        {moreDesktopLinks.map((item) => {
                          const active = isCurrentActive(item.path);
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                                active
                                  ? 'bg-[#EBF6FC] text-[#1E78A4] font-semibold'
                                  : 'text-[#243447] hover:bg-[#F8FAFC]'
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

            {/* Right Action CTAs */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              {isAuthenticated && role === 'patient' ? (
                <Link to="/patient/dashboard">
                  <Button variant="outline" size="sm" leftIcon={<User className="w-3.5 h-3.5 text-[#3DA9DF]" />}>
                    Patient Portal
                  </Button>
                </Link>
              ) : isAuthenticated && role !== 'patient' ? (
                <Link to={`/${role}`}>
                  <Button variant="outline" size="sm" leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-[#91BB40]" />}>
                    {role.toUpperCase()} Desk
                  </Button>
                </Link>
              ) : (
                <Link to="/patient/login">
                  <Button variant="ghost" size="sm" leftIcon={<User className="w-3.5 h-3.5 text-[#667085]" />} className="text-xs">
                    Patient Sign In
                  </Button>
                </Link>
              )}

              <Link to="/book-appointment">
                <Button 
                  variant="primary" 
                  size="sm" 
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  className="font-semibold shadow-xs hover:shadow-md transition-shadow text-xs"
                >
                  Book OPD Token
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link to="/book-appointment">
                <Button variant="primary" size="sm" className="text-xs px-2.5 py-1.5">
                  Book OPD
                </Button>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#243447] hover:bg-[#F4F8FA] rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Animated Slide-over (All 11 Dedicated Pages Accessible) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="lg:hidden border-b border-[#E1E8ED] bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl overflow-hidden max-h-[85vh] overflow-y-auto"
          >
            <div className="py-2.5 px-3 bg-[#F4F8FA] border border-[#E1E8ED] rounded-xl text-xs text-[#243447] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-[#1E78A4]">
                <Clock className="w-3.5 h-3.5 text-[#91BB40]" />
                OPD: 09:30 AM Onwards
              </span>
              <span className="text-[11px] font-medium text-[#667085]">Cutoff: {settings.onlineCutoffTime} AM</span>
            </div>

            {/* 11 Direct Navigation Page Links on Mobile */}
            <div className="space-y-1">
              {allNavLinks.map((link) => {
                const active = isCurrentActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? 'text-[#1E78A4] bg-[#EBF6FC] font-bold'
                        : 'text-[#243447] hover:bg-[#F4F8FA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {link.icon}
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${active ? 'text-[#3DA9DF]' : 'opacity-30'}`} />
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#E1E8ED] space-y-2">
              <a 
                href={`tel:${settings.emergencyPhone.split(' ')[0]}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-red-50 text-red-700 font-semibold text-xs border border-red-200"
              >
                <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                <span>Emergency Call: {settings.emergencyPhone.split(' ')[0]}</span>
              </a>

              {isAuthenticated ? (
                <Link
                  to={role === 'patient' ? '/patient/dashboard' : `/${role}`}
                  className="block"
                >
                  <Button variant="outline" size="md" className="w-full">
                    Go to {role.toUpperCase()} Portal
                  </Button>
                </Link>
              ) : (
                <Link to="/patient/login" className="block">
                  <Button variant="outline" size="md" className="w-full" leftIcon={<User className="w-4 h-4" />}>
                    Patient Sign In
                  </Button>
                </Link>
              )}

              <Link to="/staff/login" className="block">
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#667085]">
                  Hospital Staff Portal Login &rarr;
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
