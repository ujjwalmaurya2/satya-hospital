import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Milestone, 
  Clock, 
  ShieldCheck, 
  Microscope, 
  Stethoscope, 
  HeartPulse, 
  Users, 
  Calendar,
  CheckCircle2, 
  ArrowRight,
  FileCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface JourneyMilestone {
  period: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export const journeyMilestones: JourneyMilestone[] = [
  {
    period: 'Foundational Phase',
    badge: 'Clinical Inception',
    title: 'Founding of Satya Hospital in Prayagraj',
    subtitle: 'A commitment to accessible, ethical outpatient medicine',
    description: 'Satya Hospital was established in Prayagraj to bridge the gap between compassionate community care and modern clinical practice. From day one, the founding team pledged zero fabricated claims and patient-first consultations.',
    highlights: [
      'Dedicated Outpatient Department (OPD) chambers',
      'Ground-floor accessible reception and triage desk',
      'Core clinical consultations in General Medicine and Family Care'
    ],
    icon: <HeartPulse className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
  {
    period: 'Laboratory Expansion',
    badge: 'Diagnostic Excellence',
    title: 'In-House Automated Pathology Laboratory',
    subtitle: 'NABL-aligned quality protocols & 2-step pathologist verification',
    description: 'Recognizing that clinical diagnosis requires accurate, prompt lab results, Satya Hospital installed calibrated hematology and biochemistry auto-analyzers right on hospital premises, ensuring rapid turnaround for OPD patients.',
    highlights: [
      'Automated biochemistry & hematology testing suites',
      'Mandatory 2-step pathologist sign-off before report publication',
      'Fast 2 to 4 hour turnaround for routine outpatient blood panels'
    ],
    icon: <Microscope className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#688D23]',
  },
  {
    period: 'Specialty Growth',
    badge: 'Multidisciplinary Care',
    title: 'Expansion into Five Core Medical Specialties',
    subtitle: 'Recruitment of credentialed postgraduate medical faculty',
    description: 'Expanded clinical services to include General & Laparoscopic Surgery, Obstetrics & Gynaecology, Orthopaedics & Joint Care, and Paediatrics—all coordinated through structured morning consultation rosters.',
    highlights: [
      'Senior consultants holding recognized MS, MD, and DNB qualifications',
      'Minor Operation Theatre (OT) for sterile minor procedures & suturing',
      'Dedicated day-care observation beds for short-stay recovery'
    ],
    icon: <Stethoscope className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
  {
    period: 'Process Innovation',
    badge: 'Queue Transparency',
    title: 'The Unified Sequential Token Queue System',
    subtitle: 'Ending favoritism and oversubscription with strict sequential fairness',
    description: 'To end unpredictable waiting times and queue-jumping, Satya Hospital implemented the unified token queue. Online reservations and in-person walk-ins receive token numbers from the same sequential daily queue without distinction.',
    highlights: [
      'T-1 booking window opening 1 day prior to appointment',
      'Strict 09:00 AM same-day cutoff locking dispensary rosters',
      'Zero duplicate tokens with atomic database reservation locking'
    ],
    icon: <Clock className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#688D23]',
  },
  {
    period: 'Digital Transformation',
    badge: 'Modern Health Portal',
    title: 'Patient Health Portal & DPDP-Compliant Digital Records',
    subtitle: 'Paperless records, prescription scanning, and secure PDF delivery',
    description: 'Delivered a modern patient health portal. Patients access signed lab reports via short-lived authenticated URLs, review scanned handwritten prescriptions, and manage upcoming OPD tokens from any device.',
    highlights: [
      'Full compliance with India’s Digital Personal Data Protection (DPDP) Act',
      'Row Level Security (RLS) across patient clinical records',
      'Instant access to authenticated digital pathology reports and receipts'
    ],
    icon: <ShieldCheck className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
];

export const Journey: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      {/* Header */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Milestone className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Our Clinical Evolution &amp; Milestones</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#243447] tracking-tight">
          The Satya Hospital Journey
        </h1>
        <p className="text-base text-[#667085] leading-relaxed">
          From a focused outpatient clinic to a digitally synchronized multispecialty hospital and diagnostic center in Prayagraj. Explore the key milestones that shaped our patient-first healthcare model.
        </p>
      </div>

      {/* Timeline Section */}
      <div className="relative">
        {/* Central connecting vertical line */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#3DA9DF] via-[#91BB40] to-[#CBD5E1] -translate-x-1/2" />

        <div className="space-y-12 md:space-y-16">
          {journeyMilestones.map((milestone, idx) => {
            const isEven = idx % 2 === 0;

            return (
              <motion.div
                key={milestone.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className={`relative flex flex-col md:flex-row items-center ${
                  isEven ? 'md:flex-row-reverse' : ''
                } gap-6 md:gap-12`}
              >
                {/* Timeline Node Dot (Centered on desktop) */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-white border-2 border-[#CBD5E1] items-center justify-center shadow-md z-10 group-hover:scale-110 transition-transform">
                  <div className={`w-8 h-8 rounded-xl ${milestone.iconBg} ${milestone.iconColor} flex items-center justify-center`}>
                    {milestone.icon}
                  </div>
                </div>

                {/* Content Card (Half width) */}
                <div className="w-full md:w-1/2">
                  <Card className="p-6 sm:p-7 border-[#CBD5E1] hover:border-[#3DA9DF] transition-all hover:shadow-md">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                        {milestone.period}
                      </span>
                      <Badge variant={isEven ? 'medical-blue' : 'lime-green'} size="sm">
                        {milestone.badge}
                      </Badge>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-[#243447] mb-1">
                      {milestone.title}
                    </h2>
                    <h3 className="text-xs font-semibold text-[#3DA9DF] mb-3">
                      {milestone.subtitle}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#667085] leading-relaxed mb-4">
                      {milestone.description}
                    </p>

                    <div className="space-y-2 pt-3 border-t border-[#E1E8ED] text-xs">
                      {milestone.highlights.map((item, hIdx) => (
                        <div key={hIdx} className="flex items-start gap-2 text-[#243447]">
                          <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Spacer for the other half */}
                <div className="hidden md:block w-1/2" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="bg-[#243447] text-white rounded-3xl p-8 sm:p-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl sm:text-2xl font-bold">Experience Our Patient-First Care Model</h2>
          <p className="text-xs sm:text-sm text-white/70 max-w-xl">
            Join the hundreds of Prayagraj families who rely on Satya Hospital for transparent OPD consultations and certified diagnostic pathology.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <Link to="/book-appointment">
            <Button variant="accent" size="lg" leftIcon={<Calendar className="w-5 h-5" />} className="font-semibold">
              Book OPD Token
            </Button>
          </Link>
          <Link to="/doctors">
            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
              Meet Doctors &rarr;
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
