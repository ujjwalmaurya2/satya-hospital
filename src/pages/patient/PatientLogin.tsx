import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { AuthShell } from '../../components/site/AuthShell';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

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
