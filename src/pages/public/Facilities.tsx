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
  Clock,
  Baby,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface HospitalFacility {
  id: string;
  category: 'pediatric' | 'opd' | 'lab' | 'daycare' | 'tech';
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
    id: 'fac-pediatric-wing',
    category: 'pediatric',
    title: 'Child-Friendly Pediatric Consultation Wing',
    badge: 'Child & Infant Care',
    location: 'Ground Floor, Pediatric Suite',
    timing: '09:30 AM – 02:00 PM Daily',
    description: 'Bright, colorful, sanitized consultation room equipped specifically for children, with gentle medical toys and comfortable parent seating.',
    features: [
      'Gentle pediatric examination bed with sanitized disposable covers',
      'Child-appropriate diagnostic equipment (stethoscopes, otoscopes, scales)',
      'Direct link to the unified sequential token queue'
    ],
    icon: <Baby className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#91BB40]',
  },
  {
    id: 'fac-opd-chambers',
    category: 'opd',
    title: 'Outpatient Consultation Chambers',
    badge: 'Ground & First Floor',
    location: 'Chambers 101 to 106',
    timing: '09:30 AM – 02:00 PM Daily',
    description: 'Sound-isolated, hygienic examination suites dedicated to private doctor-patient consultations in General Medicine, Surgery, Gynaecology, and Orthopaedics.',
    features: [
      'Private clinical examination beds and step stools',
      'Digital diagnostic wall sets (Ophthalmoscope / Otoscope)',
      'Workstation connection to hospital management software'
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
      'Micro-sampling needle kits for gentle pediatric phlebotomy',
      'Mandatory two-step sign-off by Senior Pathologist'
    ],
    icon: <Microscope className="w-6 h-6" />,
    iconBg: 'bg-[#F3F8EC]',
    iconColor: 'text-[#91BB40]',
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
    iconBg: 'bg-[#FFF0E7]',
    iconColor: 'text-[#9A3412]',
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
      'Stroller and ramp accessibility from parking to consultation rooms',
      'Instant verification and printed token slips'
    ],
    icon: <Clock className="w-6 h-6" />,
    iconBg: 'bg-[#EBF6FC]',
    iconColor: 'text-[#3DA9DF]',
  },
];

export const Facilities: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'pediatric' | 'opd' | 'lab' | 'daycare' | 'tech'>('all');

  const filteredFacilities = activeCategory === 'all'
    ? hospitalFacilities
    : hospitalFacilities.filter(f => f.category === activeCategory);

  const categories = [
    { id: 'all', label: 'All Facilities' },
    { id: 'pediatric', label: 'Pediatric Wing' },
    { id: 'opd', label: 'OPD & Clinics' },
    { id: 'lab', label: 'Diagnostic Lab' },
    { id: 'daycare', label: 'Day Care & Minor OT' },
    { id: 'tech', label: 'Reception & Queue' },
  ];

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-[#3DA9DF]" />
            <span>Hospital Infrastructure &amp; Amenities &bull; Prayagraj</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
            Clinical Facilities &amp; Care Standards
          </h1>
          <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
            Satya Hospital &amp; Pathology provides structured, child-friendly facilities designed for clinical hygiene, diagnostic accuracy, and family comfort during morning outpatient visits.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#3DA9DF] text-white shadow-xs'
                  : 'bg-white border border-[#E5ECEF] text-[#193247] hover:bg-[#FCFDFB]'
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
              className="bg-white rounded-2xl border border-[#CBD7DD] hover:border-[#3DA9DF]/50 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${fac.iconBg} ${fac.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform font-bold`}>
                      {fac.icon}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-[#193247]">
                        {fac.title}
                      </h3>
                      <span className="text-[11px] font-bold text-[#3DA9DF]">
                        {fac.location}
                      </span>
                    </div>
                  </div>
                  <Badge variant="medical-blue" size="sm">
                    {fac.badge}
                  </Badge>
                </div>

                <p className="text-xs text-[#647785] leading-relaxed">
                  {fac.description}
                </p>

                <div className="p-3.5 bg-[#FCFDFB] rounded-xl border border-[#E5ECEF] text-xs space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#647785]">
                    Key Infrastructure Features:
                  </div>
                  <ul className="space-y-1.5">
                    {fac.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[#193247]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#91BB40] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5ECEF] mt-4 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#647785] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#3DA9DF]" />
                  <span>{fac.timing}</span>
                </span>
                <Link to="/book-appointment" className="text-xs font-bold text-[#3DA9DF] hover:text-[#2B92C4] flex items-center gap-1">
                  <span>Book Consultation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};