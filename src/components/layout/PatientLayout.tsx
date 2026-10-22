import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Heart, 
  Calendar, 
  FileText, 
  User, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  Home,
  CheckCircle2,
  Baby
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
    <div className="min-h-screen bg-[#FCFDFB] flex flex-col">
      {/* Patient Top Header */}
      <header className="bg-white border-b border-[#E5ECEF] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#168C8C] to-[#0E5C5C] flex items-center justify-center text-white shadow-2xs">
                <Heart className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-extrabold text-[#193247] leading-none">Satya Hospital</h1>
                <span className="text-[11px] font-bold text-[#168C8C] uppercase tracking-wide">Patient Portal</span>
              </div>
            </Link>

            {patientProfile && (
              <div className="ml-2 pl-3 border-l border-[#E5ECEF] flex items-center gap-2">
                <Badge variant="teal" size="md">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  ID: {patientProfile.patientId}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/book-appointment">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />} className="font-bold">
                New OPD Appointment
              </Button>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-[#647785] hover:text-red-600 hover:bg-[#E6F5EF] rounded-xl transition-colors cursor-pointer"
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#E6F5EF] text-[#168C8C]'
                      : 'text-[#647785] hover:text-[#193247] hover:bg-[#FCFDFB]'
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

      {/* Main Outlet Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Portal Footer */}
      <footer className="bg-white border-t border-[#E5ECEF] py-4 text-center text-xs text-[#647785]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Satya Hospital &amp; Pathology &bull; Civil Lines, Prayagraj</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#0F6B56]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#168C8C]" />
            DPDP Act Compliant Medical Record Protection
          </span>
        </div>
      </footer>
    </div>
  );
};