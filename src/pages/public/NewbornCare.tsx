import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Baby, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  PhoneCall, 
  Sparkles, 
  AlertCircle,
  FileText,
  Thermometer,
  Scale
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';

export const NewbornCare: React.FC = () => {
  const { settings } = useHospital();

  const newbornServices = [
    {
      title: 'Neonatal & Infant Physical Assessment',
      description: 'Systematic examination of newborn reflexes, muscle tone, heart sounds, respiratory rhythm, and neonatal abdominal palpation by our medical consultant.',
      icon: <Baby className="w-5 h-5 text-[#168C8C]" />,
      badge: 'Infant Wellness'
    },
    {
      title: 'Weight Gain & Growth Velocity Tracking',
      description: 'Sensitive infant weighing and length tracking to monitor postnatal weight stabilization, expected growth velocity, and nutritional adequacy.',
      icon: <Scale className="w-5 h-5 text-[#0E6E8C]" />,
      badge: 'Growth Velocity'
    },
    {
      title: 'Newborn Jaundice (Hyperbilirubinemia) Assessment',
      description: 'Clinical evaluation of infant sclera and skin coloration, paired with same-day serum bilirubin testing via Satya Pathology Lab if indicated.',
      icon: <Thermometer className="w-5 h-5 text-[#9A3412]" />,
      badge: 'Diagnostic Review'
    },
    {
      title: 'Infant Feeding & Lactation Guidance',
      description: 'Supportive counseling on effective latching, feeding frequency, burping techniques, and addressing common newborn feeding challenges.',
      icon: <Heart className="w-5 h-5 text-[#168C8C]" />,
      badge: 'Maternal Support'
    },
    {
      title: 'Umbilical Cord & Delicate Skin Care',
      description: 'Hygienic cord stump evaluation, safe cleansing routines, and gentle treatment for newborn diaper dermatitis and cradle cap.',
      icon: <Sparkles className="w-5 h-5 text-[#0E6E8C]" />,
      badge: 'Hygienic Care'
    },
    {
      title: 'Primary Infant Immunization Protocol',
      description: 'Clear immunization tracking adhering to certified timelines (BCG, Hepatitis B, OPV, Pentavalent, Rotavirus, PCV) with record maintenance.',
      icon: <ShieldCheck className="w-5 h-5 text-[#9A3412]" />,
      badge: 'National Schedule'
    }
  ];

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Breadcrumb / Pill */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F5EF] text-[#0F6B56] text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-[#168C8C]" />
            <span>Newborn &amp; Infant Healthcare Clinic &bull; Satya Hospital Prayagraj</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
            Gentle Care for Your Newborn. Peace of Mind for Parents.
          </h1>
          <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
            The first months of a child’s life require gentle touch, meticulous clinical observation, and compassionate reassurance for parents. Satya Hospital provides clinical consultations tailored specifically for babies up to 12 months.
          </p>
        </div>

        {/* Feature Hero Image Section */}
        <div className="relative rounded-3xl overflow-hidden border border-[#E5ECEF] shadow-sm bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 p-6 sm:p-10 space-y-5">
              <Badge variant="teal" size="sm">
                Dedicated Infant Consultation Room
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247] leading-tight">
                Hygienic, Calm &amp; Reassuring Newborn Examinations
              </h2>
              <p className="text-xs sm:text-sm text-[#647785] leading-relaxed">
                Our examination spaces are sanitized, temperature-regulated, and equipped with calibrated infant scales and diagnostic tools. We focus on low-stress assessments where mothers and fathers are right by their baby’s side.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-[#193247] font-medium bg-[#FCFDFB] p-2.5 rounded-xl border border-[#E5ECEF]">
                  <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0" />
                  <span>Sanitized Infant Examination Mats</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#193247] font-medium bg-[#FCFDFB] p-2.5 rounded-xl border border-[#E5ECEF]">
                  <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0" />
                  <span>Calibrated Digital Baby Weighing</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#193247] font-medium bg-[#FCFDFB] p-2.5 rounded-xl border border-[#E5ECEF]">
                  <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0" />
                  <span>Verified Consultant Physician</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#193247] font-medium bg-[#FCFDFB] p-2.5 rounded-xl border border-[#E5ECEF]">
                  <CheckCircle2 className="w-4 h-4 text-[#168C8C] shrink-0" />
                  <span>Same-Day Lab Reports Available</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Link to="/book-appointment">
                  <Button variant="primary" size="md" leftIcon={<Calendar className="w-4 h-4" />}>
                    Book Newborn OPD Token
                  </Button>
                </Link>
                <a href="tel:+915322900000">
                  <Button variant="outline" size="md" leftIcon={<PhoneCall className="w-4 h-4" />}>
                    Call Hospital Reception
                  </Button>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 h-72 sm:h-96 lg:h-full relative overflow-hidden bg-[#E6F5EF]/30">
              <img 
                src="/images/newborn-care.jpg" 
                alt="Pediatrician conducting gentle newborn infant examination at Satya Hospital"
                className="w-full h-full object-cover object-center"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#193247]/30 via-transparent to-transparent lg:hidden" />
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#193247]">Core Newborn Outpatient Disciplines</h2>
            <p className="text-xs text-[#647785] mt-1">
              Available during daily hospital OPD schedules with transparent token queuing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newbornServices.map((service, idx) => (
              <Card key={idx} className="p-6 border-[#E5ECEF] hover:border-[#168C8C]/50 transition-all duration-200 flex flex-col justify-between hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#E6F5EF] flex items-center justify-center shadow-2xs">
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
                    <CheckCircle2 className="w-3.5 h-3.5" /> Clinical Safety Checked
                  </span>
                  <Link to="/book-appointment" className="text-xs font-bold text-[#168C8C] hover:text-[#127272]">
                    Book Token
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Routine Milestone & Warning Signs Notice */}
        <div className="bg-[#FFF0E7]/60 border border-[#FCD5C1] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-[#9A3412]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Clinical Advisory &bull; Immediate In-Person Care for Infants
            </h3>
          </div>
          <p className="text-xs text-[#647785] leading-relaxed">
            If your newborn develops a rectal/axillary temperature above 100.4&deg;F (38&deg;C), refuses multiple consecutive feeds, shows significant lethargy, sunken fontanelles, or rapid grunting breathing, do not wait for an online OPD slot. Please seek immediate physical medical attention at the emergency desk or nearest advanced neonatal center.
          </p>
        </div>

      </div>
    </div>
  );
};