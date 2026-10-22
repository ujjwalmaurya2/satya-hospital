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
  FileText,
  Building
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

  // Form State - default to next eligible date or URL preselected query
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDocId);
  const [fullName, setFullName] = useState<string>(patientProfile?.fullName || user?.fullName || '');
  const [phone, setPhone] = useState<string>(patientProfile?.phone || user?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(patientProfile?.gender || 'male');
  const [age, setAge] = useState<string>(patientProfile?.age?.toString() || '35');
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
          const regResult = registerPatient(
            {
              fullName: fullName.trim(),
              phone: phone.trim(),
              gender,
              age: parseInt(age, 10) || undefined,
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
      const bookResult = bookOnlineAppointment({
        patientProfileId: patientIdToBook,
        appointmentDate: selectedDate,
        doctorId: selectedDoctorId,
        notes: notes.trim() || undefined,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb / Headline */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold mb-2">
          <Calendar className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Outpatient Department (OPD) Scheduling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#243447]">
          Book Online OPD Appointment
        </h1>
        <p className="text-sm text-[#667085] mt-1">
          Reserve your OPD consultation token. Same-day online bookings close strictly at <strong>{settings.onlineCutoffTime} AM IST</strong>.
        </p>
      </div>

      {/* Confirmation View */}
      {confirmedBooking ? (
        <Card className="p-8 border-[#91BB40] bg-white shadow-md animate-in fade-in duration-200">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <Badge variant="lime-green" size="md">
                Confirmed OPD Token #{confirmedBooking.tokenNumber}
              </Badge>
              <h2 className="text-2xl font-bold text-[#243447] pt-2">
                Appointment Successfully Reserved!
              </h2>
              <p className="text-xs text-[#667085]">
                Reference Code: <strong className="text-[#243447]">{confirmedBooking.appointmentCode}</strong>
              </p>
            </div>

            {/* Token Summary Card */}
            <div className="w-full max-w-md bg-[#F8FAFC] border border-[#E1E8ED] rounded-xl p-5 text-left text-xs space-y-2.5 my-4">
              <div className="flex justify-between py-1 border-b border-[#E1E8ED]">
                <span className="text-[#667085]">Hospital Patient ID:</span>
                <span className="font-bold text-[#243447]">{confirmedBooking.patientId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1E8ED]">
                <span className="text-[#667085]">Patient Name:</span>
                <span className="font-semibold text-[#243447]">{confirmedBooking.patientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1E8ED]">
                <span className="text-[#667085]">Appointment Date:</span>
                <span className="font-semibold text-[#243447]">{confirmedBooking.appointmentDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E1E8ED]">
                <span className="text-[#667085]">Consulting Doctor:</span>
                <span className="font-semibold text-[#243447]">{confirmedBooking.doctorName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#667085]">Assigned Daily Token:</span>
                <span className="font-extrabold text-base text-[#3DA9DF]">Token #{confirmedBooking.tokenNumber}</span>
              </div>
            </div>

            <div className="bg-[#EBF6FC] border border-[#BCE1F5] p-4 rounded-xl text-xs text-[#1E78A4] text-left max-w-md w-full">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#3DA9DF]" />
                <span>Next Steps for Consultation:</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Please arrive at the hospital reception by <strong>09:30 AM</strong> on {confirmedBooking.appointmentDate}. Present this token code or your registered mobile number for check-in.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full max-w-md">
              <Link to="/patient/dashboard" className="flex-1">
                <Button variant="primary" size="md" className="w-full">
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-base font-bold text-[#243447]">
                    Patient Information &amp; Schedule
                  </h2>
                  <Badge variant="neutral" size="sm">
                    Step 1 of 1
                  </Badge>
                </div>
              </CardHeader>

              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {errorMsg && (
                    <Alert type="error" title="Booking Validation Notice">
                      {errorMsg}
                    </Alert>
                  )}

                  {/* Cutoff Notice if Same-day and passed 9:00 AM or outside booking window */}
                  {!cutoffStatus.allowed && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Online Booking Not Available For {selectedDate}</span>
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3DA9DF] text-white font-semibold text-xs hover:bg-[#2C95CA] transition-colors"
                          >
                            <span>Switch to Next Eligible Date ({cutoffStatus.nextEligibleDate})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date & Doctor Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
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
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                        required
                      />
                      <span className="text-[11px] text-[#667085] mt-1 block">
                        Hospital Timezone: {settings.timezone}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Consulting Specialist <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      >
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.fullName} ({doc.department})
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-[#667085] mt-1 block">
                        Room: {doctors.find(d => d.id === selectedDoctorId)?.consultationRoom || 'OPD Hall'}
                      </span>
                    </div>
                  </div>

                  {/* Patient Name & Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Patient Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Verma"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Mobile Number (10 digits) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9839123456"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gender & Age */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Sex / Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Age (Years) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Chief Reason / Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                      Chief Reason for OPD Visit (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Follow-up for chest congestion, routine health checkup..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1] text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                    />
                  </div>

                  {/* Consent & Policy Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 text-xs text-[#667085] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded border-[#CBD5E1] text-[#3DA9DF] focus:ring-[#3DA9DF]"
                      />
                      <span>
                        I confirm that the details provided are accurate and agree to Satya Hospital's{' '}
                        <Link to="/terms-and-conditions" className="text-[#3DA9DF] underline">Terms &amp; Conditions</Link>{' '}
                        and{' '}
                        <Link to="/privacy-policy" className="text-[#3DA9DF] underline">Privacy Policy</Link> (Digital Personal Data Protection Act compliant).
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full font-semibold"
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
            <Card className="p-5 border-[#CBD5E1] space-y-4">
              <h3 className="text-sm font-bold text-[#243447] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#91BB40]" />
                <span>OPD Queue Guidelines</span>
              </h3>

              <div className="space-y-3 text-xs text-[#667085]">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED]">
                  <strong className="text-[#243447] block mb-1">09:00 AM Strict Cutoff</strong>
                  Same-day online bookings close automatically at 09:00 AM IST to lock clinic workflow.
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED]">
                  <strong className="text-[#243447] block mb-1">09:30 AM Clinic Start</strong>
                  Doctors begin patient consultations at 09:30 AM in their assigned OPD rooms.
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED]">
                  <strong className="text-[#243447] block mb-1">Shared Daily Queue</strong>
                  Online appointments and walk-in arrivals share one unified sequential daily token queue. Offline walk-in registration at reception continues after 09:00 AM.
                </div>
              </div>

              <div className="pt-2 border-t border-[#E1E8ED]">
                <div className="flex items-center gap-2 text-xs text-[#1E78A4]">
                  <ShieldCheck className="w-4 h-4 text-[#3DA9DF] shrink-0" />
                  <span>No upfront online consultation fee is charged.</span>
                </div>
              </div>
            </Card>

            <div className="bg-[#EBF6FC] p-4 rounded-xl border border-[#BCE1F5] text-xs text-[#1E78A4] space-y-2">
              <div className="font-semibold text-sm text-[#19597B]">
                Walk-In OPD Registrations
              </div>
              <p className="leading-relaxed">
                If the online cutoff has passed or you prefer registering in person, visit the hospital reception desk on the ground floor between 09:30 AM and 01:00 PM.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
