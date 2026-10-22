import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Activity, 
  Calendar, 
  FileText, 
  User, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  Home,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const PatientLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, patientProfile, logout } = useAuth();

  const navTabs = [
    { label: 'Overview', path: '/patient/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Appointments', path: '/patient/appointments', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Pathology Reports', path: '/patient/reports', icon: <FileText className="w-4 h-4" /> },
    { label: 'Prescriptions', path: '/patient/prescriptions', icon: <FileText className="w-4 h-4" /> },
    { label: 'My Profile', path: '/patient/profile', icon: <User className="w-4 h-4" /> },
    { label: 'Consent & Privacy', path: '/patient/consent-and-privacy', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col">
      {/* Patient Top Header */}
      <header className="bg-white border-b border-[#E1E8ED] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#3DA9DF] flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-[#243447] leading-none">Satya Hospital</h1>
                <span className="text-[11px] font-semibold text-[#91BB40] uppercase">Patient Portal</span>
              </div>
            </Link>

            {patientProfile && (
              <div className="ml-2 pl-3 border-l border-[#E1E8ED] flex items-center gap-2">
                <Badge variant="lime-green" size="md">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  ID: {patientProfile.patientId}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/book-appointment">
              <Button variant="accent" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                New Appointment
              </Button>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-[#667085] hover:text-red-600 hover:bg-[#F4F8FA] rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar for Patient Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-[#F1F5F9]">
          <nav className="flex space-x-1 sm:space-x-2 py-2" aria-label="Patient portal tabs">
            {navTabs.map((tab) => {
              const active = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#EBF6FC] text-[#3DA9DF] font-semibold'
                      : 'text-[#667085] hover:text-[#243447] hover:bg-[#F4F8FA]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Patient Footer */}
      <footer className="bg-white border-t border-[#E1E8ED] py-4 text-center text-xs text-[#667085]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Satya Hospital Secure Patient Portal &copy; {new Date().getFullYear()}</span>
          <span>Emergency OPD Helpline: +91 98380 00000 [Hospital Helpline Placeholder]</span>
        </div>
      </footer>
    </div>
  );
};
