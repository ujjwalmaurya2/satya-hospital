import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Baby, 
  Heart, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  PhoneCall, 
  FileText, 
  Activity, 
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';

export const PediatricCare: React.FC = () => {
  const { settings } = useHospital();

  const clinicalServices = [
    {
      title: 'General Pediatric Outpatient Consultation',
      description: 'Diagnosis and clinical management of common childhood illnesses including seasonal fever, viral infections, cough, colds, and pediatric gastrointestinal complaints.',
      icon: <Baby className="w-5 h-5 text-[#168C8C]" />,
      badge: 'Daily OPD',
      accentBg: 'bg-[#E6F5EF]'
    },
    {
      title: 'Growth & Developmental Monitoring',
      description: 'Systematic tracking of physical growth percentiles (height, weight, BMI) and developmental milestones to ensure age-appropriate progression.',
      icon: <Activity className="w-5 h-5 text-[#0E6E8C]" />,
      badge: 'Preventive Care',
      accentBg: 'bg-[#DFF3FA]'
    },
    {
      title: 'Vaccination & Immunization Guidance',
      description: 'Guidance on national and standard pediatric vaccination schedules, vaccine record maintenance, and safe administration protocols.',
      icon: <ShieldCheck className="w-5 h-5 text-[#9A3412]" />,
      badge: 'Immunization Roster',
      accentBg: 'bg-[#FFF0E7]'
    },
    {
      title: 'Childhood Nutrition & Dietary Advice',
      description: 'Evidence-based nutritional counseling for toddlers and growing children, tackling fussy eating, nutritional deficiencies, and healthy growth habits.',
      icon: <Heart className="w-5 h-5 text-[#168C8C]" />,
      badge: 'Parent Counseling',
      accentBg: 'bg-[#E6F5EF]'
    },
    {
      title: 'Respiratory & Seasonal Allergy Care',
      description: 'Clinical evaluation and gentle outpatient management of pediatric asthma, childhood wheezing, and allergic rhinitis in a dust-free clinic setting.',
      icon: <Sparkles className="w-5 h-5 text-[#0E6E8C]" />,
      badge: 'Clinical OPD',
      accentBg: 'bg-[#DFF3FA]'
    },
    {
      title: 'Laboratory Diagnostic Coordination',
      description: 'Seamless integration with in-house Satya Pathology Lab for pediatric blood counts, urine analysis, and rapid reports verified by MD Pathologist.',
      icon: <FileText className="w-5 h-5 text-[#9A3412]" />,
      badge: 'In-House Lab',
      accentBg: 'bg-[#FFF0E7]'
    }
  ];

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Breadcrumb / Pill */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F5EF] text-[#0F6B56] text-xs font-semibold">
            <Baby className="w-3.5 h-3.5 text-[#168C8C]" />
            <span>Pediatric &amp; Adolescent Healthcare &bull; Satya Hospital Prayagraj</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
            Child-Centred Healthcare Designed with Empathy &amp; Medical Rigor
          </h1>
          <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
            Satya Hospital provides dedicated outpatient pediatric care where your child's comfort comes first. Our consulting doctors take the time to listen to parents, conduct gentle examinations, and provide clear clinical guidance.
          </p>
        </div>

        {/* Operating Notice Strip */}
        <div className="bg-[#DFF3FA]/60 border border-[#BCE1F5] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#168C8C] shadow-xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#193247]">
                Pediatric OPD Timings: {settings.opdStartTime} AM Onwards
              </p>
              <p className="text-[11px] text-[#647785]">
                Online queue opens 1 calendar day before appointment date. Online bookings close at {settings.onlineCutoffTime} AM on consultation day.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/book-appointment">
              <Button variant="primary" size="sm">
                Book Consultation
              </Button>
            </Link>
            <a href="tel:+915322900000">
              <Button variant="outline" size="sm" leftIcon={<PhoneCall className="w-3.5 h-3.5" />}>
                Call Desk
              </Button>
            </a>
          </div>
        </div>

        {/* Clinical Services Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#193247]">Specialized Pediatric Services</h2>
            <p className="text-xs text-[#647785] mt-1">
              Verified clinical consultations available during scheduled outpatient hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinicalServices.map((service, idx) => (
              <Card key={idx} className="p-6 border-[#E5ECEF] hover:border-[#168C8C]/50 transition-all duration-200 flex flex-col justify-between hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl ${service.accentBg} flex items-center justify-center shadow-2xs`}>
                      {service.icon}
                    </div>
                    <Badge variant="teal" size="sm">
                      {service.badge}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#193247]">{service.title}</h3>
                    <p className="text-xs text-[#647785] mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-[#E5ECEF] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#168C8C] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Qualified Physician Care
                  </span>
                  <Link to="/book-appointment" className="text-xs font-bold text-[#168C8C] hover:text-[#127272] flex items-center gap-1">
                    Book <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Parent Guidance & Consultation Etiquette */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-6 sm:p-10 border border-[#E5ECEF] shadow-sm">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#168C8C]">
              Parent-Friendly Healthcare Guidance
            </span>
            <h3 className="text-2xl font-bold text-[#193247]">
              Preparing for Your Child's Consultation
            </h3>
            <p className="text-xs sm:text-sm text-[#647785] leading-relaxed">
              We know visiting a doctor can cause apprehension for both children and parents. Here are simple steps to help make the visit calm and effective:
            </p>
            <ul className="space-y-2.5 text-xs text-[#193247]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
                <span><strong>Carry Previous Records:</strong> Bring past prescriptions, vaccination cards, and any recent lab reports.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
                <span><strong>Note Down Symptoms:</strong> Record fever onset times, medication doses already given, and dietary changes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
                <span><strong>Bring a Comfort Toy:</strong> A small favorite blanket or toy helps young children feel secure in the examination room.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
                <span><strong>Shared Queue Transparency:</strong> Online tokens and walk-in registrations are sequenced on the same live roster.</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#E6F5EF]/60 border border-[#C2EADE] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#168C8C] flex items-center justify-center font-bold shadow-xs">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#193247]">
                Clinical Verification &amp; Safety Note
              </h4>
            </div>
            <p className="text-xs text-[#647785] leading-relaxed">
              Satya Hospital provides outpatient consultation services and coordinated diagnostic tests. Doctor availability follows the hospital's registered clinical roster.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link to="/doctors" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  View Doctor Profiles
                </Button>
              </Link>
              <Link to="/book-appointment" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">
                  Book OPD Token
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};