import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Users,
  Stethoscope,
  Microscope,
  ShieldAlert,
  Mail,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AuthShell } from '../../components/site/AuthShell';
import { cn } from '../../lib/cn';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { homePathForRole } from '../../lib/access';
import { UserRole } from '../../types';

type Method = 'password' | 'magic';

export const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, sendMagicLink, loginAsDemoUser, logout, isAuthenticated, role, user } = useAuth();

  const from = (location.state as { from?: string } | null)?.from;
  const goToWorkspace = (r: UserRole) => navigate(from && from !== '/staff/login' ? from : homePathForRole(r), { replace: true });

  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [demoRole, setDemoRole] = useState<UserRole>('reception');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setMagicSentTo(null);
    if (!email.trim()) {
      setErrorMsg('Enter your hospital email address.');
      return;
    }
    setSubmitting(true);
    try {
      if (method === 'password') {
        const signedIn = await signInWithEmail(email, password);
        if (signedIn.role === 'patient') {
          await logout();
          setErrorMsg('This is a patient account. Please use the patient portal.');
          return;
        }
        goToWorkspace(signedIn.role);
      } else {
        await sendMagicLink(email, from && from !== '/staff/login' ? from : '/staff');
        setMagicSentTo(email.trim());
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const demoRoles: { role: UserRole; title: string; icon: React.ReactNode }[] = [
    { role: 'reception', title: 'Reception', icon: <Users className="h-4 w-4" /> },
    { role: 'doctor', title: 'Doctor', icon: <Stethoscope className="h-4 w-4" /> },
    { role: 'pathology', title: 'Pathology', icon: <Microscope className="h-4 w-4" /> },
    { role: 'admin', title: 'Admin', icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  const signedInStaff = isAuthenticated && role !== 'patient';

  return (
    <AuthShell
      title="Staff sign-in"
      description="Reception, clinical, laboratory and administrative staff."
      image={{ src: '/images/satya-hospital-building.jpg', alt: 'Satya Hospital building, Civil Lines, Prayagraj', position: '58% center' }}
      quote={{ heading: 'Satya Hospital staff workspace', text: 'Accounts are provisioned by the hospital administrator. Every sign-in is recorded.' }}
    >
      <div className="space-y-6">
        {signedInStaff && (
          <div className="rounded-2xl border border-line bg-ink-50/60 p-4">
            <p className="text-sm text-ink-700">
              Signed in as <strong className="font-semibold text-ink-900">{user?.fullName}</strong>{' '}
              <Badge variant="medical-blue" size="sm" className="ml-1 capitalize">{role}</Badge>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => goToWorkspace(role)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue to workspace
              </Button>
              <Button size="sm" variant="ghost" onClick={() => logout()} leftIcon={<LogOut className="h-4 w-4" />}>
                Sign out
              </Button>
            </div>
          </div>
        )}

        <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 rounded-full bg-ink-50 p-1 text-sm font-semibold">
          {(['password', 'magic'] as Method[]).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => {
                setMethod(m);
                setErrorMsg(null);
                setMagicSentTo(null);
              }}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-2 rounded-full transition-colors cursor-pointer',
                method === m ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
              )}
            >
              {m === 'password' ? <KeyRound className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
              {m === 'password' ? 'Password' : 'Email link'}
            </button>
          ))}
        </div>

        {!isSupabaseConfigured && (
          <Alert type="warning" title="Supabase isn’t configured">
            Email sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </Alert>
        )}
        {errorMsg && <Alert type="error">{errorMsg}</Alert>}
        {magicSentTo && (
          <Alert type="success" title="Check your inbox">
            We sent a sign-in link to {magicSentTo}. Open it on this device to continue.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-email" className="field-label">Hospital email</label>
            <input
              id="staff-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@satyahospital.in"
              className="field-control"
              required
            />
          </div>
          {method === 'password' && (
            <div>
              <label htmlFor="staff-password" className="field-label">Password</label>
              <input
                id="staff-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field-control"
                required
              />
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={submitting}
            loadingText={method === 'password' ? 'Signing in…' : 'Sending link…'}
            disabled={!isSupabaseConfigured}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {method === 'password' ? 'Sign in' : 'Email me a sign-in link'}
          </Button>
        </form>

        {import.meta.env.DEV && (
          <div className="rounded-2xl border border-dashed border-line-strong p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-500">Development demo</p>
              <Badge variant="warning" size="sm">Local data only</Badge>
            </div>
            <div role="radiogroup" aria-label="Demo role" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {demoRoles.map(d => (
                <button
                  key={d.role}
                  type="button"
                  role="radio"
                  aria-checked={demoRole === d.role}
                  onClick={() => setDemoRole(d.role)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold cursor-pointer',
                    demoRole === d.role ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink-600 hover:border-ink-300'
                  )}
                >
                  {d.icon}
                  {d.title}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                loginAsDemoUser(demoRole);
                goToWorkspace(demoRole);
              }}
            >
              Enter as demo {demoRole}
            </Button>
          </div>
        )}

        <p className="flex items-start gap-2 border-t border-line pt-5 text-[13px] text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
          Staff accounts are provisioned by the administrator. Unrecognised email addresses can’t create accounts.
        </p>
      </div>
    </AuthShell>
  );
};
