import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  HeartHandshake, 
  Clock, 
  Activity, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  Baby,
  Heart,
  Sparkles,
  PhoneCall,
  Calendar
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { 
  ScrollReveal, 
  StaggerContainer, 
  StaggerItem, 
  ImageReveal 
} from '../../components/motion';
import { useHospital } from '../../context/HospitalContext';

export const About: React.FC = () => {
  const { settings } = useHospital();
  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Intro Hero */}
        <ScrollReveal direction="up" distance={16}>
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#486812] text-xs font-bold border border-[#D5E8BA]">
              <Building2 className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>About Satya Hospital &amp; Pathology &bull; Prayagraj</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
              Compassionate Pediatric &amp; Family Healthcare Rooted in Clinical Precision
            </h1>
            <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
              Satya Hospital was established in Civil Lines, Prayagraj, to provide structured, ethical outpatient pediatric care, newborn wellness monitoring, and high-precision diagnostic pathology. We combine experienced medical practitioners with modern digital queue management and secure health record access.
            </p>
          </div>
        </ScrollReveal>

        {/* Hospital Campus Visual Banner */}
        <ScrollReveal direction="up" delay={0.08} distance={20}>
          <div className="relative rounded-3xl overflow-hidden border border-[#CBD7DD] shadow-sm bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 p-6 sm:p-10 space-y-4">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#3DA9DF] block">
                  Civil Lines Campus &bull; Prayagraj
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#193247]">
                  Modern, Child-Friendly Healthcare Facility
                </h2>
                <p className="text-xs sm:text-sm text-[#647785] leading-relaxed">
                  Our central facility features dedicated outpatient consultation chambers, an in-house automated pathology laboratory, step-free wheelchair and stroller access, and quiet waiting spaces designed for children and families.
                </p>
                
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link to="/facilities">
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Explore Facilities &rarr;
                    </Button>
                  </Link>
                  <Link to="/book-appointment">
                    <Button variant="outline" size="sm">
                      Book OPD Token
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 h-72 sm:h-80 lg:h-96 relative overflow-hidden bg-[#FCFDFB]">
                <ImageReveal 
                  src="/images/satya-hospital-building.jpg" 
                  alt="Satya Hospital Campus in Prayagraj" 
                  className="w-full h-full"
                  imageClassName="object-cover object-[55%_35%]"
                  priority
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#193247]/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-bold flex items-center justify-between z-10">
                    <span>Civil Lines Road, Prayagraj</span>
                    <span className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">Active Facility</span>
                  </div>
                </ImageReveal>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Hospital Identity & Founding Principles */}
        <StaggerContainer staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StaggerItem hoverLift className="h-full">
            <Card className="p-6 space-y-3 border-[#E5ECEF] hover:border-[#3DA9DF]/50 transition-colors h-full">
              <div className="w-10 h-10 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center font-bold">
                <Baby className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#193247]">Child &amp; Family Centred</h3>
              <p className="text-xs text-[#647785] leading-relaxed">
                We prioritize gentle examinations and clear medical explanations. Doctors dedicate time to listen to parental concerns, review childhood symptoms, and explain treatment plans simply.
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem hoverLift className="h-full">
            <Card className="p-6 space-y-3 border-[#E5ECEF] hover:border-[#3DA9DF]/50 transition-colors h-full">
              <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#193247]">Zero Fabricated Claims</h3>
              <p className="text-xs text-[#647785] leading-relaxed">
                We adhere strictly to factual healthcare reporting. All laboratory reports undergo certified pathologist verification, and patient records are safeguarded under India's DPDP Act.
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem hoverLift className="h-full">
            <Card className="p-6 space-y-3 border-[#E5ECEF] hover:border-[#3DA9DF]/50 transition-colors h-full">
              <div className="w-10 h-10 rounded-xl bg-[#FFF0E7] text-[#9A3412] flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#193247]">Queue Transparency</h3>
              <p className="text-xs text-[#647785] leading-relaxed">
                Our shared daily queue ensures online bookings and hospital reception walk-ins share one single, predictable token sequence, preventing overcrowding and respect for family time.
              </p>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Facilities Overview */}
        <ScrollReveal direction="up" distance={16}>
          <div className="bg-white rounded-3xl border border-[#CBD7DD] p-8 sm:p-12 shadow-xs">
            <div className="max-w-2xl mb-8">
              <h2 className="text-2xl font-bold text-[#193247]">Clinical Facilities &amp; Standards</h2>
              <p className="text-xs sm:text-sm text-[#647785] mt-1">
                Our infrastructure is optimized for pediatric hygiene, patient comfort, and rapid diagnostic workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#193247]">Modern Consultation Chambers</h4>
                  <p className="text-xs text-[#647785] mt-0.5">Spacious, private examination chambers equipped for clinical consultations.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#193247]">Calibrated Auto-Analyzers</h4>
                  <p className="text-xs text-[#647785] mt-0.5">Automated biochemistry and hematology analyzers with daily internal quality controls.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#193247]">Secure Digital Health Records</h4>
                  <p className="text-xs text-[#647785] mt-0.5">Immediate scanning of prescriptions and secure PDF delivery via Patient Portal.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#193247]">Stroller &amp; Ramp Accessibility</h4>
                  <p className="text-xs text-[#647785] mt-0.5">Step-free entrance and accessible reception desk for parents with baby strollers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#193247]">Air-Conditioned Waiting Spaces</h4>
                  <p className="text-xs text-[#647785] mt-0.5">Real-time digital token display screens so families know their exact turn.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#193247]">Dedicated Reception Desk</h4>
                  <p className="text-xs text-[#647785] mt-0.5">Helpful staff to assist walk-in parents, register infants, and clarify token status.</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Call to Action */}
        <ScrollReveal direction="up" distance={16}>
          <div className="bg-[#193247] text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-white">Have Questions or Need an OPD Token?</h3>
              <p className="text-xs text-white/70">
                Book online before {settings.onlineCutoffTime} AM or visit our reception desk from 09:30 AM onwards.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/book-appointment">
                <Button variant="primary" size="md" className="font-bold">
                  Book OPD Slot
                </Button>
              </Link>
              <a href={`tel:${phoneRaw}`}>
                <Button variant="outline" size="md" className="bg-transparent text-white border-white/40 hover:bg-white/10">
                  Call Reception
                </Button>
              </a>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </div>
  );
};