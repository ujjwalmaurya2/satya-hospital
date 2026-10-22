import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  Calendar,
  Baby,
  Microscope,
  ArrowRight
} from 'lucide-react';
import { Button } from '../common/Button';
import { useHospital } from '../../context/HospitalContext';

export const Footer: React.FC = () => {
  const { settings } = useHospital();

  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';
  const emergencyRaw = settings.emergencyPhone.split(' ')[0] || '+919838000000';

  return (
    <footer className="bg-[#FCFDFB] text-[#647785] border-t border-[#E5ECEF]">
      {/* Light Clinical Advisory Notice */}
      <div className="bg-[#E6F5EF] border-b border-[#C2EADE] py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-[#0F6B56]">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#168C8C]" />
            <span className="font-semibold">
              Medical Disclaimer: Online portal bookings and reports are for routine outpatient management and do not establish emergency triage.
            </span>
          </div>
          <span className="text-[#193247] text-[11px] font-medium">
            For acute pediatric distress, present immediately to the hospital reception or dial <strong className="text-[#168C8C]">{emergencyRaw}</strong>.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Col 1: Hospital Brand & Introduction */}
          <div className="space-y-4 lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#168C8C] to-[#0E5C5C] flex items-center justify-center text-white shadow-xs">
                <Heart className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-[#193247] leading-none">
                  Satya Hospital
                </span>
                <span className="text-[10px] font-bold text-[#168C8C] uppercase tracking-wider mt-0.5">
                  &amp; Pathology Lab &bull; Prayagraj
                </span>
              </div>
            </Link>

            <p className="text-xs text-[#647785] leading-relaxed max-w-sm">
              Dedicated pediatric outpatient consultations, gentle newborn care, and certified clinical pathology in Civil Lines, Prayagraj. Designed around the comfort of your child and the peace of mind of your family.
            </p>

            <div className="flex items-center gap-2.5 text-xs text-[#0F6B56] bg-[#E6F5EF] p-3 rounded-xl border border-[#C2EADE] max-w-sm">
              <ShieldCheck className="w-4 h-4 text-[#168C8C] shrink-0" />
              <span className="text-[11px] font-medium">
                DPDP Act aligned patient confidentiality &amp; sequential OPD token queue.
              </span>
            </div>

            <div className="pt-2">
              <Link to="/book-appointment">
                <Button variant="primary" size="sm" leftIcon={<Calendar className="w-3.5 h-3.5" />}>
                  Book OPD Appointment
                </Button>
              </Link>
            </div>
          </div>

          {/* Col 2: Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-[#193247] uppercase tracking-wider mb-4">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-[#168C8C] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#168C8C] transition-colors">
                  About Satya Hospital
                </Link>
              </li>
              <li>
                <Link to="/pediatric-care" className="hover:text-[#168C8C] transition-colors font-medium text-[#168C8C]">
                  Pediatric Care
                </Link>
              </li>
              <li>
                <Link to="/newborn-care" className="hover:text-[#168C8C] transition-colors font-medium text-[#168C8C]">
                  Newborn Care
                </Link>
              </li>
              <li>
                <Link to="/pathology-lab" className="hover:text-[#168C8C] transition-colors">
                  Pathology &amp; Diagnostics
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-[#168C8C] transition-colors">
                  Doctors Directory
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#168C8C] transition-colors">
                  Contact &amp; Location
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Available Services */}
          <div>
            <h4 className="text-xs font-bold text-[#193247] uppercase tracking-wider mb-4">
              Clinical Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pediatric-care" className="hover:text-[#168C8C] transition-colors">
                  Pediatric OPD Consultations
                </Link>
              </li>
              <li>
                <Link to="/newborn-care" className="hover:text-[#168C8C] transition-colors">
                  Infant Growth &amp; Reflex Checks
                </Link>
              </li>
              <li>
                <Link to="/pediatric-care" className="hover:text-[#168C8C] transition-colors">
                  Childhood Immunization
                </Link>
              </li>
              <li>
                <Link to="/pathology-lab" className="hover:text-[#168C8C] transition-colors">
                  Complete Blood Count (CBC)
                </Link>
              </li>
              <li>
                <Link to="/pathology-lab" className="hover:text-[#168C8C] transition-colors">
                  Biochemistry &amp; Hormone Tests
                </Link>
              </li>
              <li>
                <Link to="/patient/reports" className="hover:text-[#168C8C] transition-colors">
                  Verified Digital Reports
                </Link>
              </li>
              <li>
                <Link to="/facilities" className="hover:text-[#168C8C] transition-colors">
                  Child-Friendly Waiting Areas
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#193247] uppercase tracking-wider mb-4">
              Contact &amp; Timings
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Civil Lines Road, Near Medical Crossing, Prayagraj, UP &bull; 211001
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#168C8C] shrink-0" />
                <a href={`tel:${phoneRaw}`} className="hover:text-[#168C8C] transition-colors font-medium">
                  {phoneRaw}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#168C8C] shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-[#168C8C] transition-colors">
                  {settings.email}
                </a>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <Clock className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#193247]">OPD Timings:</p>
                  <p className="text-[11px] text-[#647785]">09:30 AM Onwards (Mon&ndash;Sat)</p>
                  <p className="text-[11px] text-[#168C8C] font-semibold">Cutoff: {settings.onlineCutoffTime} AM Daily</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Legal & Policy Links Strip */}
        <div className="mt-12 pt-8 border-t border-[#E5ECEF] flex flex-col md:flex-row items-center justify-between text-xs gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-[#647785]">
            <Link to="/privacy-policy" className="hover:text-[#168C8C] transition-colors">
              Privacy Policy (DPDP Act)
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-[#168C8C] transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link to="/cancellation-policy" className="hover:text-[#168C8C] transition-colors">
              OPD Cancellation Policy
            </Link>
            <Link to="/refund-policy" className="hover:text-[#168C8C] transition-colors">
              Refund Policy
            </Link>
            <Link to="/disclaimer" className="hover:text-[#168C8C] transition-colors">
              Medical Disclaimer
            </Link>
            <Link to="/accessibility" className="hover:text-[#168C8C] transition-colors">
              Accessibility
            </Link>
          </div>

          <div className="text-[11px] text-[#647785]">
            &copy; {new Date().getFullYear()} Satya Hospital &amp; Pathology, Prayagraj. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};