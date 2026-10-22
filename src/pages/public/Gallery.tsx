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
  Calendar,
  Baby,
  Sparkles
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
    id: 'gal-pediatric',
    title: 'Pediatric Consultation Chamber',
    category: 'chambers',
    categoryLabel: 'Pediatric Wing',
    roomInfo: 'Suite 103, Ground Floor',
    description: 'Warm, child-friendly pediatric consultation chamber where consulting physicians conduct gentle, unhurried examinations with parents seated right beside.',
    equipment: ['Calibrated Pediatric Stethoscope', 'Child-Safe Examination Mat', 'Gentle Examination Lighting'],
    gradient: 'from-[#3DA9DF]/15 to-[#EBF6FC]',
    accentColor: '#3DA9DF',
    icon: <Baby className="w-10 h-10 text-[#3DA9DF]" />,
    imageSrc: '/images/pediatric-hero.jpg',
  },
  {
    id: 'gal-newborn',
    title: 'Newborn & Infant Examination Suite',
    category: 'chambers',
    categoryLabel: 'Newborn Care',
    roomInfo: 'Infant Wellness Room 105',
    description: 'Sterile, climate-regulated examination area equipped with high-precision digital baby scales, length measuring mats, and soothing natural daylight.',
    equipment: ['Digital Infant Scale', 'Infant Length Measuring Mat', 'Sanitized Disposable Bed Rolls'],
    gradient: 'from-[#F3F8EC] to-[#EBF6FC]',
    accentColor: '#91BB40',
    icon: <Sparkles className="w-10 h-10 text-[#91BB40]" />,
    imageSrc: '/images/newborn-care.jpg',
  },
  {
    id: 'gal-campus',
    title: 'Satya Hospital & Pathology Main Campus',
    category: 'reception',
    categoryLabel: 'Hospital Campus',
    roomInfo: 'Civil Lines Road, Prayagraj',
    description: 'Exterior view of Satya Hospital & Pathology showing the multi-storey clinical facility, ground-floor reception, step-free patient ramp, and outpatient consultation suites.',
    equipment: ['Step-free Ramp Access', 'Ground Floor Emergency Intake', 'Ambulance & Patient Drop-off'],
    gradient: 'from-[#3DA9DF]/20 to-[#193247]/15',
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
    gradient: 'from-[#EBF6FC] to-[#F3F8EC]',
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
    gradient: 'from-[#F3F8EC] to-[#FCFDFB]',
    accentColor: '#91BB40',
    icon: <Microscope className="w-10 h-10 text-[#91BB40]" />,
  },
  {
    id: 'gal-3',
    title: 'Day Care Observation & Recovery Bay',
    category: 'daycare',
    categoryLabel: 'Day Care & OT',
    roomInfo: 'East Wing, Observation Ward',
    description: 'Patient observation beds dedicated to short-stay IV therapy, post-procedure monitoring, and dehydration management.',
    equipment: ['Adjustable Recovery Beds', 'Multi-Para Vital Monitors', 'Centralized Oxygen Points'],
    gradient: 'from-[#FFF0E7] to-[#FCFDFB]',
    accentColor: '#9A3412',
    icon: <Bed className="w-10 h-10 text-[#9A3412]" />,
  },
  {
    id: 'gal-4',
    title: 'Sterile Minor Procedure & OT Room',
    category: 'daycare',
    categoryLabel: 'Day Care & OT',
    roomInfo: 'Clinical Wing, Procedure Suite',
    description: 'Aseptic environment for minor surgical procedures, sterile wound suturing, abscess drainage, and dressing.',
    equipment: ['Shadowless Surgical LED Lamp', 'Autoclave Instrument Station', 'Cardiac Resuscitation Tray'],
    gradient: 'from-[#EBF6FC] to-[#FCFDFB]',
    accentColor: '#3DA9DF',
    icon: <Building className="w-10 h-10 text-[#3DA9DF]" />,
  },
  {
    id: 'gal-5',
    title: 'Central Reception & Token Registration Desk',
    category: 'reception',
    categoryLabel: 'Reception & Waiting',
    roomInfo: 'Hospital Main Entrance',
    description: 'Spacious patient reception with single sequential queue display screen and registration verification counter.',
    equipment: ['Unified Queue Terminal', 'High-Speed Token Printer', 'Real-time Waiting Monitor'],
    gradient: 'from-[#F3F8EC] to-[#EBF6FC]',
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
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
            <Images className="w-3.5 h-3.5 text-[#3DA9DF]" />
            <span>Visual Tour &amp; Clinical Campus &bull; Satya Hospital</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
            Hospital &amp; Clinical Facility Gallery
          </h1>
          <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
            Take a visual tour through our child-friendly pediatric chambers, infant examination room, certified automated pathology lab, and reception facilities in Prayagraj.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'All Areas' },
            { id: 'chambers', label: 'Consultation Suites' },
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
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-[#3DA9DF] text-white shadow-xs'
                  : 'bg-white border border-[#E5ECEF] text-[#193247] hover:bg-[#FCFDFB]'
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
              className="group cursor-pointer bg-white rounded-2xl border border-[#CBD7DD] hover:border-[#3DA9DF]/50 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              onClick={() => setActiveLightboxIndex(index)}
            >
              {/* Visual Header / Graphic Card or Real Photo */}
              {item.imageSrc ? (
                <div className="h-44 relative overflow-hidden bg-slate-100">
                  <img 
                    src={item.imageSrc} 
                    alt={item.title} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#193247]/80 via-transparent to-black/20" />
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                    <Badge variant="medical-blue" size="sm" className="bg-white/95 backdrop-blur-xs">
                      {item.categoryLabel}
                    </Badge>
                    <div className="w-8 h-8 rounded-lg bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#193247] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                      <Maximize2 className="w-4 h-4 text-[#3DA9DF]" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 text-[11px] font-bold text-white bg-[#193247]/80 backdrop-blur-xs px-2.5 py-1 rounded-md">
                    {item.roomInfo}
                  </div>
                </div>
              ) : (
                <div className={`h-44 bg-gradient-to-br ${item.gradient} p-5 flex flex-col justify-between relative overflow-hidden`}>
                  <div className="flex justify-between items-start z-10">
                    <Badge variant="medical-blue" size="sm" className="bg-white/90 backdrop-blur-xs">
                      {item.categoryLabel}
                    </Badge>
                    <div className="w-8 h-8 rounded-lg bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#193247] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                      <Maximize2 className="w-4 h-4 text-[#3DA9DF]" />
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-2 z-10 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>

                  <div className="text-[11px] font-bold text-[#193247] z-10 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-md inline-block w-fit">
                    {item.roomInfo}
                  </div>
                </div>
              )}

              {/* Info Body */}
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#193247] group-hover:text-[#3DA9DF] transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#647785] leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                <div className="pt-2 border-t border-[#E5ECEF] flex items-center justify-between text-[11px] text-[#3DA9DF] font-bold">
                  <span>View Details</span>
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
              className="fixed inset-0 z-50 bg-[#193247]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
              onClick={() => setActiveLightboxIndex(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl max-w-2xl w-full border border-[#CBD7DD] shadow-2xl overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setActiveLightboxIndex(null)}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 border border-[#E5ECEF] flex items-center justify-center text-[#193247] hover:bg-white transition-colors cursor-pointer shadow-sm"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                {activeItem.imageSrc ? (
                  <div className="h-64 sm:h-80 relative overflow-hidden bg-slate-900">
                    <img 
                      src={activeItem.imageSrc} 
                      alt={activeItem.title} 
                      className="w-full h-full object-cover object-center" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#193247]/85 via-transparent to-black/20" />
                    <div className="absolute top-4 left-4 z-10">
                      <Badge variant="medical-blue" size="sm" className="bg-white/95">
                        {activeItem.categoryLabel}
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 text-xs font-bold text-white bg-[#193247]/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10">
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

                    <div className="text-xs font-bold text-[#193247] bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg w-fit shadow-xs">
                      {activeItem.roomInfo}
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8 space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#193247]">
                      {activeItem.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#647785] mt-2 leading-relaxed">
                      {activeItem.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E5ECEF]">
                    <span className="text-xs font-bold text-[#193247] block uppercase tracking-wider">
                      Clinical Equipment &amp; Features:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeItem.equipment.map((eq, eqIdx) => (
                        <div key={eqIdx} className="flex items-center gap-2 text-[#193247]">
                          <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                          <span>{eq}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5ECEF] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0))}
                        className="px-3 py-1.5 rounded-lg border border-[#CBD7DD] text-xs font-bold text-[#193247] hover:bg-[#FCFDFB] flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0))}
                        className="px-3 py-1.5 rounded-lg border border-[#CBD7DD] text-xs font-bold text-[#193247] hover:bg-[#FCFDFB] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="text-xs text-[#647785] font-medium">
                      {activeLightboxIndex! + 1} of {filteredItems.length}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};