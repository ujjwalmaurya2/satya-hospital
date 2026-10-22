import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Building,
  PhoneCall,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { useHospital } from '../../context/HospitalContext';
import { isValidIndianPhone } from '../../lib/tokens';

export const Contact: React.FC = () => {
  const { settings } = useHospital();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Pediatric Enquiry');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please enter your inquiry message.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 500);
  };

  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';
  const emergencyRaw = settings.emergencyPhone.split(' ')[0] || '+919838000000';

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F5EF] text-[#0F6B56] text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-[#168C8C]" />
            <span>Hospital Administration &amp; Helpdesk &bull; Satya Hospital Prayagraj</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#193247] tracking-tight">
            Contact &amp; Location Details
          </h1>
          <p className="text-sm text-[#647785] leading-relaxed">
            Reach our outpatient reception desk, pediatric inquiry line, or pathology laboratory. For acute life-threatening medical emergencies, please present directly to the hospital triage desk.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 border-[#CBD7DD] space-y-6 bg-white shadow-xs">
              <h2 className="text-base font-bold text-[#193247] pb-3 border-b border-[#E5ECEF]">
                Verified Hospital Desks
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E6F5EF] text-[#168C8C] flex items-center justify-center shrink-0 font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#193247] block text-sm">Hospital Location</strong>
                    <p className="text-[#647785] mt-0.5 leading-relaxed">{settings.address}</p>
                    <span className="text-[11px] text-[#168C8C] font-semibold block mt-1">
                      Civil Lines, Prayagraj &bull; Near Medical Crossing
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#DFF3FA] text-[#0E6E8C] flex items-center justify-center shrink-0 font-bold">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#193247] block text-sm">Reception &amp; OPD Booking Desk</strong>
                    <p className="text-[#193247] font-bold mt-0.5">{phoneRaw}</p>
                    <span className="text-[11px] text-[#0F6B56] font-semibold">Lines open: 08:30 AM - 08:00 PM</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF0E7] text-[#9A3412] flex items-center justify-center shrink-0 font-bold">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#9A3412] block text-sm">24x7 Emergency Desk</strong>
                    <p className="text-[#193247] font-bold mt-0.5">{emergencyRaw}</p>
                    <span className="text-[11px] text-[#647785]">Dedicated for urgent ambulance &amp; acute stabilization.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E6F5EF] text-[#168C8C] flex items-center justify-center shrink-0 font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#193247] block text-sm">OPD Timings</strong>
                    <p className="text-[#647785] mt-0.5">
                      Consultations begin at {settings.opdStartTime} AM daily (Mon&ndash;Sat).
                    </p>
                    <span className="text-[11px] text-[#168C8C] font-bold">Same-day online cutoff: {settings.onlineCutoffTime} AM IST</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FCFDFB] text-[#647785] border border-[#E5ECEF] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#193247] block text-sm">Official Email</strong>
                    <p className="text-[#647785] mt-0.5">{settings.email}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-[#FFF0E7] border border-[#FCD5C1] p-4 rounded-2xl text-xs text-[#9A3412] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Privacy Notice on Doctor Contact Details:</strong>
                Individual physician personal mobile numbers are kept strictly confidential to preserve medical ethics and record security. All clinical inquiries are addressed through hospital OPD chambers.
              </div>
            </div>
          </div>

          {/* Inquiry Form (7 cols) */}
          <div className="lg:col-span-7">
            <Card className="border-[#CBD7DD] bg-white">
              <CardHeader className="border-b border-[#E5ECEF]">
                <div>
                  <h2 className="text-base font-bold text-[#193247]">Send an Inquiry to Reception</h2>
                  <p className="text-xs text-[#647785] mt-0.5">
                    Our team will review your inquiry and follow up promptly.
                  </p>
                </div>
              </CardHeader>

              <CardBody>
                {submitted ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[#E6F5EF] text-[#168C8C] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.3]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#193247]">Inquiry Dispatched Successfully</h3>
                    <p className="text-xs text-[#647785] max-w-md mx-auto">
                      Thank you, {name}. Your inquiry has been routed to the Satya Hospital reception desk. A staff member will contact you at {phone}.
                    </p>
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSubmitted(false);
                          setName('');
                          setPhone('');
                          setMessage('');
                        }}
                      >
                        Submit Another Inquiry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                      <Alert type="error" title="Input Verification">
                        {errorMsg}
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Anil Maurya"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-xs text-[#193247] focus:ring-2 focus:ring-[#168C8C] focus:border-transparent bg-white shadow-2xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Phone Number (10 digits) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9839000000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-xs text-[#193247] focus:ring-2 focus:ring-[#168C8C] focus:border-transparent bg-white shadow-2xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. anil@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-xs text-[#193247] focus:ring-2 focus:ring-[#168C8C] focus:border-transparent bg-white shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#193247] mb-1.5">
                          Inquiry Department
                        </label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-xs text-[#193247] focus:ring-2 focus:ring-[#168C8C] focus:border-transparent bg-white shadow-2xs"
                        >
                          <option value="Pediatric Enquiry">Pediatric &amp; Newborn Care</option>
                          <option value="OPD Booking">OPD Appointment Booking</option>
                          <option value="Pathology Lab">Pathology &amp; Lab Tests</option>
                          <option value="General Enquiry">General Hospital Inquiry</option>
                          <option value="Patient Records">Medical Document Request</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#193247] mb-1.5">
                        Message / Question <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Please describe your question or requirements..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD7DD] text-xs text-[#193247] focus:ring-2 focus:ring-[#168C8C] focus:border-transparent bg-white shadow-2xs"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        className="w-full font-bold shadow-xs hover:shadow-md"
                        isLoading={isSubmitting}
                        leftIcon={<Send className="w-4 h-4" />}
                      >
                        Send Message to Reception
                      </Button>
                    </div>
                  </form>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};