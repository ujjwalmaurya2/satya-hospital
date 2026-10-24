import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Stethoscope, 
  Clock, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  UserCheck,
  Baby,
  BadgeCheck
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';
import { useHospital } from '../../context/HospitalContext';

export const Doctors: React.FC = () => {
  const { doctors } = useHospital();

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <ScrollReveal direction="up" distance={16}>
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
              <UserCheck className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>Medical Practitioners Directory &bull; Satya Hospital</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#193247] tracking-tight">
              Consultant Medical Specialists &amp; Physicians
            </h1>
            <p className="text-sm text-[#647785] leading-relaxed">
              Satya Hospital's physicians and consultants bring extensive clinical experience across outpatient medicine, pediatric care, general surgery, and women's health in Prayagraj.
            </p>
          </div>
        </ScrollReveal>

        {/* Verification Notice */}
        <ScrollReveal direction="up" delay={0.06} distance={12}>
          <div className="bg-[#FFF0E7] border border-[#FCD5C1] p-4 rounded-2xl flex items-center justify-between text-xs text-[#9A3412]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#EA580C] shrink-0" />
              <span>
                Doctor qualifications and consultation hours are verified against official hospital rosters.
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#9A3412]">
              Official Roster &bull; {new Date().getFullYear()}
            </span>
          </div>
        </ScrollReveal>

        {/* Doctor Cards Grid */}
        <StaggerContainer staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doc) => (
            <StaggerItem key={doc.id} hoverLift className="h-full">
              <Card className="overflow-hidden border-[#CBD7DD] hover:border-[#3DA9DF]/50 transition-all duration-200 flex flex-col justify-between hover:shadow-md bg-white h-full">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3DA9DF]/15 to-[#EBF6FC] flex items-center justify-center text-[#3DA9DF] border border-[#BCE1F5] font-bold text-lg">
                      {doc.fullName.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                    </div>
                    <Badge variant="medical-blue" size="sm" dot>
                      OPD Active
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#193247]">{doc.fullName}</h3>
                    <p className="text-xs font-bold text-[#3DA9DF] mt-0.5">{doc.designation}</p>
                    <p className="text-xs text-[#647785] mt-1">{doc.qualifications}</p>
                  </div>

                  <div className="bg-[#FCFDFB] p-3.5 rounded-xl border border-[#E5ECEF] text-xs space-y-2">
                    <div className="flex items-center gap-2 text-[#193247]">
                      <MapPin className="w-3.5 h-3.5 text-[#3DA9DF] shrink-0" />
                      <span>{doc.consultationRoom}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#193247]">
                      <Clock className="w-3.5 h-3.5 text-[#3DA9DF] shrink-0" />
                      <span>{doc.opdTimings}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#647785] block mb-1">
                      Consultation Days:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {doc.availableDays.map((day) => (
                        <span 
                          key={day} 
                          className="px-2 py-0.5 rounded-md bg-[#F3F8EC] border border-[#D5E8BA] text-[10px] font-bold text-[#486812]"
                        >
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#FCFDFB] border-t border-[#E5ECEF] flex items-center justify-between">
                  <Link to={`/book-appointment?doctor=${doc.id}`} className="w-full">
                    <Button variant="primary" size="sm" className="w-full font-bold" leftIcon={<Calendar className="w-4 h-4" />}>
                      Book Consultation with {doc.fullName.split(' ')[1] || 'Doctor'}
                    </Button>
                  </Link>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

      </div>
    </div>
  );
};