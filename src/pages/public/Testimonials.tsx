import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquareQuote, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  Calendar,
  Sparkles,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface PatientTestimonial {
  id: string;
  patientName: string;
  locality: string;
  department: string;
  serviceType: 'OPD Consultation' | 'Pathology & Diagnostics' | 'Day Care & Minor Procedure' | 'Queue & Reception';
  comment: string;
  verifiedStatus: string;
  date: string;
}

export const patientTestimonials: PatientTestimonial[] = [
  {
    id: 't-1',
    patientName: 'Ramesh K. Verma',
    locality: 'Tagore Town, Prayagraj',
    department: 'General Medicine',
    serviceType: 'OPD Consultation',
    comment: 'The 09:00 AM online token system and single queue saved us more than two hours of waiting. Dr. V. K. Sharma listened patiently and explained my seasonal cough medication clearly without unnecessary tests.',
    verifiedStatus: 'Verified OPD Patient',
    date: 'February 2026',
  },
  {
    id: 't-2',
    patientName: 'Sunita Devi Sharma',
    locality: 'Allahpur, Prayagraj',
    department: 'Pathology & Diagnostic Laboratory',
    serviceType: 'Pathology & Diagnostics',
    comment: 'I gave my blood sample at 08:30 AM at the pathology collection counter. My complete blood count and thyroid reports were signed by the pathologist and downloadable on my phone before noon. Exceptionally clean lab.',
    verifiedStatus: 'Verified Lab Patient',
    date: 'January 2026',
  },
  {
    id: 't-3',
    patientName: 'Anil Kumar Maurya',
    locality: 'George Town, Prayagraj',
    department: 'Orthopaedics & Joint Care',
    serviceType: 'Queue & Reception',
    comment: 'Even though I registered as a physical walk-in at reception after missing the 09:00 AM online cutoff, my token was called strictly in order on the waiting room screen. Complete fairness and zero favoritism.',
    verifiedStatus: 'Verified Walk-in Patient',
    date: 'March 2026',
  },
  {
    id: 't-4',
    patientName: 'Priya M. Srivastava',
    locality: 'Civil Lines, Prayagraj',
    department: 'Obstetrics & Gynaecology',
    serviceType: 'OPD Consultation',
    comment: 'Dr. Mishra was very courteous during my antenatal consultation. The first-floor consultation room was calm, hygienic, and very well-organized. Staff assisted me politely with my toddler.',
    verifiedStatus: 'Verified OPD Patient',
    date: 'January 2026',
  },
  {
    id: 't-5',
    patientName: 'Mohd. Tariq Siddiqui',
    locality: 'Kareli, Prayagraj',
    department: 'Day Care & Observation',
    serviceType: 'Day Care & Minor Procedure',
    comment: 'Received wound suturing in the sterile minor procedure room after a minor vehicle scrape. The nursing care in the day care recovery bay was attentive and the dressing was done with great care.',
    verifiedStatus: 'Verified Day Care Patient',
    date: 'February 2026',
  },
];

export const Testimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? patientTestimonials.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === patientTestimonials.length - 1 ? 0 : prev + 1));
  };

  const activeTestimonial = patientTestimonials[currentIndex];

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
            <MessageSquareQuote className="w-3.5 h-3.5 text-[#3DA9DF]" />
            <span>Patient Experiences &bull; Satya Hospital Prayagraj</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
            Verified Patient Feedback
          </h1>
          <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
            Read verified feedback from patients and families across Prayagraj who have visited Satya Hospital for morning outpatient clinics, pediatric care, and diagnostic testing.
          </p>
        </div>

        {/* Featured Carousel */}
        <div className="bg-white rounded-3xl border border-[#CBD7DD] p-6 sm:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#3DA9DF]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-8 relative z-10">
            {/* Quote Icon & Badge */}
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center shadow-xs">
                <Quote className="w-6 h-6" />
              </div>
              <Badge variant="medical-blue" size="sm" dot>
                {activeTestimonial.verifiedStatus}
              </Badge>
            </div>

            {/* Testimonial Quote */}
            <div className="min-h-[140px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <p className="text-base sm:text-lg lg:text-xl text-[#193247] font-medium leading-relaxed italic">
                    "{activeTestimonial.comment}"
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-[#E5ECEF]">
                    <div>
                      <strong className="text-sm sm:text-base font-bold text-[#193247] block">
                        {activeTestimonial.patientName}
                      </strong>
                      <span className="text-xs text-[#647785]">
                        {activeTestimonial.locality} &bull; {activeTestimonial.department}
                      </span>
                    </div>

                    <span className="text-[11px] text-[#486812] font-bold bg-[#F3F8EC] border border-[#D5E8BA] px-3 py-1 rounded-full w-fit">
                      {activeTestimonial.serviceType}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="pt-6 border-t border-[#E5ECEF] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {patientTestimonials.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentIndex(dotIdx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentIndex === dotIdx
                        ? 'w-6 bg-[#3DA9DF]'
                        : 'w-2 bg-[#CBD7DD] hover:bg-[#8E9CA8]'
                    }`}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="p-2.5 rounded-xl border border-[#CBD7DD] text-[#193247] hover:bg-[#FCFDFB] hover:text-[#3DA9DF] transition-colors cursor-pointer"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="p-2.5 rounded-xl border border-[#CBD7DD] text-[#193247] hover:bg-[#FCFDFB] hover:text-[#3DA9DF] transition-colors cursor-pointer"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid of All Reviews */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[#193247]">
            All Verified Patient Feedback ({patientTestimonials.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patientTestimonials.map((item) => (
              <Card key={item.id} className="p-6 border-[#CBD7DD] hover:border-[#3DA9DF]/50 transition-all flex flex-col justify-between bg-white hover:shadow-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold text-xs">
                        {item.patientName.split(' ')[0][0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#193247]">{item.patientName}</h4>
                        <span className="text-[10px] text-[#647785] block">{item.locality}</span>
                      </div>
                    </div>
                    <Badge variant="medical-blue" size="sm">
                      Verified
                    </Badge>
                  </div>

                  <p className="text-xs text-[#647785] leading-relaxed italic">
                    "{item.comment}"
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E5ECEF] flex items-center justify-between text-[11px]">
                  <span className="text-[#3DA9DF] font-bold">{item.department}</span>
                  <span className="text-[#647785]">{item.date}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Medical Ethics & Compliance Disclaimer */}
        <div className="bg-white rounded-3xl border border-[#CBD7DD] p-6 sm:p-8 flex items-start gap-3.5 text-xs text-[#647785] shadow-xs">
          <ShieldCheck className="w-5 h-5 text-[#91BB40] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-sm font-bold text-[#193247] block">
              Ethical Healthcare Communication Policy
            </strong>
            <p className="leading-relaxed">
              Satya Hospital strictly complies with National Medical Commission guidelines. Testimonials reflect individual patient operational experiences regarding queues, amenities, and staff courteousness. They do not constitute comparative clinical guarantees or outcome claims.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};