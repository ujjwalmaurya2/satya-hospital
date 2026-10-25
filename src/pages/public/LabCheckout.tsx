import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, FlaskConical, LogOut, ShieldCheck } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { AuthShell } from '../../components/site/AuthShell';
import { PageHero, Section } from '../../components/site/Section';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getHospitalDateWithOffset, getHospitalTodayDate, isValidIndianPhone } from '../../lib/tokens';
import { newBookingKey } from '../../lib/opdForm';
import { formatPaise } from '../../lib/labCart';
import { cn } from '../../lib/cn';
import { labService } from '../../services/labService';
import { CartPanel, useLabCatalogue } from './LabTests';

type Gender = '' | 'male' | 'female' | 'other';

export const LabCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { user, patientProfile, role, isAuthenticated: anySession, isLiveSession, isLoading, authError, loginWithGoogle, logout } = useAuth();
  const { preview, cart, remove, clear, config, loading, error: catalogueError } = useLabCatalogue();
  // Orders need a real Supabase session; a stored demo login can't place one.
  const signedIn = isSupabaseConfigured ? isLiveSession : anySession;

  const [name, setName] = useState(patientProfile?.fullName || '');
  const [phone, setPhone] = useState(patientProfile?.phone || user?.phone || '');
  const [gender, setGender] = useState<Gender>('');
  const [collection, setCollection] = useState<'hospital_lab' | 'home'>('hospital_lab');
  const [visitDate, setVisitDate] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<false | 'order' | 'pay'>(false);
  const [key, setKey] = useState(newBookingKey);

  useEffect(() => {
    setName(n => n || patientProfile?.fullName || '');
    setPhone(p => p || patientProfile?.phone || user?.phone || '');
  }, [patientProfile?.fullName, patientProfile?.phone, user?.phone]);
  // A new request key whenever the order changes; an identical retry reuses it.
  useEffect(() => setKey(newBookingKey()), [JSON.stringify(cart), name, phone, gender, collection, visitDate]);

  const today = getHospitalTodayDate();
  const payOnline = config.online_payment_enabled;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs = {
      name: name.trim() ? undefined : 'Enter the patient’s name.',
      phone: isValidIndianPhone(phone) ? undefined : 'Enter a valid 10-digit mobile number.',
    };
    setErrors(errs);
    if (errs.name || errs.phone) return setFormError('Please check the highlighted fields.');
    if (!preview.lines.length) return setFormError('Your cart is empty.');
    if (preview.conflicts.length) return setFormError(preview.conflicts[0]);
    if (!agree) return setFormError('Please confirm the details and accept the terms to continue.');

    setBusy('order');
    try {
      const order = await labService.createOrder(cart, { patientName: name.trim(), phone, gender: gender || null }, collection, visitDate || null, key);
      clear();
      if (!payOnline) {
        navigate(`/lab-tests/orders/${order.order_number}`);
        return;
      }
      setBusy('pay');
      const result = await labService.pay(order.order_number, user?.email).catch(err => ({ failed: err instanceof Error ? err.message : 'Payment could not start.' }));
      const notice = result === 'paid' ? undefined : result === 'dismissed' ? 'Payment was cancelled. Your order is saved — pay now or at the lab.' : `${result.failed} You can try again.`;
      navigate(`/lab-tests/orders/${order.order_number}`, { state: { notice, justPaid: result === 'paid' } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
      setBusy(false);
    }
  };

  if (isLoading || loading) {
    return (
      <Section size="md">
        <MedicalLoader label="Loading checkout…" />
      </Section>
    );
  }

  if (!signedIn) {
    return (
      <AuthShell
        title="Sign in to book lab tests"
        description="Sign in with Google to place your order. Your cart is saved."
        image={{ src: '/images/satya-hospital-building.jpg', alt: 'Satya Hospital building, Civil Lines, Prayagraj', position: '58% center' }}
        quote={{ heading: 'Verified reports, privately in your account.', text: 'Reports are released only after the lab has checked them.' }}
      >
        <div className="space-y-5">
          {authError && <Alert type="error">{authError}</Alert>}
          {formError && <Alert type="error">{formError}</Alert>}
          {!isSupabaseConfigured && <Alert type="info" className="text-xs">Supabase is not configured, so lab orders can’t be placed in this preview.</Alert>}
          <Button
            size="lg"
            variant="outline"
            className="w-full gap-3"
            disabled={!isSupabaseConfigured}
            onClick={() => loginWithGoogle('/lab-tests/checkout').catch(err => setFormError(err instanceof Error ? err.message : 'Google sign-in could not start.'))}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <Link to="/lab-tests" className="link inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tests
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (role !== 'patient') {
    return (
      <Section size="md">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-card">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">You’re signed in as staff</h2>
          <p className="mt-2 text-[15px] text-ink-600">Register lab orders for patients from the Pathology orders desk, or sign out to book as a patient.</p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <LinkButton to="/lab-orders">Open Pathology orders</LinkButton>
            <Button variant="outline" onClick={() => logout()} leftIcon={<LogOut className="h-4 w-4" />}>Sign out</Button>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <>
      <PageHero crumbs={[{ label: 'Book lab tests', to: '/lab-tests' }, { label: 'Checkout' }]} eyebrow="Pathology lab" title="Lab test checkout" />
      <Section size="md">
        {catalogueError && <Alert type="error" className="mb-6">{catalogueError}</Alert>}
        <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {formError && <Alert type="error" title="We couldn’t continue">{formError}</Alert>}

            <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={Boolean(busy)}>
              <legend className="sr-only">Patient details</legend>
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">Who are the tests for?</h2>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="lab-name" className="field-label">Patient’s full name</label>
                  <input id="lab-name" value={name} onChange={e => setName(e.target.value)} className="field-control" aria-invalid={Boolean(errors.name)} autoComplete="off" required />
                  {errors.name && <p className="field-error">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="lab-phone" className="field-label">Mobile number</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">+91</span>
                    <input
                      id="lab-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="field-control pl-12"
                      aria-invalid={Boolean(errors.phone)}
                      autoComplete="tel-national"
                      required
                    />
                  </div>
                  {errors.phone && <p className="field-error">{errors.phone}</p>}
                </div>
                <div>
                  <label htmlFor="lab-gender" className="field-label">Gender <span className="font-normal text-ink-400">(optional)</span></label>
                  <select id="lab-gender" value={gender} onChange={e => setGender(e.target.value as Gender)} className="field-control">
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-3xl border border-line bg-white p-6 sm:p-8" disabled={Boolean(busy)}>
              <legend className="text-lg font-semibold tracking-tight text-ink-900">Sample collection</legend>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { id: 'hospital_lab', title: 'At the hospital lab', text: 'Visit the lab counter with your order number.', enabled: true },
                  { id: 'home', title: 'Home collection', text: config.home_collection_enabled ? 'A lab technician visits you.' : 'Not available yet.', enabled: config.home_collection_enabled },
                ] as const).map(o => (
                  <label
                    key={o.id}
                    className={cn(
                      'flex gap-3 rounded-2xl border p-4',
                      o.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
                      collection === o.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line'
                    )}
                  >
                    <input type="radio" name="collection" value={o.id} checked={collection === o.id} disabled={!o.enabled} onChange={() => setCollection(o.id)} className="mt-1 accent-brand-700" />
                    <span>
                      <span className="block text-sm font-semibold text-ink-900">{o.title}</span>
                      <span className="block text-[13px] text-ink-500">{o.text}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-5">
                <label htmlFor="lab-date" className="field-label">Planned visit date <span className="font-normal text-ink-400">(optional)</span></label>
                <input id="lab-date" type="date" min={today} max={getHospitalDateWithOffset(30, today)} value={visitDate} onChange={e => setVisitDate(e.target.value)} className="field-control w-auto" />
                <p className="field-hint">Check the preparation notes for each test — some need fasting.</p>
              </div>
            </fieldset>
          </div>

          <aside className="space-y-4 lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-4">
              <CartPanel preview={preview} onRemove={busy ? undefined : remove} checkout={false} />
              <div className="rounded-3xl border border-line bg-white p-6">
                <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink-600">
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-700" disabled={Boolean(busy)} />
                  <span>
                    These details are correct and I agree to the <Link to="/terms-and-conditions" className="link">terms</Link>,{' '}
                    <Link to="/refund-policy" className="link">refund</Link> and <Link to="/privacy-policy" className="link">privacy</Link> policies.
                  </span>
                </label>
                <Button
                  type="submit"
                  size="lg"
                  className="mt-5 w-full"
                  isLoading={Boolean(busy)}
                  loadingText={busy === 'pay' ? 'Waiting for payment…' : 'Placing order…'}
                  disabled={!preview.lines.length || preview.conflicts.length > 0}
                  leftIcon={payOnline ? <CreditCard className="h-[18px] w-[18px]" /> : <FlaskConical className="h-[18px] w-[18px]" />}
                >
                  {payOnline ? `Pay ${formatPaise(preview.totalPaise)} & book` : 'Place order · pay at lab'}
                </Button>
                <p className="mt-3 text-center text-xs text-ink-500">
                  {payOnline ? 'Secure payment by Razorpay. Your order is confirmed once the payment is verified.' : 'No online payment is taken. Pay at the lab counter when you visit.'}
                </p>
                <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-500">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                  <span className="min-w-0 truncate">Signed in as {user?.email}</span>
                </p>
              </div>
            </div>
          </aside>
        </form>
      </Section>
    </>
  );
};
