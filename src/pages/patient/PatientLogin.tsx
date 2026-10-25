import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { AuthShell } from '../../components/site/AuthShell';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const PatientLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginAsPatient, isAuthenticated, role } = useAuth();
  const { patientProfiles } = useHospital();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated && role === 'patient') {
    return <Navigate to="/patient/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // With Supabase the browser redirects to Google; the demo fallback signs in immediately and the redirect above takes over.
      await loginWithGoogle();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Patient & family portal"
      description="See your child’s appointments, prescriptions and verified pathology reports."
      image={{ src: '/images/newborn-care.jpg', alt: 'A doctor gently examining a baby while the mother watches', position: '60% center' }}
      quote={{ heading: 'Your family’s records, in one calm place.', text: 'Upcoming tokens, prescriptions and lab reports — available on any device.' }}
    >
      <div className="space-y-6">
        {errorMsg && <Alert type="error">{errorMsg}</Alert>}

        <Button variant="outline" size="lg" className="w-full gap-3" onClick={handleGoogleLogin} isLoading={isLoading} loadingText="Connecting to Google…">
          <GoogleIcon />
          Continue with Google
        </Button>

        {import.meta.env.DEV && patientProfiles.length > 0 && (
          <div className="rounded-2xl border border-dashed border-line-strong p-4">
            <p className="text-xs font-semibold text-ink-500">Development demo patients</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {patientProfiles.slice(0, 3).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    loginAsPatient(p.patientId);
                    navigate('/patient/dashboard');
                  }}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700 cursor-pointer"
                >
                  {p.fullName.split(' ')[0]} · {p.patientId}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-ink-500">
          New to Satya Hospital?{' '}
          <Link to="/book-appointment" className="link">
            Book an appointment
          </Link>{' '}
          — your account is created when you sign in.
        </p>

        <p className="flex items-start gap-2 border-t border-line pt-5 text-[13px] text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
          Handled in line with India’s DPDP Act. Only you and your care team can see your records.
        </p>
      </div>
    </AuthShell>
  );
};
