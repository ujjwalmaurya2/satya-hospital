import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

export const Footer: React.FC = () => {
  const { settings } = useHospital();

  return (
    <footer className="bg-[#1A2634] text-white/80 border-t border-[#2D3E52]">
      {/* Emergency Disclaimer Banner */}
      <div className="bg-[#121B24] border-b border-[#243447] py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-[#91BB40]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              Medical Disclaimer: Online portal bookings and reports are for routine outpatient management and do not establish emergency triage.
            </span>
          </div>
          <span className="text-white/60">
            For critical life-threatening emergencies, visit the emergency ward or dial {settings.emergencyPhone.split(' ')[0]}.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-8">
          
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3DA9DF] flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-none">Satya Hospital</h3>
                <span className="text-xs font-semibold text-[#91BB40] uppercase tracking-wider">
                  &amp; Pathology Lab
                </span>
              </div>
            </div>
            <p className="text-xs text-white/70 leading-relaxed max-w-sm">
              Providing compassionate, ethical outpatient clinical care and high-precision diagnostic pathology in Prayagraj with transparent queue allocation and secure health records.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#91BB40] bg-[#243447] p-2.5 rounded-lg border border-[#34465B] max-w-sm">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Digital Personal Data Protection (DPDP) aligned health records.</span>
            </div>
          </div>

          {/* Col 2: Hospital Navigation Pages */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Hospital Pages
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-[#3DA9DF] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#3DA9DF] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-[#3DA9DF] transition-colors">
                  Specialist Doctors
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-[#3DA9DF] transition-colors">
                  Medical Services
                </Link>
              </li>
              <li>
                <Link to="/pathology-lab" className="hover:text-[#3DA9DF] transition-colors">
                  Doctor Pathology &amp; Lab
                </Link>
              </li>
              <li>
                <Link to="/facilities" className="hover:text-[#3DA9DF] transition-colors">
                  Hospital Facilities
                </Link>
              </li>
              <li>
                <Link to="/journey" className="hover:text-[#3DA9DF] transition-colors">
                  Hospital Journey
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Updates */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Patient Care &amp; News
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/book-appointment" className="hover:text-[#3DA9DF] font-semibold text-[#3DA9DF] transition-colors">
                  Book OPD Appointment
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-[#3DA9DF] transition-colors">
                  Hospital Gallery
                </Link>
              </li>
              <li>
                <Link to="/testimonials" className="hover:text-[#3DA9DF] transition-colors">
                  Patient Testimonials
                </Link>
              </li>
              <li>
                <Link to="/news" className="hover:text-[#3DA9DF] transition-colors">
                  News &amp; Clinical Updates
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#3DA9DF] transition-colors">
                  Contact &amp; Helpdesk
                </Link>
              </li>
              <li>
                <Link to="/patient/dashboard" className="hover:text-[#3DA9DF] transition-colors">
                  Patient Health Portal
                </Link>
              </li>
              <li>
                <Link to="/staff/login" className="text-white/50 hover:text-white transition-colors">
                  Staff Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Verified Contact & Timings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Hospital Helpdesk
            </h4>
            <div className="flex items-start gap-2 text-xs text-white/70">
              <MapPin className="w-4 h-4 text-[#3DA9DF] shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Phone className="w-4 h-4 text-[#3DA9DF] shrink-0" />
              <span>General Desk: {settings.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Clock className="w-4 h-4 text-[#91BB40] shrink-0" />
              <span>OPD Starts: {settings.opdStartTime} AM (Cutoff: {settings.onlineCutoffTime} AM)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Mail className="w-4 h-4 text-[#3DA9DF] shrink-0" />
              <span>{settings.email}</span>
            </div>
          </div>
        </div>

        {/* Legal Policies Strip */}
        <div className="mt-10 pt-6 border-t border-[#2D3E52] flex flex-wrap items-center justify-between gap-y-3 gap-x-6 text-[11px] text-white/60">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-[#3DA9DF] transition-colors">Privacy Policy (DPDP)</Link>
            <span>&bull;</span>
            <Link to="/terms-and-conditions" className="hover:text-[#3DA9DF] transition-colors">Terms of Service</Link>
            <span>&bull;</span>
            <Link to="/cancellation-policy" className="hover:text-[#3DA9DF] transition-colors">OPD Queue Policy</Link>
            <span>&bull;</span>
            <Link to="/refund-policy" className="hover:text-[#3DA9DF] transition-colors">Refund Policy</Link>
            <span>&bull;</span>
            <Link to="/disclaimer" className="hover:text-[#3DA9DF] transition-colors">Medical Disclaimer</Link>
            <span>&bull;</span>
            <Link to="/accessibility" className="hover:text-[#3DA9DF] transition-colors">Accessibility</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Satya Hospital &amp; Pathology. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
