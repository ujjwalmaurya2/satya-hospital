import React, { useState } from 'react';
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
  Activity
} from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, role } = useAuth();
  const { settings } = useHospital();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Doctors', path: '/doctors' },
    { label: 'Pathology & Lab', path: '/pathology' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E1E8ED] shadow-xs">
      {/* Top Notification / OPD Hours Strip */}
      <div className="bg-[#243447] text-white text-xs py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#91BB40] font-medium">
              <Clock className="w-3.5 h-3.5" />
              OPD Timings: {settings.opdStartTime} AM Onwards (Cutoff: {settings.onlineCutoffTime} AM)
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">
              Prayagraj, Uttar Pradesh
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={`tel:${settings.emergencyPhone.split(' ')[0]}`} 
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>Emergency: {settings.emergencyPhone.split(' ')[0]}</span>
            </a>
            <span className="text-white/40">|</span>
            <Link 
              to="/staff/login" 
              className="text-xs text-white/80 hover:text-[#91BB40] transition-colors flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Staff Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3DA9DF] to-[#2B98CE] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#243447] leading-none">
                Satya Hospital
              </span>
              <span className="text-xs font-semibold text-[#91BB40] tracking-wide mt-1 uppercase">
                &amp; Pathology Lab
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-[#3DA9DF] bg-[#EBF6FC] font-semibold'
                      : 'text-[#243447] hover:text-[#3DA9DF] hover:bg-[#F4F8FA]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && role === 'patient' ? (
              <Link to="/patient/dashboard">
                <Button variant="outline" size="sm" leftIcon={<User className="w-4 h-4 text-[#3DA9DF]" />}>
                  Patient Portal
                </Button>
              </Link>
            ) : isAuthenticated && role !== 'patient' ? (
              <Link to={`/${role}`}>
                <Button variant="outline" size="sm" leftIcon={<ShieldAlert className="w-4 h-4 text-[#91BB40]" />}>
                  {role.toUpperCase()} Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/patient/login">
                <Button variant="ghost" size="sm" leftIcon={<User className="w-4 h-4 text-[#667085]" />}>
                  Patient Sign In
                </Button>
              </Link>
            )}

            <Link to="/book-appointment">
              <Button 
                variant="primary" 
                size="md" 
                leftIcon={<Calendar className="w-4 h-4" />}
                className="font-medium shadow-sm"
              >
                Book OPD Appointment
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/book-appointment">
              <Button variant="primary" size="sm">
                Book OPD
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#243447] hover:bg-[#F4F8FA] rounded-lg cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E1E8ED] bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="py-2 px-3 bg-[#F4F8FA] rounded-lg text-xs text-[#243447] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#91BB40]" />
              OPD: 09:30 AM Onwards
            </span>
            <span className="text-[#667085]">Cutoff: 09:00 AM</span>
          </div>

          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'text-[#3DA9DF] bg-[#EBF6FC] font-semibold'
                    : 'text-[#243447] hover:bg-[#F4F8FA]'
                }`}
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
            );
          })}

          <div className="pt-3 border-t border-[#E1E8ED] space-y-2">
            {isAuthenticated ? (
              <Link
                to={role === 'patient' ? '/patient/dashboard' : `/${role}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="outline" size="md" className="w-full">
                  Go to {role.toUpperCase()} Portal
                </Button>
              </Link>
            ) : (
              <Link to="/patient/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full" leftIcon={<User className="w-4 h-4" />}>
                  Patient Sign In
                </Button>
              </Link>
            )}

            <Link to="/staff/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full text-xs text-[#667085]">
                Staff Portal Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
