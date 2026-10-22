import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Activity, 
  ArrowRight, 
  Users, 
  Stethoscope, 
  Microscope,
  ShieldAlert
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsDemoUser, isAuthenticated, role } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('reception');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated with staff role, redirect to corresponding workspace
  if (isAuthenticated && role !== 'patient') {
    if (role === 'admin') navigate('/admin');
    else if (role === 'reception') navigate('/reception');
    else if (role === 'doctor') navigate('/doctor');
    else if (role === 'pathology') navigate('/pathology-dashboard');
  }

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsDemoUser(selectedRole);

    if (selectedRole === 'admin') navigate('/admin');
    else if (selectedRole === 'reception') navigate('/reception');
    else if (selectedRole === 'doctor') navigate('/doctor');
    else if (selectedRole === 'pathology') navigate('/pathology-dashboard');
  };

  const rolesList: { role: UserRole; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      role: 'reception',
      title: 'Reception Desk',
      desc: 'OPD queue management, walk-in registration & scan uploads',
      icon: <Users className="w-5 h-5 text-[#168C8C]" />,
    },
    {
      role: 'doctor',
      title: 'Consulting Doctor',
      desc: 'Patient consultation records, visit history & Rx verification',
      icon: <Stethoscope className="w-5 h-5 text-[#168C8C]" />,
    },
    {
      role: 'pathology',
      title: 'Pathology & Lab',
      desc: 'PDF lab report uploads, accession matching & verified publishing',
      icon: <Microscope className="w-5 h-5 text-[#168C8C]" />,
    },
    {
      role: 'admin',
      title: 'Hospital Super Admin',
      desc: 'Hospital settings, daily capacity limits & immutable audit logs',
      icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
    },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FCFDFB]">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#DFF3FA] text-[#168C8C] flex items-center justify-center mx-auto shadow-xs border border-teal-100">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-[#193247]">
            Satya Hospital Staff Workspace
          </h1>
          <p className="text-xs text-[#647785]">
            Authorized clinical, administrative, and laboratory personnel portal.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-[#193247] uppercase tracking-wider">
                Select Your Assigned Department Role
              </span>
              <Badge variant="teal" size="sm">
                Strict RLS Access
              </Badge>
            </div>
          </CardHeader>

          <CardBody className="space-y-6">
            {errorMsg && (
              <Alert type="error" title="Access Authorization">
                {errorMsg}
              </Alert>
            )}

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rolesList.map((item) => (
                <div
                  key={item.role}
                  onClick={() => setSelectedRole(item.role)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedRole === item.role
                      ? 'border-[#168C8C] bg-[#DFF3FA]/30 shadow-xs ring-1 ring-[#168C8C]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    {item.icon}
                    <input
                      type="radio"
                      name="staff_role"
                      checked={selectedRole === item.role}
                      onChange={() => setSelectedRole(item.role)}
                      className="text-[#168C8C] focus:ring-[#168C8C]"
                    />
                  </div>
                  <h3 className="text-xs font-bold text-[#193247]">{item.title}</h3>
                  <p className="text-[11px] text-[#647785] mt-0.5 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleStaffLogin} className="space-y-4 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Access {selectedRole.toUpperCase()} Workspace
              </Button>
            </form>

            <div className="pt-2 text-center text-[11px] text-[#647785]">
              Hospital staff accounts are provisioned and audited by the Super Administrator. Unauthorized login attempts are recorded.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
