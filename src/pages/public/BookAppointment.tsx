import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Stethoscope, 
  Baby,
  Heart,
  FileText,
  Building,
  Info,
  Sparkles
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { 
  checkOnlineBookingCutoff, 
  getHospitalTodayDate, 
  getNextEligibleOpdDate,
  isValidIndianPhone 
} from '../../lib/tokens';
import { Appointment } from '../../types';

export const BookAppointment: React.FC = () => {
  const { settings, doctors, registerPatient, bookOnlineAppointment, searchPatients } = useHospital();
  const { user, patientProfile } = useAuth();

  const [searchParams] = useSearchParams();
  const qDoctor = searchParams.get('doctor');
  const qDate = searchParams.get('date');

  const todayStr = getHospitalTodayDate();
  const nextEligibleDate = getNextEligibleOpdDate({
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  const initialDocId = qDoctor && doctors.some(d => d.id === qDoctor) ? qDoctor : (doctors[0]?.id || '');
  const initialDate = qDate || nextEligibleDate;

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDocId);
  const [appointmentType, setAppointmentType] = useState<string>('pediatric');
  const [fullName, setFullName] = useState<string>(patientProfile?.fullName || user?.fullName || '');
  const [guardianName, setGuardianName] = useState<string>('');
  const [phone, setPhone] = useState<string>(patientProfile?.phone || user?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(patientProfile?.gender || 'male');
  const [age, setAge] = useState<string>(patientProfile?.age?.toString() || '4');
  const [ageUnit, setAgeUnit] = useState<'years' | 'months'>('years');
  const [notes, setNotes] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);

  // Status state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check cutoff live on selected date
  const cutoffStatus = checkOnlineBookingCutoff(selectedDate, {
    cutoffTimeStr: settings.onlineCutoffTime,
    operatingDays: settings.operatingDays,
    holidays: settings.holidays,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!agreeTerms) {
      setErrorMsg('You must acknowledge the hospital privacy notice and OPD policy.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }

    if (!isValidIndianPhone(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Check cutoff
    if (!cutoffStatus.allowed) {
      setErrorMsg(cutoffStatus.reason || 'Online bookings for today have closed.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Ensure patient record exists or register
      let patientIdToBook = patientProfile?.id;

      if (!patientIdToBook) {
        // Search if patient exists with this phone
        const existing = searchPatients(phone.trim());
        if (existing.length > 0) {
          patientIdToBook = existing[0].id;
        } else {
          const calculatedAgeYears = ageUnit === 'months' 
            ? Math.max(1, Math.round(parseInt(age, 10) / 12)) 
            : parseInt(age, 10) || undefined;

          const regResult = registerPatient(
            {
              fullName: fullName.trim(),
              phone: phone.trim(),
              gender,
              age: calculatedAgeYears,
              emergencyContact: guardianName ? `Guardian: ${guardianName.trim()}` : undefined,
            },
            'patient'
          );
          if (!regResult.success || !regResult.patient) {
            setErrorMsg(regResult.error || 'Failed to create patient record.');
            setIsSubmitting(false);
            return;
          }
          patientIdToBook = regResult.patient.id;
        }
      }

      // Step 2: Book the online appointment with idempotency key
      const idempotencyKey = `idemp_${patientIdToBook}_${selectedDate}_${Date.now()}`;
      const compositeNotes = [
        appointmentType === 'pediatric' ? '[Pediatric Consultation]' : appointmentType === 'newborn' ? '[Newborn Care]' : '[General OPD]',
        guardianName ? `Guardian: ${guardianName.trim()}` : null,
        notes.trim() ? notes.trim() : null
      ].filter(Boolean).join(' | ');

      const bookResult = bookOnlineAppointment({
        patientProfileId: patientIdToBook,
        appointmentDate: selectedDate,
        doctorId: selectedDoctorId,
        notes: compositeNotes || undefined,
        idempotencyKey,
      });

      if (!bookResult.success || !bookResult.appointment) {
        setErrorMsg(bookResult.error || 'Appointment booking failed.');
        setIsSubmitting(false);
        return;
      }

      setConfirmedBooking(bookResult.appointment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb / Headline */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-bold border border-[#BCE1F5]">
            <Baby className="w-3.5 h-3.5 text-[#3DA9DF]" />
            <span>Pediatric &amp; Family Outpatient Scheduling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#193247] tracking-tight">
            Book an OPD Appointment
          </h1>
          <p className="text-xs sm:text-sm text-[#647785] max-w-2xl leading-relaxed">
            Reserve your child’s sequential consultation token online. Same-day online reservations close promptly at <strong className="text-[#193247]">{settings.onlineCutoffTime} AM IST</strong>.
          </p>
        </div>

        {/* Confirmation View */}
        {confirmedBooking ? (
          <Card className="p-8 border-[#3DA9DF]/50 bg-white shadow-md animate-in fade-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 stroke-[2.3]" />
              </div>

              <div className="space-y-1">
                <Badge variant="medical-blue" size="md">
                  Confirmed OPD Token #{confirmedBooking.tokenNumber}
                </Badge>
                <h2 className="text-2xl font-bold text-[#193247] pt-2">
                  Appointment Successfully Reserved!
                </h2>
                <p className="text-xs text-[#647785]">
                  Reference Code: <strong className="text-[#193247]">{confirmedBooking.appointmentCode}</strong>
                </p>
              </div>

              {/* Token Summary Card */}
              <div className="w-full max-w-md bg-[#FCFDFB] border border-[#E5ECEF] rounded-2xl p-5 text-left text-xs space-y-2.5 my-4">
                <div className="flex justify-between py-1 border-b border-[#E5ECEF]">
                  <span className="text-[#647785]">Hospital Patient ID:</span>
                  <span className="font-bold text-[#193247]">{confirmedBooking.patientId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5ECEF]">
                  <span className="text-[#647785]">Patient Name:</span>
                  <span className="font-semibold text-[#193247]">{confirmedBooking.patientName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5ECEF]">
                  <span className="text-[#647785]">Appointment Date:</span>
                  <span className="font-semibold text-[#193247]">{confirmedBooking.appointmentDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5ECEF]">
                  <span className="text-[#647785]">Consulting Doctor:</span>
                  <span className="font-semibold text-[#193247]">{confirmedBooking.doctorName}</span>
                </div>
                <div className="flex justify-between py-1 pt-1.5">
                  <span className="text-[#647785]">Assigned Daily Token:</span>
                  <span className="font-extrabold text-base text-[#3DA9DF]">Token #{confirmedBooking.tokenNumber}</span>
                </div>
              </div>

              <div className="bg-[#EBF6FC] border border-[#BCE1F5] p-4 rounded-xl text-xs text-[#1E78A4] text-left max-w-md w-full">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#3DA9DF]" />
                  <span>Next Steps for Consultation:</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Please arrive at the hospital reception by <strong>09:30 AM</strong> on {confirmedBooking.appointmentDate}. Present this token code or your registered mobile number for check-in.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full max-w-md">
                <Link to="/patient/dashboard" className="flex-1">
                  <Button variant="primary" size="md" className="w-full font-bold">
                    Go to Patient Portal
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="md" 
                  className="flex-1"
                  onClick={() => {
                    setConfirmedBooking(null);
                    setSelectedDate(nextEligibleDate);
                    setNotes('');
                  }}
                >
                  Book Another Slot
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Booking Form */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Main Form (8 cols) */}
            <div className="lg:col-span-8">
              <Card className="border-[#CBD7DD] bg-white">
                <CardHeader className="border-b border-[#E5ECEF]">
                  <div className="flex items-center justify-between w-full">
                    <h2 className="text-base font-bold text-[#193247]">
                      Appointment Scheduling &amp; Patient Details
                    </h2>
                    <Badge variant="medical-blue" size="sm">
                      Complimentary Online Token
                    </Badge>
                  </div>
                </CardHeader>

                <CardBody>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {errorMsg && (
                      <Alert type="error" title="Booking Notice">
                        {errorMsg}
                      </Alert>
                    )}

                    {/* Cutoff Notice */}
                    {!cutoffStatus.allowed && (
                      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 space-y-2.5">
                        <div className="flex items-center gap-2 font-bold text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Online Booking Closed For {selectedDate}</span>
                        </div>
                        <p className="leading-relaxed">{cutoffStatus.reason}</p>
                        {cutoffStatus.nextEligibleDate && cutoffStatus.nextEligibleDate !== selectedDate && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(cutoffStatus.nextEligibleDate!);
                                setErrorMsg(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3DA9DF] text-white font-bold text-xs hover:bg-[#2B92C4] transition-colors"
                            >
                              <span>Switch to Next Eligible Date ({cutoffStatus.nextEligibleDate})</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consultation Type Selector */}
                    <div>
                      <label className="block text-xs font-bold text-[#193247] mb-2">
                        Select Care Discipline
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setAppointmentType('pediatric')}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            appointmentType === 'pediatric'
                              ? 'border-[#3DA9DF] bg-[#EBF6FC] text-[#3DA9DF]'
                              : 'border-[#E5ECEF] text-[#647785] hover:bg-[#FCFDFB]'
                          }`}
                        >
                          <Baby className="w-4 h-4" />
                          <span>Pediatric Care</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentType('newborn')}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            appointmentType === 'newborn'
                              ? 'border-[#91BB40] bg-[#F3F8EC] text-[#486812]'
                              : 'border-[#E5ECEF] text-[#647785] hover:bg-[#FCFDFB]'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Newborn Care</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentType('general')}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            appointmentType === 'general'
                              ? 'border-[#3DA9DF] bg-[#EBF6FC] text-[#3DA9DF]'
                              : 'border-[#E5ECEF] text-[#647785] hover:bg-[#FCFDFB]'
                          }`}
                        >
                          <Stethoscope className="w-4 h-4" />
                          <span>General OPD</span>
                        </button>
                      </div>
                    </div>

                    {/* Date & Doctor Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Appointment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setErrorMsg(null);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                          required
                        />
                        <span className="text-[11px] text-[#647785] mt-1 block">
                          OPD starts at 09:30 AM &bull; Cutoff at {settings.onlineCutoffTime} AM
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Consulting Specialist <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedDoctorId}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                        >
                          {doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.fullName} ({doc.department})
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-[#647785] mt-1 block">
                          Chamber: {doctors.find(d => d.id === selectedDoctorId)?.consultationRoom || 'OPD Hall'}
                        </span>
                      </div>
                    </div>

                    {/* Patient Name & Parent/Guardian Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Patient (Child / Adult) Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#647785] absolute left-3 top-3 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="e.g. Aarav Sharma"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Parent / Guardian Name (If Child)
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#647785] absolute left-3 top-3 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="e.g. Manoj Sharma (Father)"
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone & Gender & Age */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Mobile Number (10 digits) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-[#647785] absolute left-3 top-3 pointer-events-none" />
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="e.g. 9839123456"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Sex / Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-[#193247]">
                            Age <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setAgeUnit('years')}
                              className={`cursor-pointer ${ageUnit === 'years' ? 'text-[#3DA9DF] underline' : 'text-[#647785]'}`}
                            >
                              Years
                            </button>
                            <span className="text-[#CBD7DD]">|</span>
                            <button
                              type="button"
                              onClick={() => setAgeUnit('months')}
                              className={`cursor-pointer ${ageUnit === 'months' ? 'text-[#3DA9DF] underline' : 'text-[#647785]'}`}
                            >
                              Months
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={ageUnit === 'months' ? 24 : 120}
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Chief Reason / Notes */}
                    <div>
                      <label className="block text-xs font-bold text-[#193247] mb-1.5">
                        Chief Complaint / Medical Concerns (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Mild fever since yesterday, routine vaccination checkup..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#CBD7DD] text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      />
                    </div>

                    {/* Consent & Policy Checkbox */}
                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 text-xs text-[#647785] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-0.5 rounded border-[#CBD7DD] text-[#3DA9DF] focus:ring-[#3DA9DF]"
                        />
                        <span>
                          I confirm that the details provided are accurate and agree to Satya Hospital's{' '}
                          <Link to="/terms-and-conditions" className="text-[#3DA9DF] underline font-medium">Terms &amp; Conditions</Link>{' '}
                          and{' '}
                          <Link to="/privacy-policy" className="text-[#3DA9DF] underline font-medium">Privacy Policy</Link> (Digital Personal Data Protection Act compliant).
                        </span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full font-bold shadow-xs hover:shadow-md"
                      isLoading={isSubmitting}
                      disabled={!cutoffStatus.allowed}
                    >
                      Confirm OPD Appointment &amp; Generate Token
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </div>

            {/* Guidelines Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="p-5 border-[#CBD7DD] space-y-4 bg-white">
                <h3 className="text-sm font-bold text-[#193247] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#3DA9DF]" />
                  <span>OPD Queue Guidelines</span>
                </h3>

                <div className="space-y-3 text-xs text-[#647785]">
                  <div className="p-3 bg-[#FCFDFB] rounded-xl border border-[#E5ECEF]">
                    <strong className="text-[#193247] block mb-1">09:00 AM Strict Cutoff</strong>
                    Same-day online bookings close automatically at 09:00 AM IST to lock clinic workflow.
                  </div>

                  <div className="p-3 bg-[#FCFDFB] rounded-xl border border-[#E5ECEF]">
                    <strong className="text-[#193247] block mb-1">09:30 AM Clinic Start</strong>
                    Doctors begin patient consultations at 09:30 AM in their assigned OPD chambers.
                  </div>

                  <div className="p-3 bg-[#FCFDFB] rounded-xl border border-[#E5ECEF]">
                    <strong className="text-[#193247] block mb-1">Shared Daily Queue</strong>
                    Online appointments and walk-in arrivals share one unified sequential daily token queue. Offline walk-in registration at reception continues after 09:00 AM.
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5ECEF]">
                  <div className="flex items-center gap-2 text-xs text-[#486812]">
                    <ShieldCheck className="w-4 h-4 text-[#91BB40] shrink-0" />
                    <span>No upfront online consultation fee is charged.</span>
                  </div>
                </div>
              </Card>

              <div className="bg-[#F3F8EC] p-4 rounded-2xl border border-[#D5E8BA] text-xs text-[#486812] space-y-2">
                <div className="font-bold text-sm text-[#486812] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#91BB40]" />
                  <span>Walk-In OPD Registrations</span>
                </div>
                <p className="leading-relaxed text-[11px] text-[#647785]">
                  If the online cutoff has passed or you prefer registering in person, visit the hospital reception desk on the ground floor between 09:30 AM and 01:00 PM.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};