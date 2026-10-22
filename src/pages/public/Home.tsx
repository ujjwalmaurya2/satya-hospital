import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Microscope, 
  Stethoscope, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  PhoneCall, 
  MapPin, 
  FileCheck,
  AlertTriangle,
  HeartPulse,
  Award,
  Sparkles,
  Users,
  Search,
  ChevronDown,
  Building2,
  Building,
  Syringe,
  FileText,
  BadgeCheck,
  HelpCircle,
  Milestone,
  Images,
  MessageSquareQuote,
  Newspaper,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';
import { 
  getNextEligibleOpdDate, 
  checkOnlineBookingCutoff, 
  getHospitalTodayDate 
} from '../../lib/tokens';
import { hospitalFacilities } from './Facilities';
import { patientTestimonials } from './Testimonials';
import { hospitalNewsArticles } from './News';

export const Home: React.FC = () => {
  const { settings, departments, doctors, pathologyTests, getTodayQueueStats } = useHospital();
  const queueStats = getTodayQueueStats();
  const navigate = useNavigate();

  // Next eligible date respecting T-1 booking window and 09:00 AM cutoff
  const nextEligibleDate = getNextEligibleOpdDate({
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  // Hero Quick Booking Module State
  const [heroDeptId, setHeroDeptId] = useState<string>('all');
  const [heroDoctorId, setHeroDoctorId] = useState<string>(doctors[0]?.id || '');
  const [heroDate, setHeroDate] = useState<string>(nextEligibleDate);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Filter doctors for the quick booking dropdown
  const availableDoctorsForHero = heroDeptId === 'all'
    ? doctors
    : doctors.filter(d => {
        const dept = departments.find(dep => dep.id === heroDeptId);
        return dept ? d.department.toLowerCase().includes(dept.name.toLowerCase().split(' ')[0]) : true;
      });

  // Live Cutoff Verification for the Hero Quick Booking card
  const heroCutoffStatus = checkOnlineBookingCutoff(heroDate, {
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  const handleHeroBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const docParam = heroDoctorId ? `&doctor=${encodeURIComponent(heroDoctorId)}` : '';
    const dateParam = heroDate ? `&date=${encodeURIComponent(heroDate)}` : '';
    navigate(`/book-appointment?${docParam}${dateParam}`.replace('?&', '?'));
  };

  // Frequently Asked Questions Content
  const faqItems = [
    {
      q: 'What time does online OPD booking close for the day?',
      a: `Online appointment reservations for a particular date close strictly at ${settings.onlineCutoffTime} AM IST on that day. This allows consulting doctors and dispensary desks to lock morning consultation rosters. However, offline walk-in registration at hospital reception continues throughout the day from ${settings.opdStartTime} AM onwards.`,
    },
    {
      q: 'How does the shared token queue system work?',
      a: 'Both online bookings and offline walk-ins share the single, sequential daily queue. No patient receives a duplicate token, and appointments are called strictly in sequential order. This guarantees transparency and prevents oversubscription.',
    },
    {
      q: 'How and when can I access my diagnostic pathology reports?',
      a: 'Once your specimen is analyzed by calibrated automated analyzers, the report undergoes a mandatory two-step verification by our Senior Pathologist. Upon sign-off, your digital PDF report is immediately published to your secure Patient Portal and can be downloaded via an authenticated, short-lived signed URL.',
    },
    {
      q: 'Is there any upfront consultation fee for booking an online token?',
      a: 'No upfront online payment is currently required. Registration and token reservation are complimentary online; consultation fees (if applicable) are settled directly at the hospital reception desk upon morning arrival.',
    },
    {
      q: 'Can I reschedule my appointment if I miss the 9:00 AM cutoff?',
      a: 'If the same-day cutoff has passed, you can book an online token for the next eligible OPD date or visit the ground-floor hospital reception desk in person to receive a same-day walk-in token.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-x-hidden">

      {/* =========================================================================
          1. HERO SECTION WITH EMBEDDED APPOINTMENT BOOKING MODULE
         ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF6FC]/90 via-[#F4F8FA] to-[#F4F8FA] pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-[#E1E8ED]">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#3DA9DF]/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#91BB40]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Content Column (7 cols on desktop) */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              {/* Trust Badge Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#BCE1F5] text-xs font-semibold text-[#1E78A4] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#91BB40] animate-pulse"></span>
                <span>Multispeciality Hospital &bull; NABL-Aligned Pathology &bull; Prayagraj</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#243447] leading-[1.15]">
                Specialist Healthcare, <br />
                <span className="text-[#3DA9DF]">Accurate Diagnostics</span>, <br />
                <span className="text-[#91BB40]">Fair Token Queue.</span>
              </h1>

              {/* Supporting Subtext */}
              <p className="text-sm sm:text-base text-[#667085] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Satya Hospital &amp; Pathology provides structured clinical consultations, certified diagnostic laboratory testing, and transparent queue allocation for patients across Prayagraj.
              </p>

              {/* Operational Status Card */}
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-[#E1E8ED] shadow-xs max-w-lg mx-auto lg:mx-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F3F8EC] flex items-center justify-center text-[#91BB40] shrink-0 border border-[#91BB40]/20">
                    <Clock className="w-5 h-5 text-[#688D23]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#243447]">Daily OPD Consultations</div>
                    <div className="text-[11px] text-[#667085]">
                      Starts at 09:30 AM &bull; Same-day online cutoff: <strong>{settings.onlineCutoffTime} AM IST</strong>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant="lime-green" size="sm" dot>
                    Unlimited Queue Intake
                  </Badge>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                <Link to="/book-appointment" className="w-full sm:w-auto">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    leftIcon={<Calendar className="w-5 h-5" />}
                    className="w-full sm:w-auto font-semibold shadow-sm hover:shadow-md transition-shadow"
                  >
                    Book OPD Appointment
                  </Button>
                </Link>

                <Link to="/doctors" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    leftIcon={<Stethoscope className="w-5 h-5 text-[#3DA9DF]" />}
                    className="w-full sm:w-auto font-medium"
                  >
                    View Doctors ({doctors.length})
                  </Button>
                </Link>
              </div>

              {/* Verified Trust Signals */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs font-medium text-[#667085]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                  <span>Sequential Token Allocation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                  <span>Verified Senior Consultants</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                  <span>DPDP-Compliant Records</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Integrated Quick Appointment Module (5 cols on desktop) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-lg p-6 sm:p-7 relative overflow-hidden">
                {/* Header of Quick Card */}
                <div className="flex items-center justify-between pb-4 border-b border-[#E1E8ED]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#3DA9DF]/10 text-[#3DA9DF] flex items-center justify-center">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#243447]">Quick OPD Reservation</h3>
                      <p className="text-[11px] text-[#667085]">Reserve your token number in seconds</p>
                    </div>
                  </div>
                  <Badge variant="medical-blue" size="sm">
                    No Upfront Fee
                  </Badge>
                </div>

                {/* Quick Booking Form */}
                <form onSubmit={handleHeroBookingSubmit} className="pt-4 space-y-3.5 text-left text-xs">
                  {/* Department Select */}
                  <div>
                    <label className="block font-semibold text-[#243447] mb-1">
                      Select Department / Specialty
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
                      <select
                        value={heroDeptId}
                        onChange={(e) => {
                          setHeroDeptId(e.target.value);
                          const filtered = e.target.value === 'all' 
                            ? doctors 
                            : doctors.filter(d => {
                                const dept = departments.find(dep => dep.id === e.target.value);
                                return dept ? d.department.toLowerCase().includes(dept.name.toLowerCase().split(' ')[0]) : true;
                              });
                          if (filtered.length > 0) setHeroDoctorId(filtered[0].id);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CBD5E1] text-[#243447] text-xs font-medium focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white"
                      >
                        <option value="all">All Departments (Show All Doctors)</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Doctor Select */}
                  <div>
                    <label className="block font-semibold text-[#243447] mb-1">
                      Consulting Specialist
                    </label>
                    <div className="relative">
                      <Stethoscope className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
                      <select
                        value={heroDoctorId}
                        onChange={(e) => setHeroDoctorId(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CBD5E1] text-[#243447] text-xs font-medium focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white"
                      >
                        {availableDoctorsForHero.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.fullName} &bull; {doc.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block font-semibold text-[#243447] mb-1">
                      Intended Appointment Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="date"
                        min={getHospitalTodayDate()}
                        value={heroDate}
                        onChange={(e) => setHeroDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CBD5E1] text-[#243447] text-xs font-medium focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-[#667085] mt-1 block">
                      Booking opens 1 day prior &bull; Cutoff: 09:00 AM on appointment date
                    </span>
                  </div>

                  {/* Cutoff / Availability Status */}
                  {!heroCutoffStatus.allowed && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-snug">
                      <div className="font-semibold flex items-center gap-1 mb-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Online Slot Closed For Selected Date</span>
                      </div>
                      <p className="text-[10px] text-amber-700">{heroCutoffStatus.reason}</p>
                      {heroCutoffStatus.nextEligibleDate && (
                        <button
                          type="button"
                          onClick={() => setHeroDate(heroCutoffStatus.nextEligibleDate!)}
                          className="mt-1 text-[11px] text-[#1E78A4] font-semibold underline block cursor-pointer"
                        >
                          Switch to next eligible date: {heroCutoffStatus.nextEligibleDate} &rarr;
                        </button>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full font-semibold shadow-xs"
                      disabled={!heroCutoffStatus.allowed}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue with OPD Token Booking
                    </Button>
                  </div>
                </form>

                {/* Bottom Trust Signal */}
                <div className="pt-3.5 mt-3 border-t border-[#E1E8ED] flex items-center justify-between text-[11px] text-[#667085]">
                  <span className="flex items-center gap-1 text-[#243447] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#3DA9DF]" />
                    <span>Instant confirmation</span>
                  </span>
                  <Link to="/cancellation-policy" className="text-[#3DA9DF] hover:underline">
                    OPD Queue Policy &rarr;
                  </Link>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          2. HOSPITAL METRICS & TRUST INDICATORS (STATIC LITERAL NUMBERS)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E1E8ED] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#243447]">4+</div>
                <div className="text-xs font-semibold text-[#667085]">Clinical Specialties</div>
              </div>
            </div>
            <p className="text-[11px] text-[#667085] mt-2 leading-tight">
              Medicine, Surgery, Gynaecology, Paediatrics
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E1E8ED] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center shrink-0">
                <Microscope className="w-5 h-5 text-[#688D23]" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#243447]">{pathologyTests.length}+</div>
                <div className="text-xs font-semibold text-[#667085]">Diagnostic Lab Tests</div>
              </div>
            </div>
            <p className="text-[11px] text-[#667085] mt-2 leading-tight">
              Routine &amp; specialized blood and urine panels
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E1E8ED] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#243447]">09:30 AM</div>
                <div className="text-xs font-semibold text-[#667085]">Daily Clinic Start</div>
              </div>
            </div>
            <p className="text-[11px] text-[#667085] mt-2 leading-tight">
              Prompt morning doctor consultation hours
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E1E8ED] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#688D23]" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#243447]">Single Queue</div>
                <div className="text-xs font-semibold text-[#667085]">Sequential Tokens</div>
              </div>
            </div>
            <p className="text-[11px] text-[#667085] mt-2 leading-tight">
              Fair token allocation for online &amp; walk-in patients
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. HOSPITAL INTRODUCTION & CORE COMMITMENTS (PREVIEW WITH LINK TO /about)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>About Satya Hospital &amp; Pathology</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447] tracking-tight">
              Compassionate Healthcare Rooted in Clinical Precision &amp; Transparency
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              Satya Hospital was established in Prayagraj to provide structured, ethical outpatient healthcare and high-precision diagnostic pathology. We combine experienced medical practitioners with modern digital queue management and secure health record access.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-4 rounded-xl bg-white border border-[#E1E8ED] space-y-1">
                <span className="font-bold text-[#243447] block">Zero Fabricated Claims</span>
                <p className="text-[#667085] text-[11px]">Strict adherence to factual reporting and certified pathologist verifications.</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E1E8ED] space-y-1">
                <span className="font-bold text-[#243447] block">Queue Transparency</span>
                <p className="text-[#667085] text-[11px]">Online and walk-in patients share a single predictable sequential token queue.</p>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Link to="/about">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Learn More About Satya Hospital
                </Button>
              </Link>
              <Link to="/journey">
                <Button variant="ghost" size="sm" className="text-xs text-[#3DA9DF]">
                  Our Journey Timeline &rarr;
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-[#CBD5E1] p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E1E8ED]">
                <div className="w-10 h-10 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-[#688D23]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#243447]">Core Clinical Commitments</h3>
                  <p className="text-[11px] text-[#667085]">Standards followed across all OPD chambers &amp; diagnostics</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#243447] block">Credentialed Medical Faculty:</strong>
                    <span className="text-[#667085]">All consultants hold verified postgraduate medical degrees (MD, MS, DNB).</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#243447] block">DPDP-Compliant Health Data:</strong>
                    <span className="text-[#667085]">Prescriptions and lab reports stored under strict digital access control.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#243447] block">In-House Quality Control:</strong>
                    <span className="text-[#667085]">Automated analyzers calibrated daily with multi-level internal standards.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. CORE MEDICAL SPECIALTIES PREVIEW (LINK TO /services)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#3DA9DF] tracking-wider uppercase">
              Clinical Specialities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447] mt-1">
              Medical Departments
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] mt-1.5 max-w-xl leading-relaxed">
              Our multidisciplinary healthcare team delivers outpatient diagnostics, preventive medicine, and specialized procedures.
            </p>
          </div>
          <Link to="/services" className="mt-4 md:mt-0">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
              View All Services Page
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {departments.slice(0, 4).map((dept) => (
            <motion.div
              key={dept.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-2xl border border-[#E1E8ED] hover:border-[#3DA9DF] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center mb-4 group-hover:bg-[#3DA9DF] group-hover:text-white transition-colors">
                  <Stethoscope className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-base font-bold text-[#243447] mb-2 group-hover:text-[#3DA9DF] transition-colors">
                  {dept.name}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed line-clamp-3 mb-4">
                  {dept.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E1E8ED] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#667085] font-medium truncate max-w-[140px]">
                  {dept.headOfDepartment ? dept.headOfDepartment.split('(')[0].trim() : 'Senior Consultant'}
                </span>
                <Link
                  to="/services"
                  className="text-xs font-semibold text-[#1E78A4] hover:text-[#3DA9DF] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. SENIOR SPECIALISTS SPOTLIGHT (LINK TO /doctors)
         ========================================================================= */}
      <section className="bg-white py-14 sm:py-18 border-y border-[#E1E8ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-[#91BB40] tracking-wider uppercase">
                Verified Medical Faculty
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447] mt-1">
                Consult Our Senior Specialists
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                Meet our credentialed doctors holding recognized postgraduate degrees (MD, MS, DNB) in Prayagraj.
              </p>
            </div>
            <Link to="/doctors" className="mt-4 md:mt-0">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
                View Complete Doctor Directory ({doctors.length})
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <motion.div
                key={doc.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-[#F8FAFC] rounded-2xl border border-[#E1E8ED] hover:border-[#3DA9DF] hover:bg-white p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3DA9DF]/20 to-[#91BB40]/20 flex items-center justify-center text-[#1E78A4] font-bold text-base border border-[#3DA9DF]/30 shrink-0">
                      {doc.fullName.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full mb-1">
                        <BadgeCheck className="w-3 h-3 text-[#15803D]" />
                        <span>Available for OPD</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#243447] leading-snug">
                        {doc.fullName}
                      </h3>
                      <p className="text-[11px] font-medium text-[#3DA9DF]">
                        {doc.designation}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs py-3 border-y border-[#E1E8ED]/70 mb-4">
                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Qualifications:</span>
                      <strong className="text-[#243447] font-semibold">{doc.qualifications}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Department:</span>
                      <strong className="text-[#243447] font-semibold truncate max-w-[140px]">{doc.department}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Room:</span>
                      <span className="text-[#243447] font-medium">{doc.consultationRoom}</span>
                    </div>
                  </div>
                </div>

                <Link to={`/book-appointment?doctor=${doc.id}`}>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="w-full text-xs font-semibold"
                    leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  >
                    Book with {doc.fullName.split(' ')[1] || doc.fullName}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. PATHOLOGY & DIAGNOSTIC LAB HIGHLIGHT (LINK TO /pathology-lab)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#688D23] text-xs font-semibold">
              <Microscope className="w-3.5 h-3.5" />
              <span>In-House Automated Diagnostics</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447] leading-tight">
              Certified Pathology Lab <br />
              <span className="text-[#3DA9DF]">On Hospital Premises</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              Satya Hospital maintains an in-house clinical pathology laboratory equipped with calibrated automated analyzers. Blood, serum, and urine samples are processed with strict quality control.
            </p>

            <div className="space-y-3 pt-1 text-xs text-[#243447]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#243447]">Rapid 2–4 Hour Turnaround:</strong>
                  <span className="text-[#667085]">Routine panels including CBC, blood sugar, and electrolytes processed promptly for OPD patients.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#243447]">Two-Step Pathologist Sign-Off:</strong>
                  <span className="text-[#667085]">Reports remain in verification state until certified by the pathologist, preventing unreviewed clinical releases.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link to="/pathology-lab">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Full Lab Catalogue &rarr;
                </Button>
              </Link>
              <Link to="/patient/reports">
                <Button variant="outline" size="md" leftIcon={<FileText className="w-4 h-4 text-[#3DA9DF]" />}>
                  Access My Reports
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm divide-y divide-[#E1E8ED] overflow-hidden">
              <div className="p-4 bg-[#F8FAFC] flex items-center justify-between border-b border-[#E1E8ED]">
                <span className="text-xs font-bold text-[#243447] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#3DA9DF]" />
                  <span>Key Diagnostic Laboratory Panels</span>
                </span>
                <span className="text-[11px] text-[#667085]">Hospital In-House Rates</span>
              </div>

              {pathologyTests.slice(0, 4).map((test) => (
                <div key={test.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-[#243447]">{test.name}</div>
                    <div className="text-xs text-[#667085] flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#F4F8FA] border border-[#E1E8ED] text-[10px] font-medium text-[#243447]">
                        {test.category}
                      </span>
                      <span>Specimen: {test.specimenType}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <div className="text-base font-extrabold text-[#243447]">₹{test.price}</div>
                    <span className="text-[10px] text-[#15803D] font-semibold bg-[#DCFCE7] px-2 py-0.5 rounded-full inline-block mt-0.5">
                      Available Daily
                    </span>
                  </div>
                </div>
              ))}

              <div className="p-3.5 bg-[#F8FAFC] text-center text-xs text-[#667085] flex items-center justify-center gap-2">
                <span>Sample collection open daily from <strong>08:00 AM to 02:00 PM</strong>.</span>
                <Link to="/pathology-lab" className="text-[#3DA9DF] font-semibold hover:underline">
                  View All ({pathologyTests.length}) Tests &rarr;
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. FACILITIES & INFRASTRUCTURE PREVIEW (LINK TO /facilities)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#3DA9DF] tracking-wider uppercase">
              Clinical Infrastructure
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447] mt-1">
              Hospital Facilities &amp; Amenities
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] mt-1.5 max-w-xl leading-relaxed">
              Equipped for prompt outpatient consultations, day-care observations, and acute triage.
            </p>
          </div>
          <Link to="/facilities" className="mt-4 md:mt-0">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
              Explore All Facilities Page
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
              <Activity className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">Emergency &amp; Acute Care</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Equipped emergency desk for immediate patient stabilization, vital monitoring, and rapid triage coordination.
            </p>
            <Link to="/facilities" className="text-xs text-[#3DA9DF] font-semibold hover:underline inline-block pt-1">
              Learn more &rarr;
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
              <Syringe className="w-5 h-5 text-[#688D23]" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">Minor Procedures &amp; Day Care</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Sterile minor operation theatre for wound management, suturing, minor surgical interventions, and short observation.
            </p>
            <Link to="/facilities" className="text-xs text-[#3DA9DF] font-semibold hover:underline inline-block pt-1">
              Learn more &rarr;
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">Diagnostics &amp; ECG Facilities</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              12-lead digital ECG and point-of-care vital evaluations supporting cardiology screening and clinical assessments.
            </p>
            <Link to="/facilities" className="text-xs text-[#3DA9DF] font-semibold hover:underline inline-block pt-1">
              Learn more &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. TRANSPARENT OPD QUEUE PROTOCOL (3-STEP WALKTHROUGH)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#243447] text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#3DA9DF]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mb-10 relative z-10">
            <span className="text-xs font-bold text-[#91BB40] tracking-wider uppercase">
              Transparent Queue Protocol
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              How OPD Booking Works at Satya Hospital
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">
              Our unified queue synchronizes online token bookings with in-person reception arrivals, ensuring fair access for every patient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-[#1C2937] p-6 rounded-2xl border border-[#34465B] space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#3DA9DF] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                1
              </div>
              <h3 className="text-base font-bold text-white">Online Reservation (T-1 to 9:00 AM)</h3>
              <p className="text-xs text-white/75 leading-relaxed">
                Online booking opens 1 calendar day before the appointment date and closes strictly at <strong>09:00 AM IST</strong> on the OPD date to lock clinic dispensary rosters.
              </p>
            </div>

            <div className="bg-[#1C2937] p-6 rounded-2xl border border-[#34465B] space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#91BB40] text-[#243447] flex items-center justify-center text-sm font-bold shadow-xs">
                2
              </div>
              <h3 className="text-base font-bold text-white">Reception Check-In &amp; Token Number</h3>
              <p className="text-xs text-white/75 leading-relaxed">
                Arrive by 09:30 AM at the ground-floor reception. Present your token reference code or mobile number. Walk-in patients registering after 09:00 AM receive subsequent daily tokens.
              </p>
            </div>

            <div className="bg-[#1C2937] p-6 rounded-2xl border border-[#34465B] space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#3DA9DF] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                3
              </div>
              <h3 className="text-base font-bold text-white">Specialist Consultation at 9:30 AM</h3>
              <p className="text-xs text-white/75 leading-relaxed">
                Consultations commence at 09:30 AM in assigned OPD rooms. Tokens are called sequentially. Prescriptions and medical advice are linked directly to your Hospital Patient ID.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#34465B] flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 text-xs">
            <span className="text-white/70 max-w-xl">
              Missed the 09:00 AM online cutoff? Physical walk-in registration at the hospital reception continues without disruption throughout clinic hours.
            </span>
            <Link to="/book-appointment">
              <Button variant="accent" size="md" className="font-semibold shrink-0">
                Proceed to Book OPD Slot &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. LATEST NEWS & CLINICAL BULLETINS PREVIEW (LINK TO /news)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold mb-2">
              <Newspaper className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>Hospital Bulletins</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447]">
              News &amp; Clinical Advisories
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] mt-1.5 max-w-xl leading-relaxed">
              Stay informed with official medical advisories, technology updates, and operational guidelines from our medical staff.
            </p>
          </div>
          <Link to="/news" className="mt-4 md:mt-0">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
              View All News Bulletins
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hospitalNewsArticles.slice(0, 3).map((article) => (
            <Link 
              key={article.id} 
              to="/news"
              className="bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#3DA9DF] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={article.badgeVariant} size="sm">
                    {article.categoryLabel}
                  </Badge>
                  <span className="text-[11px] text-[#667085]">{article.publishDate}</span>
                </div>
                <h3 className="text-base font-bold text-[#243447] group-hover:text-[#3DA9DF] transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="text-xs text-[#667085] line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E1E8ED] flex items-center justify-between text-xs">
                <span className="text-[#1E78A4] font-medium text-[11px]">{article.department}</span>
                <span className="text-[#3DA9DF] font-semibold group-hover:translate-x-1 transition-transform">
                  Read &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          10. PATIENT TESTIMONIAL SPOTLIGHT (LINK TO /testimonials)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#688D23] text-xs font-semibold">
              <MessageSquareQuote className="w-3.5 h-3.5" />
              <span>Verified Patient Feedback</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#243447]">
              "The 09:00 AM online token system and single queue saved us more than two hours of waiting."
            </h2>
            <p className="text-xs text-[#667085]">
              — Ramesh K. Verma (Tagore Town, Prayagraj) &bull; General Medicine Consultation
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link to="/testimonials">
              <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
                Read All Testimonials Page
              </Button>
            </Link>
            <Link to="/gallery">
              <Button variant="ghost" size="md" className="text-xs text-[#3DA9DF]">
                Explore Campus Gallery &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. PATIENT RESOURCES & FREQUENTLY ASKED QUESTIONS (FAQ)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#91BB40] tracking-wider uppercase">
            Patient Support
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#243447] mt-1">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
            Essential guidelines on OPD timings, token queues, and pathology reports.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl border border-[#E1E8ED] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden"
                  aria-expanded={isOpen}
                >
                  <span className="text-xs sm:text-sm font-bold text-[#243447] flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[#3DA9DF] shrink-0" />
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#667085] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#3DA9DF]' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs text-[#667085] leading-relaxed border-t border-[#E1E8ED]/60">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          12. HOSPITAL LOCATION & CONTACT CARD (LINK TO /contact)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#CBD5E1] p-8 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#243447]">Outpatient Consultation Hours</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                OPD clinics commence daily at <strong>{settings.opdStartTime} AM</strong>. Same-day online booking portal closes strictly at <strong>{settings.onlineCutoffTime} AM IST</strong>.
              </p>
              <div className="text-xs text-[#243447] font-semibold">
                Operating Days: Monday through Saturday
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#688D23]" />
              </div>
              <h3 className="text-base font-bold text-[#243447]">Hospital Address</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                {settings.address}
              </p>
              <div className="text-xs text-[#3DA9DF] font-semibold">
                Centrally located with patient parking &amp; ramp access.
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#243447]">Contact Desks</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                For routine OPD queries, connect with our reception desk. For acute emergencies, call our hotline immediately.
              </p>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-[#667085]">Reception Desk: </span>
                  <a href={`tel:${settings.phone.split(' ')[0]}`} className="text-[#243447] font-bold hover:underline">
                    {settings.phone}
                  </a>
                </div>
                <div>
                  <span className="text-[#667085]">Emergency Hotline: </span>
                  <a href={`tel:${settings.emergencyPhone.split(' ')[0]}`} className="text-red-600 font-bold hover:underline">
                    {settings.emergencyPhone}
                  </a>
                </div>
                <div className="pt-2">
                  <Link to="/contact" className="text-xs font-semibold text-[#3DA9DF] hover:underline">
                    View Full Directions &amp; Inquiry Form &rarr;
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
