import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Stethoscope, 
  Microscope, 
  Activity, 
  Syringe, 
  HeartPulse, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Calendar,
  Layers,
  Sparkles,
  Bed,
  FileCheck,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface HospitalFacility {
  id: string;
  category: 'opd' | 'lab' | 'daycare' | 'tech';
  title: string;
  badge: string;
  location: string;
  timing: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export const hospitalFacilities: HospitalFacility[] = [
  {
    id: 'fac-opd-chambers',
    category: 'opd',
    title: 'Outpatient Consultation Chambers',
    badge: 'Ground & First Floor',
    location: 'Chambers 101 to 106',
    timing: '09:30 AM – 02:00 PM Daily',
    description: 'Sound-isolated, hygienic examination suites dedicated to private doctor-patient consultations in General Medicine, Surgery, Gynaecology, Orthopaedics, and Paediatrics.',
    features: [
      'Private clinical examination beds and step stools',
      'Digital diagnostic wall sets (Ophthalmoscope / Otoscope)',
      'Direct workstation link to the unified OPD token call system'
    ],
    icon: <Stethoscope className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
  {
    id: 'fac-path-lab',
    category: 'lab',
    title: 'Automated Pathology Laboratory',
    badge: 'Certified Diagnostic Lab',
    location: 'Ground Floor, Lab Wing',
    timing: '08:00 AM – 02:00 PM (Sample Intake)',
    description: 'Equipped with calibrated 3-part / 5-part hematology and auto-biochemistry analyzers. Routine blood and urine tests processed with multi-level internal quality control.',
    features: [
      'Automated biochemistry & electrolyte analyzers',
      'Mandatory two-step sign-off by Senior Pathologist',
      'Fast 2 to 4 hour report turnaround with secure digital delivery'
    ],
    icon: <Microscope className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#688D23]',
  },
  {
    id: 'fac-daycare',
    category: 'daycare',
    title: 'Day Care Observation & Short-Stay Unit',
    badge: 'Clinical Observation',
    location: 'Ground Floor, East Wing',
    timing: '09:00 AM – 06:00 PM',
    description: 'Designed for patients requiring short-term intravenous medications, post-procedure observation, dehydration management, or vital monitoring under nursing supervision.',
    features: [
      'Adjustable patient recovery beds with nurse call alerts',
      'Multi-parameter monitors for continuous vitals tracking',
      'Dedicated nursing station with oxygen delivery points'
    ],
    icon: <Bed className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
  {
    id: 'fac-minor-ot',
    category: 'daycare',
    title: 'Minor Operation Theatre (OT) & Procedure Suite',
    badge: 'Sterile Minor Procedures',
    location: 'Ground Floor, Clinical Wing',
    timing: 'Scheduled & Urgent Hours',
    description: 'Sterile procedure room equipped for aseptic outpatient surgical procedures, abscess drainage, minor wound debridement, surgical suturing, and dressing.',
    features: [
      'Surgical shadowless LED lighting and autoclave-sterilized instruments',
      'Local anaesthesia delivery station and cardiac monitoring',
      'Strict infection control and biomedical waste disposal protocols'
    ],
    icon: <Syringe className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#688D23]',
  },
  {
    id: 'fac-ecg',
    category: 'lab',
    title: '12-Lead Digital ECG & Cardiology Screening',
    badge: 'Point-of-Care Cardiac',
    location: 'Diagnostics Wing Room 102',
    timing: '09:30 AM – 01:30 PM',
    description: 'High-fidelity 12-lead digital electrocardiograph unit providing rapid cardiac baseline screenings, pre-operative clearances, and acute chest discomfort evaluations.',
    features: [
      'High-resolution multi-channel digital ECG tracing',
      'Immediate physician review and printed diagnostic strip',
      'Integrated archiving into the patient’s digital health profile'
    ],
    icon: <HeartPulse className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
  {
    id: 'fac-reception-kiosk',
    category: 'tech',
    title: 'Central Reception & Unified Token Kiosk',
    badge: 'Single Sequential Queue',
    location: 'Main Hospital Entrance',
    timing: '08:30 AM – 08:00 PM Daily',
    description: 'Modern reception desk synchronizing online booking verifications with in-person walk-in registrations onto the single sequential daily token queue.',
    features: [
      'Real-time token display monitor in waiting area',
      'Complimentary assistance for senior citizens & differently-abled',
      'Instant SMS confirmation and printed token slip'
    ],
    icon: <Clock className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#688D23]',
  },
  {
    id: 'fac-digitization',
    category: 'tech',
    title: 'Prescription Digitization & Health Records Desk',
    badge: 'DPDP-Aligned System',
    location: 'Administrative Block',
    timing: 'Continuous Digital Service',
    description: 'Immediate high-resolution scanning of doctor-written prescriptions and diagnostic requisitions, automatically indexed under the patient’s Unique Hospital ID (SH-YYYY-XXXXX).',
    features: [
      'Secure PDF archiving with Row Level Security (RLS)',
      'Authenticated, time-limited download links for patient privacy',
      'Elimination of lost paper records during subsequent visits'
    ],
    icon: <FileCheck className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
  {
    id: 'fac-dispensary',
    category: 'opd',
    title: 'Hospital Pharmacy & Dispensary Counter',
    badge: 'Prescribed Medications',
    location: 'Adjacent to Reception',
    timing: '08:30 AM – 08:30 PM',
    description: 'On-site dispensing desk carrying standard essential outpatient pharmaceuticals, surgical dressings, and doctor-prescribed medications.',
    features: [
      'Temperature-controlled medication storage',
      'Direct verification with prescribing doctor when needed',
      'Computerized itemized billing with GST-compliant receipts'
    ],
    icon: <Building className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#688D23]',
  },
];

export const Facilities: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'opd' | 'lab' | 'daycare' | 'tech'>('all');

  const filteredFacilities = activeCategory === 'all'
    ? hospitalFacilities
    : hospitalFacilities.filter(f => f.category === activeCategory);

  const categories = [
    { id: 'all', label: 'All Facilities' },
    { id: 'opd', label: 'OPD & Clinics' },
    { id: 'lab', label: 'Diagnostic Lab' },
    { id: 'daycare', label: 'Day Care & Minor OT' },
    { id: 'tech', label: 'Digital & Reception' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Building className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Hospital Infrastructure &amp; Amenities</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#243447] tracking-tight">
          Clinical Facilities &amp; Care Standards
        </h1>
        <p className="text-base text-[#667085] leading-relaxed">
          Satya Hospital &amp; Pathology provides structured, patient-centric facilities designed for infection control, diagnostic accuracy, and comfort during morning outpatient visits.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-[#3DA9DF] text-white shadow-xs'
                : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredFacilities.map((fac) => (
          <motion.div
            key={fac.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#3DA9DF] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${fac.iconBg} ${fac.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    {fac.icon}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#243447]">
                      {fac.title}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#91BB40]">
                      {fac.location}
                    </span>
                  </div>
                </div>
                <Badge variant="medical-blue" size="sm">
                  {fac.badge}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                {fac.description}
              </p>

              {/* Timing bar */}
              <div className="bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#E1E8ED] flex items-center justify-between text-xs text-[#243447]">
                <span className="text-[#667085] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#3DA9DF]" />
                  Operational Hours:
                </span>
                <strong className="text-[11px] font-semibold">{fac.timing}</strong>
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-2 border-t border-[#E1E8ED] text-xs">
                {fac.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-[#243447]">
                    <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-[#E1E8ED] flex items-center justify-between text-xs">
              <Link to="/book-appointment">
                <Button variant="outline" size="sm" leftIcon={<Calendar className="w-3.5 h-3.5 text-[#3DA9DF]" />}>
                  Book Token
                </Button>
              </Link>
              <Link to="/contact" className="text-xs font-semibold text-[#3DA9DF] hover:underline flex items-center gap-1">
                <span>Facility Inquiry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trust Notice */}
      <div className="bg-[#F4F8FA] border border-[#CBD5E1] p-6 sm:p-7 rounded-2xl flex items-start gap-3.5 text-xs text-[#667085]">
        <ShieldCheck className="w-5 h-5 text-[#3DA9DF] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-[#243447]">Hospital Infrastructure Standards</h4>
          <p className="leading-relaxed">
            All facilities displayed above are actively operational on our hospital campus in Prayagraj. Routine biomedical equipment calibration is conducted according to hospital clinical safety protocols.
          </p>
        </div>
      </div>
    </div>
  );
};
