import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Building
} from 'lucide-react';
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
  const [department, setDepartment] = useState('General Enquiry');
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
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Building className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Hospital Administration &amp; Helpdesk</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243447]">
          Get in Touch with Satya Hospital
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Reach our outpatient reception, pathology laboratory, or administrative office. For acute medical emergencies, please visit our emergency ward directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-[#CBD5E1] space-y-6">
            <h2 className="text-base font-bold text-[#243447] pb-3 border-b border-[#E1E8ED]">
              Official Hospital Desks
            </h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[#243447] block text-sm">Hospital Location</strong>
                  <p className="text-[#667085] mt-0.5 leading-relaxed">{settings.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#688D23]" />
                </div>
                <div>
                  <strong className="text-[#243447] block text-sm">General Reception</strong>
                  <p className="text-[#667085] mt-0.5">{settings.phone}</p>
                  <span className="text-[11px] text-[#91BB40] font-semibold">Lines open: 08:30 AM - 08:00 PM</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[#DC2626] block text-sm">24x7 Emergency Desk</strong>
                  <p className="text-[#243447] font-bold mt-0.5">{settings.emergencyPhone}</p>
                  <span className="text-[11px] text-[#667085]">Dedicated for urgent ambulance &amp; trauma triage.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[#243447] block text-sm">OPD Timing Standard</strong>
                  <p className="text-[#667085] mt-0.5">
                    Consultations start at {settings.opdStartTime} AM daily.
                  </p>
                  <span className="text-[11px] text-[#3DA9DF] font-medium">Online booking cutoff: {settings.onlineCutoffTime} AM IST</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] text-[#667085] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[#243447] block text-sm">Official Email</strong>
                  <p className="text-[#667085] mt-0.5">{settings.email}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl text-xs text-[#92400E] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">Notice on Staff Contact Information:</strong>
              Individual doctor personal mobile numbers are kept strictly confidential to preserve patient privacy and prevent unauthorized clinical triage outside of hospital records.
            </div>
          </div>
        </div>

        {/* Inquiry Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <h2 className="text-base font-bold text-[#243447]">Send an Administrative Inquiry</h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Our reception desk will review your message and respond within hospital working hours.
                </p>
              </div>
            </CardHeader>

            <CardBody>
              {submitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#243447]">Inquiry Dispatched Successfully</h3>
                  <p className="text-xs text-[#667085] max-w-md mx-auto">
                    Thank you, {name}. Your inquiry has been routed to the Satya Hospital administrative desk. A staff member will contact you at {phone}.
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
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Anil Maurya"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Phone Number (10 digits) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9839000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. anil@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                        Inquiry Department
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      >
                        <option value="General Enquiry">General Hospital Inquiry</option>
                        <option value="OPD Booking">OPD Appointment Help</option>
                        <option value="Pathology Lab">Pathology &amp; Lab Tests</option>
                        <option value="Patient Records">Medical Document Request</option>
                        <option value="Billing">Accounts &amp; Receipts</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                      Message / Question <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Please describe your question or requirements..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full font-semibold"
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
  );
};
