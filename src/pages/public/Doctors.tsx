import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Stethoscope, 
  Clock, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';

export const Doctors: React.FC = () => {
  const { doctors, settings } = useHospital();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <UserCheck className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Medical Practitioners Directory</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243447]">
          Our Consultant Medical Specialists
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Satya Hospital's physicians and surgeons bring extensive clinical experience across outpatient medicine, surgery, orthopaedics, and women's health.
        </p>
      </div>

      {/* Verification Notice */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl flex items-center justify-between text-xs text-[#92400E]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            Doctor qualifications and consultation hours are verified against official hospital rosters.
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#B45309]">
          Updated Roster &bull; {new Date().getFullYear()}
        </span>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map((doc) => (
          <Card key={doc.id} className="overflow-hidden border-[#CBD5E1] hover:border-[#3DA9DF] transition-all duration-200 flex flex-col justify-between">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3DA9DF]/20 to-[#91BB40]/20 flex items-center justify-center text-[#3DA9DF] border border-[#BCE1F5]">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <Badge variant="lime-green" size="sm">
                  OPD Available
                </Badge>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#243447]">{doc.fullName}</h3>
                <p className="text-xs font-semibold text-[#3DA9DF] mt-0.5">{doc.designation}</p>
                <p className="text-xs text-[#667085] mt-1">{doc.qualifications}</p>
              </div>

              <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E1E8ED] text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#243447]">
                  <MapPin className="w-3.5 h-3.5 text-[#3DA9DF] shrink-0" />
                  <span>{doc.consultationRoom}</span>
                </div>
                <div className="flex items-center gap-2 text-[#243447]">
                  <Clock className="w-3.5 h-3.5 text-[#91BB40] shrink-0" />
                  <span>{doc.opdTimings}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#667085] block mb-1">
                  Consultation Days:
                </span>
                <div className="flex flex-wrap gap-1">
                  {doc.availableDays.map((day) => (
                    <span 
                      key={day} 
                      className="px-2 py-0.5 rounded-md bg-[#F4F8FA] border border-[#E1E8ED] text-[10px] font-medium text-[#243447]"
                    >
                      {day.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E8ED] flex items-center justify-between">
              <Link to="/book-appointment" className="w-full">
                <Button variant="primary" size="sm" className="w-full" leftIcon={<Calendar className="w-4 h-4" />}>
                  Book with {doc.fullName.split(' ')[1] || 'Doctor'}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* OPD Scheduling Note */}
      <div className="bg-[#243447] text-white p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Looking for a specific consultant?</h3>
          <p className="text-xs text-white/70">
            Same-day online token bookings close at {settings.onlineCutoffTime} AM. Walk-in tokens can be requested at the reception counter at 09:30 AM.
          </p>
        </div>
        <Link to="/book-appointment" className="shrink-0">
          <Button variant="accent" size="md">
            Reserve OPD Consultation
          </Button>
        </Link>
      </div>
    </div>
  );
};
