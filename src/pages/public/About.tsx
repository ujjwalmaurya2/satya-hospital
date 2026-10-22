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
  ArrowRight 
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useHospital } from '../../context/HospitalContext';

export const About: React.FC = () => {
  const { settings } = useHospital();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      {/* Intro Hero */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Building2 className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>About Satya Hospital &amp; Pathology</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243447] tracking-tight">
          Compassionate Healthcare Rooted in Clinical Precision &amp; Transparency
        </h1>
        <p className="text-base text-[#667085] leading-relaxed">
          Satya Hospital was established to provide structured, ethical outpatient healthcare and high-precision diagnostic pathology. We combine experienced medical practitioners with modern digital queue management and secure health record access.
        </p>
      </div>

      {/* Hospital Campus Visual Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#CBD5E1] shadow-lg">
        <img 
          src="/images/satya-hospital-building.jpg" 
          alt="Satya Hospital Campus in Prayagraj" 
          className="w-full h-64 sm:h-80 lg:h-96 object-cover object-[55%_35%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#243447]/85 via-transparent to-black/20" />
        <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#91BB40] block mb-1">
              Civil Lines Campus &bull; Prayagraj
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              Satya Hospital &amp; Pathology Facility
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
              Equipped with modern outpatient chambers, calibrated auto-analyzers, and patient ramp access.
            </p>
          </div>
          <Link to="/facilities">
            <Button variant="accent" size="sm" className="font-semibold shrink-0">
              Explore Facilities &rarr;
            </Button>
          </Link>
        </div>
      </div>

      {/* Hospital Identity & Founding Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-3 border-[#CBD5E1]">
          <div className="w-10 h-10 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#243447]">Patient-Centric Mission</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Delivering accessible, evidence-based outpatient consultations where patients receive adequate consultation time, clear explanations, and verified prescriptions.
          </p>
        </Card>

        <Card className="p-6 space-y-3 border-[#CBD5E1]">
          <div className="w-10 h-10 rounded-lg bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#688D23]" />
          </div>
          <h3 className="text-base font-bold text-[#243447]">Zero Fabricated Claims</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            We adhere strictly to factual healthcare reporting. All laboratory reports undergo certified pathologist verification, and patient records are safeguarded under India's DPDP Act.
          </p>
        </Card>

        <Card className="p-6 space-y-3 border-[#CBD5E1]">
          <div className="w-10 h-10 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#243447]">Queue Transparency</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Our daily capacity model ensures online bookings and hospital reception walk-ins share one single, predictable queue, preventing overcrowding and respect for patient time.
          </p>
        </Card>
      </div>

      {/* Facilities Overview */}
      <div className="bg-white rounded-2xl border border-[#E1E8ED] p-8 sm:p-12">
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl font-bold text-[#243447]">Clinical Facilities &amp; Infrastructure</h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Our facility is designed for patient comfort, infection control, and rapid diagnostic workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#243447]">Modern OPD Consultation Rooms</h4>
              <p className="text-xs text-[#667085] mt-0.5">Spacious, private examination chambers equipped for clinical consultations.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#243447]">Calibrated Auto-Analyzers</h4>
              <p className="text-xs text-[#667085] mt-0.5">Automated biochemistry and hematology analyzers with daily quality control runs.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#243447]">Patient Record Digitisation</h4>
              <p className="text-xs text-[#667085] mt-0.5">Immediate scanning of doctor-written prescriptions and secure PDF delivery.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#243447]">Wheelchair &amp; Ramp Accessibility</h4>
              <p className="text-xs text-[#667085] mt-0.5">Step-free entrance and accessible reception desk for senior citizens and mobility needs.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#243447]">Air-Conditioned Waiting Lounge</h4>
              <p className="text-xs text-[#667085] mt-0.5">Real-time digital token display screen so patients know their exact turn.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#243447]">Emergency First-Aid Desk</h4>
              <p className="text-xs text-[#667085] mt-0.5">Trained emergency nursing triage desk for acute stabilisation and assessment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-[#243447] text-white rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-xl font-bold text-white">Have Questions or Need an OPD Token?</h3>
          <p className="text-xs text-white/70">
            Book online before {settings.onlineCutoffTime} AM or visit our reception desk from 09:30 AM onwards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/book-appointment">
            <Button variant="accent" size="md">
              Book OPD Slot
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" size="md" className="bg-transparent text-white border-white/40 hover:bg-white/10">
              Contact Desk
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
