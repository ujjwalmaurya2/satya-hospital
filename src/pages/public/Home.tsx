import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Microscope, 
  Stethoscope, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  PhoneCall, 
  MapPin, 
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';

export const Home: React.FC = () => {
  const { settings, departments, doctors, pathologyTests, getTodayQueueStats } = useHospital();
  const queueStats = getTodayQueueStats();

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF6FC] via-[#F4F8FA] to-[#F4F8FA] pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-[#E1E8ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#BCE1F5] text-xs font-semibold text-[#1E78A4] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#91BB40] animate-pulse"></span>
                <span>Authoritative Healthcare &amp; Diagnostic Centre &bull; Prayagraj</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#243447] leading-tight sm:leading-tight">
                Modern Healthcare, <br />
                <span className="text-[#3DA9DF]">Accurate Diagnostics</span>, <br />
                <span className="text-[#243447]">Transparent Queue Management.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#667085] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Satya Hospital &amp; Pathology provides structured outpatient clinical care and high-precision laboratory diagnostics. Book OPD appointments online before the 9:00 AM cutoff or visit as a walk-in at 9:30 AM.
              </p>

              {/* Real-time Status Card */}
              <div className="bg-white p-4 rounded-xl border border-[#E1E8ED] shadow-xs max-w-xl mx-auto lg:mx-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F3F8EC] flex items-center justify-center text-[#91BB40] shrink-0">
                    <Clock className="w-5 h-5 text-[#688D23]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#243447]">Today's OPD Operational Status</div>
                    <div className="text-xs text-[#667085]">
                      Opens at 09:30 AM &bull; Same-Day Online Cutoff: {settings.onlineCutoffTime} AM IST
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant={queueStats.isCapacityFull ? 'danger' : 'lime-green'} size="sm" dot>
                    {queueStats.isCapacityFull ? 'Full Today' : `${queueStats.remainingCapacity} Slots Available`}
                  </Badge>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link to="/book-appointment" className="w-full sm:w-auto">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    leftIcon={<Calendar className="w-5 h-5" />}
                    className="w-full sm:w-auto font-semibold shadow-md"
                  >
                    Book OPD Appointment
                  </Button>
                </Link>

                <Link to="/pathology" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    leftIcon={<Microscope className="w-5 h-5 text-[#3DA9DF]" />}
                    className="w-full sm:w-auto"
                  >
                    Pathology Tests ({pathologyTests.length})
                  </Button>
                </Link>
              </div>

              {/* Operational Guarantee Points */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-[#667085]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40]" />
                  <span>Shared Walk-in &amp; Online Capacity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40]" />
                  <span>Verified Pathologist Sign-Off</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#91BB40]" />
                  <span>DPDP Data Protection</span>
                </div>
              </div>
            </div>

            {/* Right Card / Queue Snapshot Graphic */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-[#E1E8ED] p-6 shadow-md relative">
                <div className="flex items-center justify-between pb-4 border-b border-[#E1E8ED]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#3DA9DF]/10 flex items-center justify-center text-[#3DA9DF]">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#243447]">Daily OPD Queue Tracker</h3>
                      <p className="text-[11px] text-[#667085]">Live Token Monitor &bull; Satya Hospital</p>
                    </div>
                  </div>
                  <Badge variant="medical-blue" size="sm">
                    Token Active
                  </Badge>
                </div>

                <div className="py-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E1E8ED]">
                      <span className="text-xs text-[#667085] block mb-1">Total Registrations</span>
                      <span className="text-2xl font-bold text-[#243447]">{queueStats.totalBooked}</span>
                      <span className="text-[10px] text-[#91BB40] font-medium block mt-0.5">
                        {queueStats.onlineCount} Online + {queueStats.walkInCount} Walk-in
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E1E8ED]">
                      <span className="text-xs text-[#667085] block mb-1">Patients Waiting</span>
                      <span className="text-2xl font-bold text-[#3DA9DF]">{queueStats.waitingCount}</span>
                      <span className="text-[10px] text-[#667085] block mt-0.5">In OPD Lounge</span>
                    </div>
                  </div>

                  <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#92400E]">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
                    <div>
                      <span className="font-semibold">Online Booking Cutoff Rule:</span> Same-day appointments must be requested before 09:00 AM IST. After 09:00 AM, walk-in registration at hospital reception is required.
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E1E8ED] flex items-center justify-between text-xs">
                  <span className="text-[#667085]">Need urgent assistance?</span>
                  <a 
                    href={`tel:${settings.emergencyPhone.split(' ')[0]}`}
                    className="font-semibold text-[#3DA9DF] hover:underline flex items-center gap-1"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Emergency Desk</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. CORE CLINICAL PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#91BB40] tracking-wider uppercase">
            Clinical Standards
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#243447] mt-1">
            Built on Medical Integrity &amp; Strict Patient Safety
          </h2>
          <p className="text-sm text-[#667085] mt-2">
            Satya Hospital operates on verified clinician workflows, strict role boundaries, and authoritative data management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card hoverable className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">Verified Doctors</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Consultations conducted by credentialed medical specialists across General Medicine, Surgery, Orthopaedics, and Gynaecology.
            </p>
          </Card>

          <Card hoverable className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
              <Microscope className="w-6 h-6 text-[#688D23]" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">In-House Pathology</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Complete automated laboratory testing with a mandatory two-step sign-off process before reports are published to patients.
            </p>
          </Card>

          <Card hoverable className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">Shared Daily Capacity</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              A single authoritative queue synchronises online booked tokens and reception walk-ins, eliminating double bookings.
            </p>
          </Card>

          <Card hoverable className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-[#688D23]" />
            </div>
            <h3 className="text-base font-bold text-[#243447]">Secure Digital Records</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Patients access their own verified prescriptions and PDF diagnostic reports via short-lived signed URLs in the patient portal.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. CLINICAL DEPARTMENTS PREVIEW */}
      <section className="bg-white py-16 border-y border-[#E1E8ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold text-[#3DA9DF] uppercase tracking-wider">
                Specialised Care
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#243447] mt-1">
                Hospital Departments
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Explore our active clinical disciplines and outpatient consulting services.
              </p>
            </div>
            <Link to="/departments" className="mt-4 md:mt-0">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-[#3DA9DF]" />}>
                View All Departments
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.slice(0, 6).map((dept) => (
              <div 
                key={dept.id} 
                className="p-6 rounded-xl border border-[#E1E8ED] bg-[#F8FAFC] hover:bg-white hover:border-[#3DA9DF] transition-all duration-200 shadow-2xs group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-[#E1E8ED] flex items-center justify-center text-[#3DA9DF] group-hover:bg-[#3DA9DF] group-hover:text-white transition-colors">
                    <Activity className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    OPD Active
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-[#243447] mb-2">{dept.name}</h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-4">{dept.description}</p>
                <div className="pt-3 border-t border-[#E1E8ED]/60 flex items-center justify-between text-xs">
                  <span className="text-[#667085] truncate font-medium">Head: {dept.headOfDepartment}</span>
                  <Link to={`/services`} className="text-[#3DA9DF] font-semibold hover:underline shrink-0 ml-2">
                    Services &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW OPD BOOKING WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#243447] text-white rounded-2xl p-8 sm:p-12 shadow-lg relative overflow-hidden">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold text-[#91BB40] tracking-wider uppercase">
              Patient Guide
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              How OPD Booking Works at Satya Hospital
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mt-2">
              Our shared queue model ensures fairness for both online registrants and walk-in patients visiting our hospital reception.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-[#1C2937] p-6 rounded-xl border border-[#34465B] space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <h3 className="text-base font-semibold text-white">Book Online Before 9:00 AM</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Select your intended date and confirm your booking. Same-day online bookings close strictly at 9:00 AM IST to lock morning dispensary capacity.
              </p>
            </div>

            <div className="bg-[#1C2937] p-6 rounded-xl border border-[#34465B] space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#91BB40] text-[#243447] flex items-center justify-center text-sm font-bold">
                2
              </div>
              <h3 className="text-base font-semibold text-white">Instant OPD Token Generated</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                A unique Appointment ID and daily queue Token number are automatically generated and linked with your verified Hospital Patient ID.
              </p>
            </div>

            <div className="bg-[#1C2937] p-6 rounded-xl border border-[#34465B] space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-sm font-bold">
                3
              </div>
              <h3 className="text-base font-semibold text-white">OPD Consultation at 9:30 AM</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Report to the reception desk or doctor's room when your token is called. Patients arriving after cutoff are accommodated via walk-in tokens.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#34465B] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-white/70">
              Online booking opens 1 calendar day before the appointment and closes at 09:00 AM on the OPD date. Offline walk-in registration at reception continues after 09:00 AM.
            </span>
            <Link to="/book-appointment">
              <Button variant="accent" size="md">
                Proceed to Book OPD Slot
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. DIAGNOSTIC PATHOLOGY HIGHLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-bold text-[#3DA9DF] uppercase tracking-wider">
              Quality Laboratory Care
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#243447]">
              Complete Diagnostic Pathology on Premises
            </h2>
            <p className="text-sm text-[#667085] leading-relaxed">
              Satya Hospital operates an advanced in-house pathology and clinical laboratory. Blood and urine samples are collected, analyzed with calibrated auto-analyzers, and certified by our pathologist before publishing to your secure patient portal.
            </p>

            <ul className="space-y-2.5 text-xs text-[#243447]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40]" />
                <span>Routine &amp; specialized tests: CBC, LFT, KFT, Lipid, HbA1c, Thyroid</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40]" />
                <span>Fast turnaround: Routine hematology reports available in 2-4 hours</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40]" />
                <span>Traceable two-step verification safeguarding clinical accuracy</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link to="/pathology">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Full Test Catalogue
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl border border-[#E1E8ED] shadow-sm divide-y divide-[#E1E8ED]">
              <div className="p-4 bg-[#F8FAFC] flex items-center justify-between">
                <span className="text-xs font-bold text-[#243447] uppercase tracking-wider">
                  Popular Diagnostic Tests
                </span>
                <span className="text-xs text-[#667085]">Verified In-House Pricing</span>
              </div>
              {pathologyTests.slice(0, 4).map((test) => (
                <div key={test.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-[#243447]">{test.name}</div>
                    <div className="text-xs text-[#667085]">
                      Category: {test.category} &bull; Specimen: {test.specimenType} &bull; Turnaround: ~{test.turnaroundHours} hrs
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-base font-bold text-[#243447]">₹{test.price}</span>
                    <span className="block text-[10px] text-[#91BB40] font-semibold">Available</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOSPITAL TIMINGS, CONTACT & LOCATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-[#E1E8ED] p-8 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#243447]">Outpatient Consultation Hours</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                OPD clinics commence daily at <strong>{settings.opdStartTime} AM</strong>.
                Same-day online booking portal closes strictly at <strong>{settings.onlineCutoffTime} AM IST</strong>.
              </p>
              <div className="text-xs text-[#243447] font-semibold">
                Operating Days: Monday through Saturday
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#688D23]" />
              </div>
              <h3 className="text-base font-bold text-[#243447]">Location &amp; Address</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                {settings.address}
              </p>
              <div className="text-xs text-[#3DA9DF] font-semibold">
                Centrally located with patient parking &amp; accessible ramp entry.
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#243447]">Emergency &amp; General Desk</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                For routine queries, call the reception during working hours. For acute emergencies, contact the emergency desk.
              </p>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-[#667085]">General Desk: </span>
                  <strong className="text-[#243447]">{settings.phone}</strong>
                </div>
                <div>
                  <span className="text-[#667085]">Emergency Hotline: </span>
                  <strong className="text-[#DC2626]">{settings.emergencyPhone}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
