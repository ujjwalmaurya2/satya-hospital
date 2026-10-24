import React, { useState } from 'react';
import { CheckCircle2, Clock, Mail, MapPin, Phone, PhoneCall, Send, ShieldAlert } from 'lucide-react';
import { AnchorButton, Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { PageHero, Section } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';
import { cleanSettingText, isPlaceholder, phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { isValidIndianPhone } from '../../lib/tokens';
import { ENQUIRY_LIMITS, supabaseService } from '../../services/supabaseService';

export const Contact: React.FC = () => {
  const { settings } = useHospital();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Pediatric Enquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<'sent' | 'local' | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; message?: string }>({});

  const send = async () => {
    setIsSubmitting(true);
    setSendError(null);
    const res = await supabaseService.submitEnquiry({ name, phone, email, topic: department, message });
    setIsSubmitting(false);
    if (res.status === 'error') setSendError(res.error);
    else setOutcome(res.status);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Please enter your full name.';
    if (!isValidIndianPhone(phone)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email address or leave it blank.';
    if (!message.trim()) next.message = 'Please tell us how we can help.';
    else if (message.trim().length > ENQUIRY_LIMITS.message) next.message = `Please keep your message under ${ENQUIRY_LIMITS.message} characters.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    void send();
  };

  const desks = [
    {
      icon: <MapPin className="h-5 w-5" />,
      title: 'Hospital location',
      lines: [cleanSettingText(settings.address), 'Civil Lines, near Medical Crossing'],
      pending: isPlaceholder(settings.address),
    },
    {
      icon: <Phone className="h-5 w-5" />,
      title: 'Reception & OPD booking',
      lines: [phoneDisplay(settings.phone), 'Lines open 08:30 AM – 08:00 PM'],
      href: phoneHref(settings.phone),
      pending: isPlaceholder(settings.phone),
    },
    {
      icon: <PhoneCall className="h-5 w-5" />,
      title: '24×7 emergency desk',
      lines: [phoneDisplay(settings.emergencyPhone), 'For ambulance and acute stabilisation'],
      href: phoneHref(settings.emergencyPhone),
      urgent: true,
      pending: isPlaceholder(settings.emergencyPhone),
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'OPD timings',
      lines: [`From ${to12h(settings.opdStartTime)}, Monday to Saturday`, `Same-day online booking closes ${to12h(settings.onlineCutoffTime)}`],
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: 'Email',
      lines: [settings.email],
      href: `mailto:${settings.email}`,
    },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Contact' }]}
        eyebrow="Contact & location"
        title="We’re here to help"
        description="Reach the outpatient reception, pediatric enquiry line or pathology laboratory. In a life-threatening emergency, come directly to the hospital."
      />

      <Section size="md">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
              {desks.map(d => (
                <li key={d.title} className="flex gap-4 p-5 sm:p-6">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${
                      d.urgent ? 'bg-danger-50 text-danger-600 ring-danger-200' : 'bg-brand-50 text-brand-700 ring-brand-100'
                    }`}
                    aria-hidden="true"
                  >
                    {d.icon}
                  </span>
                  <div className="min-w-0">
                    <h2 className={`text-sm font-semibold ${d.urgent ? 'text-danger-700' : 'text-ink-900'}`}>{d.title}</h2>
                    {d.href ? (
                      <a href={d.href} className="mt-1 block break-words text-[15px] font-semibold text-ink-900 hover:text-brand-700">
                        {d.lines[0]}
                      </a>
                    ) : (
                      <p className="mt-1 text-[15px] text-ink-800">{d.lines[0]}</p>
                    )}
                    {d.lines[1] && <p className="mt-0.5 text-[13px] text-ink-500">{d.lines[1]}</p>}
                    {d.pending && <p className="mt-1.5 text-xs font-medium text-ink-400">Details awaiting confirmation by the hospital</p>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-500">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              Doctors’ personal mobile numbers are kept confidential. Clinical questions are handled through the OPD chambers.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
              {outcome ? (
                <div className="py-10 text-center" role="status">
                  {outcome === 'sent' ? (
                    <>
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
                        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">Thank you, {name.trim().split(' ')[0]}</h2>
                      <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-600">
                        Your enquiry has been sent. A member of the reception team will contact you on {phone}. For anything urgent, please call
                        reception.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-600">
                        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">Saved on this device only</h2>
                      <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-600">
                        Online enquiries aren’t connected yet, so the hospital has <strong>not</strong> received this message. Please call
                        reception{isPlaceholder(settings.phone) ? '' : ` on ${phoneDisplay(settings.phone)}`} so we can help you.
                      </p>
                      {!isPlaceholder(settings.phone) && (
                        <AnchorButton variant="primary" href={phoneHref(settings.phone)} className="mt-6" leftIcon={<Phone className="h-4 w-4" />}>
                          Call reception
                        </AnchorButton>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="mt-7"
                    onClick={() => {
                      setOutcome(null);
                      setName('');
                      setPhone('');
                      setEmail('');
                      setMessage('');
                    }}
                  >
                    Send another enquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-ink-900">Send an enquiry</h2>
                    <p className="mt-1 text-sm text-ink-500">The reception team reviews enquiries during working hours.</p>
                  </div>
                  {Object.keys(errors).length > 0 && <Alert type="error">Please correct the highlighted fields.</Alert>}
                  {sendError && Object.keys(errors).length === 0 && (
                    <Alert
                      type="error"
                      title="Enquiry not sent"
                      action={
                        <Button type="button" variant="outline" size="sm" onClick={() => void send()} isLoading={isSubmitting} loadingText="Retrying…">
                          Try again
                        </Button>
                      }
                    >
                      {sendError}
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="c-name" className="field-label">Full name</label>
                      <input
                        id="c-name"
                        className="field-control"
                        autoComplete="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'c-name-err' : undefined}
                      />
                      {errors.name && <p id="c-name-err" className="field-error">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="c-phone" className="field-label">Mobile number</label>
                      <input
                        id="c-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        className="field-control"
                        placeholder="10 digits"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? 'c-phone-err' : undefined}
                      />
                      {errors.phone && <p id="c-phone-err" className="field-error">{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="c-email" className="field-label">
                        Email <span className="font-normal text-ink-400">(optional)</span>
                      </label>
                      <input
                        id="c-email"
                        type="email"
                        autoComplete="email"
                        className="field-control"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'c-email-err' : undefined}
                      />
                      {errors.email && <p id="c-email-err" className="field-error">{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="c-dept" className="field-label">Topic</label>
                      <select id="c-dept" className="field-control" value={department} onChange={e => setDepartment(e.target.value)}>
                        <option value="Pediatric Enquiry">Pediatric & newborn care</option>
                        <option value="OPD Booking">OPD appointment booking</option>
                        <option value="Pathology Lab">Pathology & lab tests</option>
                        <option value="General Enquiry">General enquiry</option>
                        <option value="Patient Records">Medical document request</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="c-msg" className="field-label">Message</label>
                    <textarea
                      id="c-msg"
                      rows={5}
                      className="field-control resize-y"
                      placeholder="How can we help?"
                      value={message}
                      maxLength={ENQUIRY_LIMITS.message}
                      onChange={e => setMessage(e.target.value)}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? 'c-msg-err' : undefined}
                    />
                    {errors.message && <p id="c-msg-err" className="field-error">{errors.message}</p>}
                  </div>
                  <Button type="submit" size="lg" className="w-full sm:w-auto" isLoading={isSubmitting} loadingText="Sending…" leftIcon={<Send className="h-4 w-4" />}>
                    Send enquiry
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
};
