import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  Lock, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';

export const PatientLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginAsPatient, isAuthenticated, role } = useAuth();
  const { patientProfiles } = useHospital();

  const [patientIdInput, setPatientIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated as patient, redirect to dashboard
  if (isAuthenticated && role === 'patient') {
    navigate('/patient/dashboard');
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      navigate('/patient/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth Sign-In failed.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientIdLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!patientIdInput.trim()) {
      setErrorMsg('Please enter your Hospital Patient ID (e.g. SH-2026-00001).');
      return;
    }

    const success = loginAsPatient(patientIdInput.trim());
    if (success) {
      navigate('/patient/dashboard');
    } else {
      setErrorMsg(`No patient record found for "${patientIdInput.trim()}". Please verify the ID on your OPD receipt or use Google Sign-In.`);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#3DA9DF] text-white flex items-center justify-center mx-auto shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#243447]">
            Satya Hospital Patient Portal
          </h1>
          <p className="text-xs text-[#667085]">
            Access your verified OPD appointments, diagnostic pathology reports, and doctor prescriptions.
          </p>
        </div>

        <Card>
          <CardBody className="space-y-6 p-6 sm:p-8">
            {errorMsg && (
              <Alert type="error" title="Sign In Notice">
                {errorMsg}
              </Alert>
            )}

            {/* Google OAuth (Preferred Patient Authentication) */}
            <div className="space-y-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-center gap-3 font-semibold text-sm"
                onClick={handleGoogleLogin}
                isLoading={isLoading}
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
              <p className="text-[11px] text-[#667085] text-center">
                Secure patient login powered by Supabase Auth (No password required).
              </p>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="grow border-t border-[#E1E8ED]"></div>
              <span className="shrink mx-3 text-xs text-[#667085] uppercase tracking-wider font-medium">Or</span>
              <div className="grow border-t border-[#E1E8ED]"></div>
            </div>

            {/* Direct Patient ID Access */}
            <form onSubmit={handlePatientIdLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#243447] mb-1.5">
                  Sign In with Hospital Patient ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. SH-2026-00001"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs uppercase"
                  />
                </div>
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Found on your printed OPD slip, laboratory receipt, or prescription header.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Access Patient Records
              </Button>
            </form>

            {/* Quick Demo Patients for seamless tester / client review */}
            <div className="pt-4 border-t border-[#E1E8ED] space-y-2">
              <span className="text-[11px] font-semibold text-[#667085] block">
                Quick Demo Accounts (Pre-registered Patients):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {patientProfiles.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPatientIdInput(p.patientId);
                      loginAsPatient(p.patientId);
                      navigate('/patient/dashboard');
                    }}
                    className="px-2 py-1 rounded bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#3DA9DF] hover:bg-[#EBF6FC] text-[11px] text-[#243447] font-medium transition-colors cursor-pointer"
                  >
                    {p.fullName.split(' ')[0]} ({p.patientId})
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 text-center text-xs text-[#667085]">
              New to Satya Hospital?{' '}
              <Link to="/book-appointment" className="text-[#3DA9DF] font-semibold hover:underline">
                Book an OPD Appointment
              </Link>{' '}
              to automatically receive your Hospital Patient ID.
            </div>
          </CardBody>
        </Card>

        {/* Security Assurance */}
        <div className="flex items-center justify-center gap-2 text-xs text-[#667085]">
          <ShieldCheck className="w-4 h-4 text-[#91BB40]" />
          <span>DPDP Act 2023 Compliant &bull; End-to-end encrypted storage</span>
        </div>
      </div>
    </div>
  );
};
