import React, { useState, useEffect } from 'react';
import { 
  Images, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Building, 
  Stethoscope, 
  Microscope, 
  Bed, 
  ShieldCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface GalleryItem {
  id: string;
  title: string;
  category: 'chambers' | 'pathology' | 'daycare' | 'reception';
  categoryLabel: string;
  roomInfo: string;
  description: string;
  equipment: string[];
  gradient: string;
  accentColor: string;
  icon: React.ReactNode;
  imageSrc?: string;
}

export const hospitalGalleryItems: GalleryItem[] = [
  {
    id: 'gal-campus',
    title: 'Satya Hospital & Pathology Main Campus',
    category: 'reception',
    categoryLabel: 'Hospital Campus',
    roomInfo: 'Civil Lines Road, Prayagraj',
    description: 'Exterior view of Satya Hospital & Pathology showing the multi-storey clinical facility, ground-floor reception, step-free patient ramp, and outpatient consultation suites.',
    equipment: ['Step-free Ramp Access', 'Ground Floor Emergency Intake', 'Ambulance & Patient Drop-off'],
    gradient: 'from-[#3DA9DF]/20 to-[#1E78A4]/15',
    accentColor: '#3DA9DF',
    icon: <Building className="w-10 h-10 text-[#3DA9DF]" />,
    imageSrc: '/images/satya-hospital-building.jpg',
  },
  {
    id: 'gal-1',
    title: 'Consultation Suite - General Medicine',
    category: 'chambers',
    categoryLabel: 'OPD Chambers',
    roomInfo: 'Room 101, Ground Floor',
    description: 'Private outpatient examination chamber equipped with diagnostic wall units, examination couch, and confidential consultation desk.',
    equipment: ['Diagnostic Wall Set', 'Digital Sphygmomanometer', 'Queue Terminal Link'],
    gradient: 'from-[#3DA9DF]/20 to-[#1E78A4]/15',
    accentColor: '#3DA9DF',
    icon: <Stethoscope className="w-10 h-10 text-[#3DA9DF]" />,
  },
  {
    id: 'gal-2',
    title: 'Clinical Pathology Auto-Analyzer Suite',
    category: 'pathology',
    categoryLabel: 'Pathology Lab',
    roomInfo: 'Lab Wing, Ground Floor',
    description: 'Calibrated automated biochemistry and hematology analyzers running daily multi-level quality control runs.',
    equipment: ['Auto-Biochemistry Analyzer', '3-Part Hematology Cell Counter', 'Cold-Chain Refrigerator'],
    gradient: 'from-[#91BB40]/25 to-[#688D23]/15',
    accentColor: '#91BB40',
    icon: <Microscope className="w-10 h-10 text-[#688D23]" />,
  },
  {
    id: 'gal-3',
    title: 'Day Care Observation & Recovery Bay',
    category: 'daycare',
    categoryLabel: 'Day Care & OT',
    roomInfo: 'East Wing, Observation Ward',
    description: 'Patient observation beds dedicated to short-stay IV therapy, post-procedure monitoring, and dehydration management.',
    equipment: ['Adjustable Recovery Beds', 'Multi-Para Vital Monitors', 'Centralized Oxygen Points'],
    gradient: 'from-[#3DA9DF]/20 to-[#91BB40]/20',
    accentColor: '#3DA9DF',
    icon: <Bed className="w-10 h-10 text-[#3DA9DF]" />,
  },
  {
    id: 'gal-4',
    title: 'Sterile Minor Procedure & OT Room',
    category: 'daycare',
    categoryLabel: 'Day Care & OT',
    roomInfo: 'Clinical Wing, Procedure Suite',
    description: 'Aseptic environment for minor surgical procedures, sterile wound suturing, abscess drainage, and dressing.',
    equipment: ['Shadowless Surgical LED Lamp', 'Autoclave Instrument Station', 'Cardiac Resuscitation Tray'],
    gradient: 'from-[#1E78A4]/20 to-[#243447]/15',
    accentColor: '#1E78A4',
    icon: <Building className="w-10 h-10 text-[#1E78A4]" />,
  },
  {
    id: 'gal-5',
    title: 'Central Reception & Token Registration Desk',
    category: 'reception',
    categoryLabel: 'Reception & Waiting',
    roomInfo: 'Hospital Main Entrance',
    description: 'Spacious patient reception with single sequential queue display screen and registration verification counter.',
    equipment: ['Unified Queue Terminal', 'High-Speed Token Printer', 'Real-time Waiting Monitor'],
    gradient: 'from-[#91BB40]/20 to-[#3DA9DF]/20',
    accentColor: '#91BB40',
    icon: <Building className="w-10 h-10 text-[#91BB40]" />,
  },
  {
    id: 'gal-6',
    title: 'Specialist Consultation Chamber - OB-GYN',
    category: 'chambers',
    categoryLabel: 'OPD Chambers',
    roomInfo: 'Room 104, First Floor',
    description: 'Dedicated maternal and gynaecological examination chamber with private examination screen and fetal Doppler.',
    equipment: ['Fetal Heart Doppler', 'Gynaecological Examination Couch', 'Patient Counseling Desk'],
    gradient: 'from-[#3DA9DF]/15 to-[#F4F8FA]',
    accentColor: '#3DA9DF',
    icon: <Stethoscope className="w-10 h-10 text-[#3DA9DF]" />,
  },
  {
    id: 'gal-7',
    title: 'Phlebotomy & Sample Collection Counter',
    category: 'pathology',
    categoryLabel: 'Pathology Lab',
    roomInfo: 'Sample Intake Counter, Lab Wing',
    description: 'Hygienic vacuum-tube phlebotomy station ensuring patient comfort and barcoded specimen tracking.',
    equipment: ['Sterile Vacuum Tube System', 'Barcoded Sample Labeler', 'Centrifuge Station'],
    gradient: 'from-[#91BB40]/20 to-[#688D23]/20',
    accentColor: '#688D23',
    icon: <Microscope className="w-10 h-10 text-[#688D23]" />,
  },
  {
    id: 'gal-8',
    title: '12-Lead Digital ECG Evaluation Suite',
    category: 'pathology',
    categoryLabel: 'Pathology Lab',
    roomInfo: 'Diagnostics Wing, Room 102',
    description: 'Point-of-care digital electrocardiograph station for immediate cardiac assessment and vital evaluation.',
    equipment: ['12-Channel High-Res ECG', 'Immediate Thermal Printout', 'Digital Health Record Archive'],
    gradient: 'from-[#3DA9DF]/25 to-[#1E78A4]/15',
    accentColor: '#3DA9DF',
    icon: <Building className="w-10 h-10 text-[#3DA9DF]" />,
  },
];

export const Gallery: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  const filteredItems = selectedCategory === 'all'
    ? hospitalGalleryItems
    : hospitalGalleryItems.filter(item => item.category === selectedCategory);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'Escape') {
        setActiveLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActiveLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowLeft') {
        setActiveLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, filteredItems.length]);

  const activeItem = activeLightboxIndex !== null ? filteredItems[activeLightboxIndex] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Images className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Visual Tour &amp; Clinical Campus</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#243447] tracking-tight">
          Hospital &amp; Laboratory Gallery
        </h1>
        <p className="text-base text-[#667085] leading-relaxed">
          Take a visual tour through our clinical consultation rooms, automated pathology laboratory, day care recovery unit, and reception areas in Prayagraj.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Areas' },
          { id: 'chambers', label: 'OPD Chambers' },
          { id: 'pathology', label: 'Pathology Lab' },
          { id: 'daycare', label: 'Day Care & Minor OT' },
          { id: 'reception', label: 'Reception & Waiting' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
              setActiveLightboxIndex(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-[#3DA9DF] text-white shadow-xs'
                : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            className="group cursor-pointer bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#3DA9DF] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            onClick={() => setActiveLightboxIndex(index)}
          >
            {/* Visual Header / Graphic Card or Real Photo */}
            {item.imageSrc ? (
              <div className="h-44 relative overflow-hidden bg-slate-100">
                <img 
                  src={item.imageSrc} 
                  alt={item.title} 
                  className="w-full h-full object-cover object-[55%_35%] group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#243447]/80 via-transparent to-black/20" />
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                  <Badge variant="medical-blue" size="sm" className="bg-white/95 backdrop-blur-xs">
                    {item.categoryLabel}
                  </Badge>
                  <div className="w-8 h-8 rounded-lg bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#243447] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                    <Maximize2 className="w-4 h-4 text-[#3DA9DF]" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 text-[11px] font-semibold text-white bg-[#243447]/80 backdrop-blur-xs px-2.5 py-1 rounded-md">
                  {item.roomInfo}
                </div>
              </div>
            ) : (
              <div className={`h-44 bg-gradient-to-br ${item.gradient} p-5 flex flex-col justify-between relative overflow-hidden`}>
                <div className="flex justify-between items-start z-10">
                  <Badge variant="medical-blue" size="sm" className="bg-white/90 backdrop-blur-xs">
                    {item.categoryLabel}
                  </Badge>
                  <div className="w-8 h-8 rounded-lg bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#243447] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                    <Maximize2 className="w-4 h-4 text-[#3DA9DF]" />
                  </div>
                </div>

                <div className="flex items-center justify-center py-2 z-10 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>

                <div className="text-[11px] font-semibold text-[#243447] z-10 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-md inline-block w-fit">
                  {item.roomInfo}
                </div>
              </div>
            )}

            {/* Info Body */}
            <div className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#243447] group-hover:text-[#3DA9DF] transition-colors leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed line-clamp-2">
                {item.description}
              </p>

              <div className="pt-2 border-t border-[#E1E8ED] flex items-center justify-between text-[11px] text-[#3DA9DF] font-semibold">
                <span>View Area Details</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#243447]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setActiveLightboxIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-[#CBD5E1] shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveLightboxIndex(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 border border-[#E1E8ED] flex items-center justify-center text-[#243447] hover:bg-white transition-colors cursor-pointer shadow-sm"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Graphic Banner or Photo */}
              {activeItem.imageSrc ? (
                <div className="h-64 sm:h-80 relative overflow-hidden bg-slate-900">
                  <img 
                    src={activeItem.imageSrc} 
                    alt={activeItem.title} 
                    className="w-full h-full object-cover object-[55%_35%]" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#243447]/85 via-transparent to-black/20" />
                  <div className="absolute top-4 left-4 z-10">
                    <Badge variant="medical-blue" size="sm" className="bg-white/95">
                      {activeItem.categoryLabel}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4 text-xs font-bold text-white bg-[#243447]/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10">
                    {activeItem.roomInfo}
                  </div>
                </div>
              ) : (
                <div className={`h-56 sm:h-64 bg-gradient-to-br ${activeItem.gradient} p-8 flex flex-col justify-between relative`}>
                  <Badge variant="medical-blue" size="sm" className="w-fit bg-white shadow-xs">
                    {activeItem.categoryLabel}
                  </Badge>

                  <div className="flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      {activeItem.icon}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-[#243447] bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg w-fit shadow-xs">
                    {activeItem.roomInfo}
                  </div>
                </div>
              )}

              {/* Modal Content */}
              <div className="p-6 sm:p-8 space-y-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#243447]">
                    {activeItem.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#667085] mt-2 leading-relaxed">
                    {activeItem.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E1E8ED]">
                  <span className="text-xs font-bold text-[#243447] block uppercase tracking-wider">
                    Clinical Equipment &amp; Features:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {activeItem.equipment.map((eq, eqIdx) => (
                      <div key={eqIdx} className="flex items-center gap-2 text-[#243447]">
                        <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                        <span>{eq}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation controls */}
                <div className="pt-4 border-t border-[#E1E8ED] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0))}
                      className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#243447] hover:bg-[#F4F8FA] flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0))}
                      className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#243447] hover:bg-[#F4F8FA] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-xs text-[#667085] font-medium">
                    {activeLightboxIndex! + 1} of {filteredItems.length}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
