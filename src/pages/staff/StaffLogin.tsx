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
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
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
    { role: 'reception', title: 'Reception Desk', icon: <Users className="w-4 h-4 text-[#3DA9DF]" /> },
    { role: 'doctor', title: 'Doctor', icon: <Stethoscope className="w-4 h-4 text-[#3DA9DF]" /> },
    { role: 'pathology', title: 'Pathology', icon: <Microscope className="w-4 h-4 text-[#91BB40]" /> },
    { role: 'admin', title: 'Super Admin', icon: <ShieldAlert className="w-4 h-4 text-amber-600" /> },
  ];

  const signedInStaff = isAuthenticated && role !== 'patient';

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FCFDFB]">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center mx-auto shadow-xs border border-[#BCE1F5]">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-[#193247]">Staff Sign-in</h1>
          <p className="text-xs text-[#647785]">Reception, clinical, laboratory and administrative personnel.</p>
        </div>

        {signedInStaff && (
          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm text-[#193247]">
                Signed in as <strong>{user?.fullName}</strong>{' '}
                <Badge variant="medical-blue" size="sm">{role.toUpperCase()}</Badge>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => goToWorkspace(role)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Continue to workspace
                </Button>
                <Button size="sm" variant="outline" onClick={() => logout()} leftIcon={<LogOut className="w-4 h-4" />}>
                  Sign out
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex w-full rounded-lg bg-[#F4F8FA] p-1 text-xs font-semibold" role="tablist">
              {(['password', 'magic'] as Method[]).map(m => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={method === m}
                  onClick={() => { setMethod(m); setErrorMsg(null); setMagicSentTo(null); }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-md cursor-pointer transition-colors ${
                    method === m ? 'bg-white text-[#193247] shadow-xs' : 'text-[#647785] hover:text-[#193247]'
                  }`}
                >
                  {m === 'password' ? <KeyRound className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                  {m === 'password' ? 'Email & password' : 'Email magic link'}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardBody className="space-y-4">
            {!isSupabaseConfigured && (
              <Alert type="warning" title="Supabase not configured">
                Email sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Use the development demo below.
              </Alert>
            )}
            {errorMsg && (
              <Alert type="error" title="Sign-in failed">
                {errorMsg}
              </Alert>
            )}
            {magicSentTo && (
              <Alert type="success" title="Check your inbox">
                A sign-in link was sent to {magicSentTo}. Open it on this device to continue.
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label htmlFor="staff-email" className="block text-xs font-semibold text-[#193247] mb-1">
                  Hospital email
                </label>
                <input
                  id="staff-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="reception@satyahospital.in"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD7DD] focus:outline-none focus:ring-2 focus:ring-[#3DA9DF]"
                  required
                />
              </div>
              {method === 'password' && (
                <div>
                  <label htmlFor="staff-password" className="block text-xs font-semibold text-[#193247] mb-1">
                    Password
                  </label>
                  <input
                    id="staff-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD7DD] focus:outline-none focus:ring-2 focus:ring-[#3DA9DF]"
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={submitting}
                disabled={!isSupabaseConfigured}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {method === 'password' ? 'Sign in' : 'Send sign-in link'}
              </Button>
            </form>

            <p className="text-[11px] text-[#647785] text-center">
              Staff accounts are provisioned by the Super Administrator. Sign-in attempts are audited.
            </p>
          </CardBody>
        </Card>

        {import.meta.env.DEV && (
          <Card className="border-dashed">
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#193247] uppercase tracking-wider">Development demo</span>
                <Badge variant="warning" size="sm">Local data only</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoRoles.map(d => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => setDemoRole(d.role)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      demoRole === d.role ? 'border-[#3DA9DF] bg-[#EBF6FC] text-[#193247]' : 'border-[#E5ECEF] text-[#647785] hover:bg-[#FCFDFB]'
                    }`}
                  >
                    {d.icon}
                    {d.title}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { loginAsDemoUser(demoRole); goToWorkspace(demoRole); }}
              >
                Enter as demo {demoRole}
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
