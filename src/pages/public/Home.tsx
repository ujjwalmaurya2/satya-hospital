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
  Heart,
  Baby,
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
  HeartPulse,
  Scale,
  Thermometer,
  Shield,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LottiePlayer } from '../../components/common/LottiePlayer';
import { LottieAssets } from '../../assets/lottie';
import { 
  ScrollReveal, 
  StaggerContainer, 
  StaggerItem, 
  ImageReveal, 
  ParallaxLayer 
} from '../../components/motion';
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
  const { settings, departments, doctors, pathologyTests } = useHospital();
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

  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';

  // Coordinated hero entrance motion variants
  const heroContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const heroItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  };

  // Child-friendly trust strip items
  const trustStripItems = [
    {
      title: 'Child-Centred Care',
      desc: 'Gentle, low-stress examinations designed for young patients',
      icon: <Baby className="w-5 h-5 text-[#3DA9DF]" />,
      bg: 'bg-[#EBF6FC]'
    },
    {
      title: 'Compassionate Medical Team',
      desc: 'Experienced consultants holding verified MD, MS & DNB degrees',
      icon: <Stethoscope className="w-5 h-5 text-[#91BB40]" />,
      bg: 'bg-[#F3F8EC]'
    },
    {
      title: 'Parent-Friendly Appointments',
      desc: 'Transparent sequential queue with convenient T-1 online booking',
      icon: <Clock className="w-5 h-5 text-[#3DA9DF]" />,
      bg: 'bg-[#EBF6FC]'
    },
    {
      title: 'Diagnostic Services',
      desc: 'In-house certified laboratory with rapid MD pathologist verification',
      icon: <Microscope className="w-5 h-5 text-[#91BB40]" />,
      bg: 'bg-[#F3F8EC]'
    }
  ];

  // 6 Pediatric Services Cards
  const pediatricServices = [
    {
      title: 'Pediatric Consultation',
      description: 'Comprehensive outpatient examinations for infant, toddler, and adolescent healthcare, addressing common illnesses, fever, and routine wellness.',
      icon: <Baby className="w-6 h-6 text-[#3DA9DF]" />,
      lottieAsset: LottieAssets.servicePediatrics,
      badge: 'Daily OPD',
      link: '/pediatric-care',
      accentBg: 'bg-[#EBF6FC]',
      borderColor: 'hover:border-[#3DA9DF]/50'
    },
    {
      title: 'Newborn & Infant Care',
      description: 'Specialized checkups for babies up to 12 months, including reflex monitoring, weight velocity tracking, and gentle feeding guidance.',
      icon: <Sparkles className="w-6 h-6 text-[#91BB40]" />,
      lottieAsset: LottieAssets.servicePediatrics,
      badge: 'Infant Wellness',
      link: '/newborn-care',
      accentBg: 'bg-[#F3F8EC]',
      borderColor: 'hover:border-[#91BB40]/50'
    },
    {
      title: 'Child Growth & Development',
      description: 'Regular developmental screenings tracking physical percentiles, cognitive milestones, and pediatric nutritional assessment.',
      icon: <Activity className="w-6 h-6 text-[#3DA9DF]" />,
      lottieAsset: LottieAssets.serviceMedicine,
      badge: 'Developmental Roster',
      link: '/pediatric-care',
      accentBg: 'bg-[#EBF6FC]',
      borderColor: 'hover:border-[#3DA9DF]/50'
    },
    {
      title: 'Vaccination & Immunization',
      description: 'Adherence to certified national and standard immunization protocols with digital record-keeping and clear schedules for parents.',
      icon: <ShieldCheck className="w-6 h-6 text-[#91BB40]" />,
      lottieAsset: LottieAssets.servicePediatrics,
      badge: 'Vaccine Roster',
      link: '/pediatric-care',
      accentBg: 'bg-[#F3F8EC]',
      borderColor: 'hover:border-[#91BB40]/50'
    },
    {
      title: 'Childhood Illness Consultation',
      description: 'Diagnosis and medical care for seasonal respiratory infections, childhood allergies, gastrointestinal colic, and childhood skin conditions.',
      icon: <Heart className="w-6 h-6 text-[#3DA9DF]" />,
      lottieAsset: LottieAssets.serviceMedicine,
      badge: 'Clinical OPD',
      link: '/pediatric-care',
      accentBg: 'bg-[#EBF6FC]',
      borderColor: 'hover:border-[#3DA9DF]/50'
    },
    {
      title: 'Pathology & Diagnostic Tests',
      description: 'Child-friendly blood and urine diagnostic panels conducted in our in-house certified laboratory with two-step pathologist sign-off.',
      icon: <Microscope className="w-6 h-6 text-[#91BB40]" />,
      lottieAsset: LottieAssets.servicePathology,
      badge: 'In-House Lab',
      link: '/pathology-lab',
      accentBg: 'bg-[#F3F8EC]',
      borderColor: 'hover:border-[#91BB40]/50'
    }
  ];

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
      q: 'How should parents prepare for their child\'s first consultation?',
      a: 'Please bring past medical records, birth summary, and current vaccination book. If the child has a favorite small toy, bringing it along can help them feel safe during the physical examination.',
    },
    {
      q: 'How and when can I access my child\'s diagnostic pathology reports?',
      a: 'Once samples are processed by automated analyzers, reports undergo mandatory verification by our Senior Pathologist. Upon sign-off, your digital PDF report is immediately published to your secure Patient Portal and can be downloaded securely.',
    },
    {
      q: 'Is there an upfront consultation fee for booking an online token?',
      a: 'No upfront online payment is currently required. Registration and token reservation are complimentary online; consultation fees are settled directly at the hospital reception desk upon morning arrival.',
    },
  ];

  return (
    <div className="bg-[#FCFDFB] space-y-16 sm:space-y-24 pb-20 overflow-x-hidden">

      {/* =========================================================================
          1. PREMIUM CHILDCARE HERO SECTION
         ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF6FC]/60 via-[#FCFDFB] to-[#FCFDFB] pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-[#E5ECEF]">
        {/* Subtle decorative background shapes with ParallaxLayer */}
        <ParallaxLayer distance={24} className="absolute top-0 right-1/4 w-[480px] h-[480px] pointer-events-none -z-10">
          <div className="w-full h-full bg-[#3DA9DF]/10 rounded-full blur-3xl" />
        </ParallaxLayer>
        <ParallaxLayer distance={16} className="absolute bottom-6 left-10 w-80 h-80 pointer-events-none -z-10">
          <div className="w-full h-full bg-[#F3F8EC] rounded-full blur-2xl" />
        </ParallaxLayer>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Column with coordinated entrance sequence */}
            <motion.div 
              variants={heroContainerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-6 space-y-5 text-center lg:text-left z-10"
            >
              {/* Trust Label */}
              <motion.div variants={heroItemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D5E8BA] text-xs font-bold text-[#486812] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#91BB40] animate-pulse"></span>
                <span>Caring for Little Lives &bull; Satya Hospital Prayagraj</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1 variants={heroItemVariants} className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#193247] leading-[1.18]">
                Expert Care for Your Child. <br className="hidden sm:inline" />
                <span className="text-[#3DA9DF]">Comfort for Your Family.</span>
              </motion.h1>

              {/* Supporting Text */}
              <motion.p variants={heroItemVariants} className="text-sm sm:text-base text-[#647785] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Satya Hospital provides structured pediatric consultations, gentle newborn wellness care, and certified in-house diagnostic pathology. Designed to make doctor visits reassuring for children and straightforward for parents.
              </motion.p>

              {/* Operational Status Card */}
              <motion.div variants={heroItemVariants} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#CBD7DD] shadow-xs max-w-lg mx-auto lg:mx-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] flex items-center justify-center text-[#3DA9DF] shrink-0 border border-[#BCE1F5]">
                    <Clock className="w-4 h-4 text-[#3DA9DF]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#193247]">Outpatient Consultation Hours</div>
                    <div className="text-[11px] text-[#647785]">
                      Starts at 09:30 AM &bull; Same-day cutoff: <strong className="text-[#193247]">{settings.onlineCutoffTime} AM IST</strong>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant="teal" size="sm" dot>
                    Intake Open
                  </Badge>
                </div>
              </motion.div>

              {/* CTAs */}
              <motion.div variants={heroItemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                <Link to="/book-appointment" className="w-full sm:w-auto">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    leftIcon={<Calendar className="w-5 h-5" />}
                    className="w-full sm:w-auto font-bold shadow-xs hover:shadow-md transition-shadow active:scale-[0.98]"
                  >
                    Book an Appointment
                  </Button>
                </Link>

                <a href={`tel:${phoneRaw}`} className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    leftIcon={<PhoneCall className="w-5 h-5 text-[#3DA9DF]" />}
                    className="w-full sm:w-auto font-semibold active:scale-[0.98]"
                  >
                    Call the Hospital
                  </Button>
                </a>
              </motion.div>

              {/* Small Tasteful Trust Element */}
              <motion.div variants={heroItemVariants} className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs font-medium text-[#647785]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                  <span>Child-Friendly Consultation Space</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3DA9DF] shrink-0" />
                  <span>Sequential Fair Queue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                  <span>Civil Lines Campus</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column: High-Res Photorealistic Pediatric Hero Visual with subtle entrance & zoom */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-[#193247]/8 border border-[#CBD7DD] bg-white group">
                <img 
                  src="/images/pediatric-hero.jpg" 
                  alt="Friendly Indian pediatrician gently examining young child with mother in clean modern consultation clinic" 
                  className="w-full h-[320px] sm:h-[400px] lg:h-[430px] object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  loading="eager"
                />

                {/* Subtle natural lighting vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#193247]/80 via-[#193247]/15 to-transparent pointer-events-none" />

                {/* Top Badge: Verified Clinical Team with Pediatric Heartbeat Pulse */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/70 text-[11px] font-bold text-[#193247] flex items-center gap-2 shadow-xs">
                  <LottiePlayer
                    animationData={LottieAssets.pediatricHeroPulse}
                    width={18}
                    height={18}
                    loop={true}
                    autoplay={true}
                    ariaLabel="Pediatric Pulse Monitor"
                    fallback={<Heart className="w-3.5 h-3.5 text-[#3DA9DF]" />}
                  />
                  <span>Compassionate Care</span>
                </div>

                {/* Bottom Identifier Card */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/60 text-[#193247] shadow-md space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold flex items-center gap-2 text-[#193247]">
                      <span className="w-2 h-2 rounded-full bg-[#3DA9DF]"></span>
                      <span>Satya Hospital &amp; Pathology</span>
                    </span>
                    <span className="text-[10px] text-[#486812] font-bold bg-[#F3F8EC] px-2 py-0.5 rounded-full border border-[#D5E8BA]">
                      Pediatric Wing
                    </span>
                  </div>
                  <p className="text-[11px] text-[#647785] leading-snug">
                    Child Outpatient Clinics &bull; Newborn Assessment &bull; In-House Lab &bull; Civil Lines, Prayagraj
                  </p>
                </div>
              </div>
            </motion.div>

          </div>

          {/* =========================================================================
              QUICK OPD TOKEN RESERVATION MODULE
             ========================================================================= */}
          <ScrollReveal direction="up" delay={0.12} distance={18}>
            <div className="mt-8 sm:mt-12 bg-white rounded-2xl sm:rounded-3xl border border-[#CBD7DD] p-5 sm:p-6 shadow-xs relative z-20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-[#E5ECEF] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold overflow-hidden border border-[#BCE1F5]">
                    <LottiePlayer
                      animationData={LottieAssets.appointmentCalendar}
                      width={22}
                      height={22}
                      loop={true}
                      autoplay={true}
                      ariaLabel="Token Calendar Indicator"
                      fallback={<HeartPulse className="w-4 h-4 text-[#3DA9DF]" />}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#193247]">Quick OPD Token Reservation</h3>
                    <p className="text-[11px] text-[#647785]">Reserve your sequential consultation token online &bull; Complimentary reservation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="teal" size="sm" dot>
                    Queue Open
                  </Badge>
                  <Badge variant="sky-blue" size="sm">
                    Same-Day Cutoff: {settings.onlineCutoffTime} AM
                  </Badge>
                </div>
              </div>

              <form onSubmit={handleHeroBookingSubmit} className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs items-end">
                <div>
                  <label className="block font-bold text-[#193247] mb-1">
                    1. Clinical Department
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#647785] absolute left-3 top-2.5 pointer-events-none" />
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
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD7DD] text-[#193247] text-xs font-medium focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                    >
                      <option value="all">All Departments ({departments.length})</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#193247] mb-1">
                    2. Consulting Doctor
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-4 h-4 text-[#647785] absolute left-3 top-2.5 pointer-events-none" />
                    <select
                      value={heroDoctorId}
                      onChange={(e) => setHeroDoctorId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD7DD] text-[#193247] text-xs font-medium focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                    >
                      {availableDoctorsForHero.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.fullName} ({doc.department.split(' ')[0]})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#193247] mb-1">
                    3. Appointment Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#647785] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="date"
                      min={getHospitalTodayDate()}
                      value={heroDate}
                      onChange={(e) => setHeroDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD7DD] text-[#193247] text-xs font-medium focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full font-bold shadow-xs justify-center py-2"
                    disabled={!heroCutoffStatus.allowed}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue Booking &rarr;
                  </Button>
                </div>
              </form>

              {!heroCutoffStatus.allowed && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>Online Booking Closed for Selected Date:</strong> {heroCutoffStatus.reason}</span>
                  </div>
                  {heroCutoffStatus.nextEligibleDate && (
                    <button
                      type="button"
                      onClick={() => setHeroDate(heroCutoffStatus.nextEligibleDate!)}
                      className="text-[#3DA9DF] font-bold underline cursor-pointer"
                    >
                      Switch to next eligible date ({heroCutoffStatus.nextEligibleDate}) &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* =========================================================================
          2. CHILD-FRIENDLY TRUST STRIP
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StaggerContainer staggerDelay={0.07} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trustStripItems.map((item, idx) => (
            <StaggerItem key={idx} hoverLift className="h-full">
              <div className="bg-white p-5 rounded-2xl border border-[#E5ECEF] shadow-xs flex items-start gap-3.5 hover:border-[#3DA9DF]/40 transition-colors h-full">
                <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[#193247]">{item.title}</h4>
                  <p className="text-[11px] text-[#647785] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* =========================================================================
          3. PEDIATRIC SERVICES SECTION: "Healthcare Designed Around Your Child"
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <ScrollReveal direction="up" distance={16}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-bold mb-2 border border-[#BCE1F5]">
                <Baby className="w-3.5 h-3.5 text-[#3DA9DF]" />
                <span>Pediatric &amp; Family Disciplines</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] tracking-tight">
                Healthcare Designed Around Your Child
              </h2>
              <p className="text-xs sm:text-sm text-[#647785] mt-1.5 max-w-xl leading-relaxed">
                From newborn wellness and routine immunization to pediatric illness diagnosis and clinical diagnostics in Prayagraj.
              </p>
            </div>
            <Link to="/pediatric-care" className="shrink-0">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
                Explore Pediatric Care Page
              </Button>
            </Link>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.06} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pediatricServices.map((service, idx) => (
            <StaggerItem key={idx} hoverLift className="h-full">
              <div className={`bg-white rounded-2xl border border-[#E5ECEF] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full ${service.borderColor} group`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl ${service.accentBg} flex items-center justify-center shadow-2xs overflow-hidden group-hover:scale-105 transition-transform duration-200`}>
                      {service.lottieAsset ? (
                        <LottiePlayer
                          animationData={service.lottieAsset}
                          width={32}
                          height={32}
                          loop={true}
                          autoplay={false}
                          triggerOnHover={true}
                          ariaLabel={service.title}
                          fallback={service.icon}
                        />
                      ) : (
                        service.icon
                      )}
                    </div>
                    <Badge variant={idx % 2 === 0 ? 'medical-blue' : 'lime-green'} size="sm">
                      {service.badge}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#193247] group-hover:text-[#3DA9DF] transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs text-[#647785] mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E5ECEF] flex items-center justify-between">
                  <Link to={service.link} className="text-xs font-bold text-[#3DA9DF] hover:text-[#2B92C4] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link to="/book-appointment">
                    <span className="text-[11px] font-semibold text-[#647785] hover:text-[#193247]">
                      Book Token &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* =========================================================================
          4. ABOUT SATYA HOSPITAL (EDITORIAL 2-COLUMN WITH AUTHENTIC PHOTOGRAPHY)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#CBD7DD] p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Visual Column */}
            <div className="lg:col-span-5">
              <ScrollReveal direction="right" delay={0.08}>
                <div className="relative rounded-2xl overflow-hidden border border-[#E5ECEF] bg-[#FCFDFB] group shadow-xs">
                  <ImageReveal 
                    src="/images/newborn-care.jpg" 
                    alt="Infant routine checkup at Satya Hospital"
                    aspectRatio="4/3"
                    className="w-full h-72 sm:h-80"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-white/60 text-xs text-[#193247] shadow-xs flex items-center justify-between z-10">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#91BB40]" />
                      <span>Civil Lines Campus</span>
                    </span>
                    <span className="text-[11px] text-[#647785]">Prayagraj, UP</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Content Column */}
            <div className="lg:col-span-7">
              <ScrollReveal direction="left" delay={0.12} className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] border border-[#D5E8BA] text-[#486812] text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-[#91BB40]" />
                  <span>About Satya Hospital &amp; Pathology</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] tracking-tight">
                  Compassionate Pediatric &amp; Family Care Rooted in Clinical Ethics
                </h2>
                <p className="text-xs sm:text-sm text-[#647785] leading-relaxed">
                  Satya Hospital is an established healthcare facility in Civil Lines, Prayagraj, committed to compassionate outpatient care and diagnostic accuracy. Our pediatric consultations focus on gentle medical assessments where doctors take the time to answer parents' questions thoroughly.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#FCFDFB] border border-[#E5ECEF] space-y-1">
                    <span className="font-bold text-[#193247] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3DA9DF]" />
                      Hygienic Clinical Environment
                    </span>
                    <p className="text-[#647785] text-[11px]">Clean consultation rooms, sanitized infant examination areas, and low-stress waiting spaces.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FCFDFB] border border-[#E5ECEF] space-y-1">
                    <span className="font-bold text-[#193247] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#91BB40]" />
                      Fair Single Queue
                    </span>
                    <p className="text-[#647785] text-[11px]">Online appointments and walk-in patients are called strictly sequentially without skipping.</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link to="/about">
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Read Hospital Mission &amp; Overview
                    </Button>
                  </Link>
                  <Link to="/facilities">
                    <Button variant="ghost" size="sm" className="text-xs text-[#3DA9DF]">
                      View Campus Facilities &rarr;
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          5. MEET THE DOCTOR / MEDICAL TEAM (VERIFIED PROFILES)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <ScrollReveal direction="up" distance={16}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#3DA9DF] tracking-wider uppercase">
                Medical Practitioners Directory
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] mt-1">
                Consulting Medical Faculty
              </h2>
              <p className="text-xs sm:text-sm text-[#647785] mt-1.5 max-w-xl leading-relaxed">
                Consult with verified medical specialists holding certified postgraduate degrees (MD, MS, DNB) in Prayagraj.
              </p>
            </div>
            <Link to="/doctors">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
                Full Doctor Roster ({doctors.length})
              </Button>
            </Link>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.07} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <StaggerItem key={doc.id} hoverLift className="h-full">
              <Card className="p-6 border-[#E5ECEF] hover:border-[#3DA9DF]/50 transition-all flex flex-col justify-between hover:shadow-md h-full">
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3DA9DF]/15 to-[#EBF6FC] flex items-center justify-center text-[#3DA9DF] font-bold text-base border border-[#BCE1F5] shrink-0">
                      {doc.fullName.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#486812] bg-[#F3F8EC] border border-[#D5E8BA] px-2 py-0.5 rounded-full mb-1">
                        <BadgeCheck className="w-3 h-3 text-[#91BB40]" />
                        <span>OPD Available</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#193247] leading-snug">
                        {doc.fullName}
                      </h3>
                      <p className="text-[11px] font-medium text-[#3DA9DF]">
                        {doc.designation}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs py-3 border-y border-[#E5ECEF] text-[#647785]">
                    <div className="flex items-center justify-between">
                      <span>Qualifications:</span>
                      <strong className="text-[#193247] font-semibold">{doc.qualifications}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Department:</span>
                      <strong className="text-[#193247] font-semibold">{doc.department}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chamber:</span>
                      <span className="text-[#193247] font-medium">{doc.consultationRoom}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <Link to={`/book-appointment?doctor=${doc.id}`} className="block w-full">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-full text-xs font-bold"
                      leftIcon={<Calendar className="w-3.5 h-3.5" />}
                    >
                      Book with {doc.fullName.split(' ')[1] || doc.fullName}
                    </Button>
                  </Link>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* =========================================================================
          6. PATHOLOGY & DIAGNOSTIC LAB SECTION (TITANITE GREEN & MEDICAL BLUE ACCENTS)
         ========================================================================= */}
      <section className="bg-[#EBF6FC]/40 py-14 sm:py-18 border-y border-[#BCE1F5]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5">
              <ScrollReveal direction="right" delay={0.08} className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#D5E8BA] text-[#486812] text-xs font-bold shadow-2xs">
                  <Microscope className="w-3.5 h-3.5 text-[#91BB40]" />
                  <span>In-House Diagnostic Laboratory</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] leading-tight">
                  Certified Clinical Pathology <br />
                  <span className="text-[#91BB40]">For Children &amp; Adults</span>
                </h2>

                <p className="text-xs sm:text-sm text-[#647785] leading-relaxed">
                  Satya Hospital operates an on-premises automated clinical laboratory. Blood, serum, and urine diagnostics are handled with dedicated micro-sampling techniques for pediatric patients and verified by a qualified Pathologist.
                </p>

                <div className="space-y-3 pt-1 text-xs text-[#193247]">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#193247]">Gentle Pediatric Blood Draw:</strong>
                      <span className="text-[#647785]">Trained phlebotomists using fine micro-needles and supportive techniques to minimize child distress.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#193247]">Two-Step Pathologist Sign-Off:</strong>
                      <span className="text-[#647785]">Every report undergoes mandatory verification before publication to the secure Patient Portal.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <Link to="/pathology-lab">
                    <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Explore Pathology Tests &rarr;
                    </Button>
                  </Link>
                  <Link to="/patient/reports">
                    <Button variant="outline" size="md" leftIcon={<FileText className="w-4 h-4 text-[#3DA9DF]" />}>
                      Access My Reports
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-7">
              <ScrollReveal direction="left" delay={0.12}>
                <div className="bg-white rounded-2xl border border-[#CBD7DD] shadow-sm divide-y divide-[#E5ECEF] overflow-hidden">
                  <div className="p-4 bg-[#FCFDFB] flex items-center justify-between border-b border-[#E5ECEF]">
                    <span className="text-xs font-bold text-[#193247] uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#3DA9DF]" />
                      <span>Frequently Prescribed Diagnostic Panels</span>
                    </span>
                    <span className="text-[11px] text-[#647785]">Hospital In-House Rates</span>
                  </div>

                  {pathologyTests.slice(0, 4).map((test) => (
                    <div key={test.id} className="p-4 flex items-center justify-between hover:bg-[#FCFDFB] transition-colors">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-[#193247]">{test.name}</div>
                        <div className="text-xs text-[#647785] flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#F3F8EC] text-[10px] font-bold text-[#486812] border border-[#D5E8BA]">
                            {test.category}
                          </span>
                          <span>Specimen: {test.specimenType}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-4">
                        <div className="text-base font-extrabold text-[#193247]">₹{test.price}</div>
                        <span className="text-[10px] text-[#486812] font-bold bg-[#F3F8EC] border border-[#D5E8BA] px-2 py-0.5 rounded-full inline-block mt-0.5">
                          Available Daily
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="p-3.5 bg-[#FCFDFB] text-center text-xs text-[#647785] flex items-center justify-center gap-2">
                    <span>Sample collection open daily from <strong>08:00 AM to 02:00 PM</strong>.</span>
                    <Link to="/pathology-lab" className="text-[#3DA9DF] font-bold hover:underline">
                      View All ({pathologyTests.length}) Tests &rarr;
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PARENT-FOCUSED INFORMATION SECTION
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <ScrollReveal direction="up" distance={16}>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-bold mb-2 border border-[#BCE1F5]">
              <Heart className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>Parent Guidance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] tracking-tight">
              Helpful Information for Parents
            </h2>
            <p className="text-xs sm:text-sm text-[#647785] mt-1.5 leading-relaxed">
              Essential steps to make your child's medical appointments, vaccination records, and test results organized and stress-free.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StaggerItem hoverLift className="h-full">
            <div className="bg-white p-6 rounded-2xl border border-[#E5ECEF] shadow-xs space-y-3 h-full">
              <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-[#193247]">Preparing for Consultation</h3>
              <p className="text-xs text-[#647785] leading-relaxed">
                Note down fever timelines, current medications, appetite changes, and bring the child's immunization booklet to facilitate an accurate clinical evaluation.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem hoverLift className="h-full">
            <div className="bg-white p-6 rounded-2xl border border-[#E5ECEF] shadow-xs space-y-3 h-full">
              <div className="w-10 h-10 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-[#193247]">Keeping Vaccine Records</h3>
              <p className="text-xs text-[#647785] leading-relaxed">
                Timely childhood vaccines protect against serious illnesses. Our clinic verifies your child’s immunization record at every wellness visit and guides on overdue doses.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem hoverLift className="h-full">
            <div className="bg-white p-6 rounded-2xl border border-[#E5ECEF] shadow-xs space-y-3 h-full">
              <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-[#193247]">Online Report Access</h3>
              <p className="text-xs text-[#647785] leading-relaxed">
                No need to wait at the lab for printed sheets. All verified pathology reports can be downloaded in PDF format directly through your registered patient phone number.
              </p>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* =========================================================================
          8. FREQUENTLY ASKED QUESTIONS (FAQ)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up" distance={16}>
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#3DA9DF] tracking-wider uppercase">
              Parent Support
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] mt-1">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#647785] mt-1.5 leading-relaxed">
              Essential guidelines on pediatric OPD timings, token queues, and pathology reports.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <div className="space-y-3">
            {faqItems.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-xl border border-[#E5ECEF] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden"
                    aria-expanded={isOpen}
                  >
                    <span className="text-xs sm:text-sm font-bold text-[#193247] flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-[#3DA9DF] shrink-0" />
                      <span>{item.q}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#647785] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#3DA9DF]' : ''}`} />
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
                        <div className="px-5 pb-5 pt-1 text-xs text-[#647785] leading-relaxed border-t border-[#E5ECEF]">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </section>

      {/* =========================================================================
          9. HOSPITAL LOCATION & CONTACT CARD
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up" distance={20}>
          <div className="bg-white rounded-3xl border border-[#CBD7DD] p-8 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#193247]">OPD Consultation Hours</h3>
                <p className="text-xs text-[#647785] leading-relaxed">
                  Clinics start daily at <strong>{settings.opdStartTime} AM</strong>. Same-day online booking portal closes strictly at <strong>{settings.onlineCutoffTime} AM IST</strong>.
                </p>
                <div className="text-xs text-[#193247] font-semibold">
                  Operating Days: Monday through Saturday
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#193247]">Hospital Address</h3>
                <p className="text-xs text-[#647785] leading-relaxed">
                  {settings.address}
                </p>
                <div className="text-xs text-[#3DA9DF] font-semibold">
                  Civil Lines campus with ramp and stroller accessibility.
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#193247]">Hospital Contacts</h3>
                <p className="text-xs text-[#647785] leading-relaxed">
                  For routine OPD queries, connect with our reception desk. For acute emergencies, call our hotline immediately.
                </p>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-[#647785]">Reception Desk: </span>
                    <a href={`tel:${phoneRaw}`} className="text-[#193247] font-bold hover:underline">
                      {phoneRaw}
                    </a>
                  </div>
                  <div>
                    <span className="text-[#647785]">Emergency Hotline: </span>
                    <a href={`tel:${settings.emergencyPhone.split(' ')[0]}`} className="text-amber-700 font-bold hover:underline">
                      {settings.emergencyPhone}
                    </a>
                  </div>
                  <div className="pt-2">
                    <Link to="/contact" className="text-xs font-bold text-[#3DA9DF] hover:underline">
                      View Full Directions &amp; Inquiry Form &rarr;
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </ScrollReveal>
      </section>

    </div>
  );
};