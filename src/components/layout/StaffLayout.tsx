import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Stethoscope, 
  Microscope, 
  Menu, 
  X, 
  Home,
  Clock,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Badge } from '../common/Badge';

export const StaffLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, updateRole } = useAuth();

  const roleNavItems: Record<UserRole, { label: string; path: string; icon: React.ReactNode }[]> = {
    admin: [
      { label: 'Operational Overview', path: '/admin', icon: <Activity className="w-5 h-5" /> },
      { label: 'OPD & Hospital Rules', path: '/admin#rules', icon: <Clock className="w-5 h-5" /> },
      { label: 'Staff & Roles', path: '/admin#staff', icon: <Users className="w-5 h-5" /> },
      { label: 'Audit Trail Logs', path: '/admin#audit', icon: <ClipboardList className="w-5 h-5" /> },
      { label: 'System & Storage', path: '/admin#system', icon: <Settings className="w-5 h-5" /> },
    ],
    reception: [
      { label: 'OPD Queue & Arrivals', path: '/reception', icon: <Calendar className="w-5 h-5" /> },
      { label: 'Walk-In Registration', path: '/reception#register', icon: <Users className="w-5 h-5" /> },
      { label: 'Patient Search', path: '/reception#search', icon: <FileText className="w-5 h-5" /> },
      { label: 'Upload Rx Scan', path: '/reception#upload', icon: <FileText className="w-5 h-5" /> },
    ],
    doctor: [
      { label: 'My OPD Queue', path: '/doctor', icon: <Stethoscope className="w-5 h-5" /> },
      { label: 'Consultations & History', path: '/doctor#consultations', icon: <ClipboardList className="w-5 h-5" /> },
      { label: 'Prescription Verifications', path: '/doctor#prescriptions', icon: <FileText className="w-5 h-5" /> },
    ],
    pathology: [
      { label: 'Pathology Worklist', path: '/pathology-dashboard', icon: <Microscope className="w-5 h-5" /> },
      { label: 'Upload PDF Report', path: '/pathology-dashboard#upload', icon: <FileText className="w-5 h-5" /> },
      { label: 'Verify & Publish', path: '/pathology-dashboard#verify', icon: <ShieldCheck className="w-5 h-5" /> },
    ],
    patient: [
      { label: 'Patient Dashboard', path: '/patient/dashboard', icon: <Home className="w-5 h-5" /> },
    ],
  };

  const currentNav = roleNavItems[role] || roleNavItems.admin;

  const handleRoleSwitch = (newRole: UserRole) => {
    updateRole(newRole);
    if (newRole === 'admin') navigate('/admin');
    else if (newRole === 'reception') navigate('/reception');
    else if (newRole === 'doctor') navigate('/doctor');
    else if (newRole === 'pathology') navigate('/pathology-dashboard');
    else navigate('/patient/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-[#E1E8ED] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#3DA9DF] flex items-center justify-center text-white">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#243447]">Satya Hospital</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="lime-green" size="sm">
                {role.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-[#243447] hover:bg-[#F4F8FA] rounded-lg"
          aria-label="Toggle staff sidebar"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Staff Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-[#243447] text-white flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#34465B] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3DA9DF] flex items-center justify-center text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Satya Hospital</h2>
              <span className="text-xs font-semibold text-[#91BB40] uppercase">
                Staff Workspace
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white/60 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Card & Fast Role Switcher */}
        <div className="p-4 bg-[#1B2937] border-b border-[#34465B]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/60">Active Session:</span>
            <Badge variant="lime-green" size="sm" dot>
              {role.toUpperCase()}
            </Badge>
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {user?.fullName || 'Hospital Staff'}
          </div>
          <div className="text-xs text-white/60 truncate mt-0.5">
            {user?.email || 'staff@satyahospital.com'}
          </div>

          {/* Quick Role Switcher for verification */}
          <div className="mt-3 pt-3 border-t border-[#2A3E54]">
            <label className="text-[11px] font-semibold text-[#91BB40] block mb-1.5 uppercase tracking-wider">
              Switch Staff Panel:
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(['reception', 'doctor', 'pathology', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={`px-2 py-1.5 rounded-md text-left text-xs font-medium transition-colors cursor-pointer ${
                    role === r
                      ? 'bg-[#3DA9DF] text-white font-semibold'
                      : 'bg-[#243447] text-white/70 hover:bg-[#324559] hover:text-white'
                  }`}
                >
                  {r === 'admin' ? 'Super Admin' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Staff Navigation">
          <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-3 mb-2">
            Operations
          </div>
          {currentNav.map((item) => {
            const active = location.pathname === item.path || (location.pathname + location.hash) === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#3DA9DF] text-white shadow-xs'
                    : 'text-white/80 hover:bg-[#2D3E52] hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#34465B]">
            <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-3 mb-2">
              External Shortcuts
            </div>
            <Link
              to="/"
              className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs text-white/70 hover:bg-[#2D3E52] hover:text-white"
            >
              <Home className="w-4 h-4 text-[#3DA9DF]" />
              <span>Public Hospital Website</span>
            </Link>
            <Link
              to="/patient/dashboard"
              className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs text-white/70 hover:bg-[#2D3E52] hover:text-white"
            >
              <Users className="w-4 h-4 text-[#91BB40]" />
              <span>View Patient Portal</span>
            </Link>
          </div>
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-[#34465B] bg-[#1E2C3B]">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-semibold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 rounded-lg border border-red-900/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Workspace</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
};
