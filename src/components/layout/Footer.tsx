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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
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
            <p className="text-xs text-white/70 leading-relaxed">
              Providing compassionate, high-standard outpatient clinical care and high-precision diagnostic pathology with modern patient records and transparent queue management.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#91BB40] bg-[#243447] p-2.5 rounded-lg border border-[#34465B]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Digital Personal Data Protection (DPDP) aligned records.</span>
            </div>
          </div>

          {/* Col 2: Quick Links & Patient Portals */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Patient Care &amp; Hospital
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/book-appointment" className="hover:text-[#3DA9DF] transition-colors">
                  Book OPD Appointment
                </Link>
              </li>
              <li>
                <Link to="/facilities" className="hover:text-[#3DA9DF] transition-colors">
                  Hospital Facilities &amp; Amenities
                </Link>
              </li>
              <li>
                <Link to="/journey" className="hover:text-[#3DA9DF] transition-colors">
                  Hospital Journey &amp; Milestones
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-[#3DA9DF] transition-colors">
                  Hospital &amp; Lab Gallery
                </Link>
              </li>
              <li>
                <Link to="/testimonials" className="hover:text-[#3DA9DF] transition-colors">
                  Patient Testimonials
                </Link>
              </li>
              <li>
                <Link to="/pathology" className="hover:text-[#3DA9DF] transition-colors">
                  Pathology Test Catalogue
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-[#3DA9DF] transition-colors">
                  Specialist Doctors &amp; OPD
                </Link>
              </li>
              <li>
                <Link to="/patient/dashboard" className="hover:text-[#3DA9DF] transition-colors">
                  Patient Health Portal
                </Link>
              </li>
              <li>
                <Link to="/staff/login" className="text-white/50 hover:text-white transition-colors">
                  Hospital Staff Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Regulatory Policies */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Policies &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/privacy-policy" className="hover:text-[#3DA9DF] transition-colors">
                  Privacy Policy (DPDP Act)
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="hover:text-[#3DA9DF] transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/cancellation-policy" className="hover:text-[#3DA9DF] transition-colors">
                  OPD Cancellation Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-[#3DA9DF] transition-colors">
                  Refund &amp; Fee Policy
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-[#3DA9DF] transition-colors">
                  Medical &amp; Clinical Disclaimer
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="hover:text-[#3DA9DF] transition-colors">
                  Accessibility Statement
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Verified Contact & Timings */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Hospital Timings &amp; Desk
            </h4>
            <div className="flex items-start gap-2.5 text-xs text-white/70">
              <MapPin className="w-4 h-4 text-[#3DA9DF] shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <Phone className="w-4 h-4 text-[#3DA9DF] shrink-0" />
              <span>General Desk: {settings.phone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <Clock className="w-4 h-4 text-[#91BB40] shrink-0" />
              <span>OPD Starts: {settings.opdStartTime} AM Daily (Cutoff: {settings.onlineCutoffTime} AM)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <Mail className="w-4 h-4 text-[#3DA9DF] shrink-0" />
              <span>{settings.email}</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & verification note */}
        <div className="mt-12 pt-8 border-t border-[#2D3E52] flex flex-col md:flex-row items-center justify-between text-xs text-white/50 gap-4">
          <p>&copy; {new Date().getFullYear()} Satya Hospital &amp; Pathology. All rights reserved.</p>
          <p className="text-center md:text-right">
            Designed to Indian healthcare compliance standards. No medical claims or unverified awards.
          </p>
        </div>
      </div>
    </footer>
  );
};
