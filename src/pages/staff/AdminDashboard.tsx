import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Settings, 
  Users, 
  ClipboardList, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Cloud,
  Save,
  UserPlus
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Table } from '../../components/common/Table';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { auditLogger } from '../../lib/audit';
import { getSupabaseStatus, checkSupabaseHealth, SupabaseHealthStatus } from '../../lib/supabase';
import { demoAccounts } from '../../data/mockData';
import { UserRole } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { settings, updateSettings, patientProfiles, appointments, pathologyReports, getTodayQueueStats } = useHospital();
  const queueStats = getTodayQueueStats();
  const supabaseStatus = getSupabaseStatus();

  // Settings form
  const [opdStartTime, setOpdStartTime] = useState(settings.opdStartTime);
  const [onlineCutoffTime, setOnlineCutoffTime] = useState(settings.onlineCutoffTime);
  const [maxDailyCapacity, setMaxDailyCapacity] = useState(
    settings.maxDailyCapacity !== null && settings.maxDailyCapacity !== undefined ? settings.maxDailyCapacity.toString() : ''
  );
  const [operatingDays, setOperatingDays] = useState<string[]>(
    settings.operatingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [holidaysText, setHolidaysText] = useState((settings.holidays || []).join(', '));
  const [onlineBookingWindowDays, setOnlineBookingWindowDays] = useState(
    settings.onlineBookingWindowDays?.toString() || '1'
  );
  const [consultationFee, setConsultationFee] = useState(
    settings.consultationFee !== null && settings.consultationFee !== undefined ? settings.consultationFee.toString() : ''
  );
  const [isOnlinePaymentEnabled, setIsOnlinePaymentEnabled] = useState(settings.isOnlinePaymentEnabled || false);
  const [isPolicyApprovedByHospital, setIsPolicyApprovedByHospital] = useState(settings.isPolicyApprovedByHospital || false);
  const [emergencyPhone, setEmergencyPhone] = useState(settings.emergencyPhone);
  const [noticeBanner, setNoticeBanner] = useState(settings.noticeBanner || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active sub-tab
  const [adminTab, setAdminTab] = useState<'overview' | 'settings' | 'staff' | 'audit' | 'system'>('overview');
  
  // Supabase live health state
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [showMigrationSql, setShowMigrationSql] = useState(false);

  const handleCheckSupabaseHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);
    } catch {
      // safe fallback
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Audit Logs
  const auditLogs = auditLogger.getLogs();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCapacity = maxDailyCapacity.trim() ? parseInt(maxDailyCapacity, 10) : null;
    const parsedFee = consultationFee.trim() ? parseFloat(consultationFee) : null;
    const holidaysList = holidaysText.split(',').map(s => s.trim()).filter(Boolean);

    updateSettings(
      {
        opdStartTime,
        onlineCutoffTime,
        maxDailyCapacity: parsedCapacity,
        operatingDays,
        holidays: holidaysList,
        onlineBookingWindowDays: parseInt(onlineBookingWindowDays, 10) || 1,
        consultationFee: parsedFee,
        isOnlinePaymentEnabled,
        isPolicyApprovedByHospital,
        emergencyPhone,
        noticeBanner,
      },
      'admin'
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
            Hospital Super Administration Panel
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Operational rules governance, staff permissions, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="medical-blue" size="md">
            Super Administrator Session
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E1E8ED] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setAdminTab('overview')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            adminTab === 'overview' ? 'bg-[#243447] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Operational Overview
        </button>
        <button
          onClick={() => setAdminTab('settings')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            adminTab === 'settings' ? 'bg-[#243447] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          OPD &amp; Timing Rules
        </button>
        <button
          onClick={() => setAdminTab('staff')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            adminTab === 'staff' ? 'bg-[#243447] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Staff &amp; Access Roles ({demoAccounts.length})
        </button>
        <button
          onClick={() => setAdminTab('audit')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            adminTab === 'audit' ? 'bg-[#243447] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setAdminTab('system')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            adminTab === 'system' ? 'bg-[#243447] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Integration Readiness
        </button>
      </div>

      {/* TAB 1: OPERATIONAL OVERVIEW */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 border-[#CBD5E1]">
              <span className="text-xs text-[#667085] font-medium block">Authorised Patients</span>
              <div className="text-2xl font-bold text-[#243447] mt-1">{patientProfiles.length}</div>
              <span className="text-[11px] text-[#3DA9DF] block mt-0.5">Unique Patient IDs</span>
            </Card>

            <Card className="p-4 border-[#CBD5E1]">
              <span className="text-xs text-[#667085] font-medium block">Today's Total OPD Load</span>
              <div className="text-2xl font-bold text-[#243447] mt-1">{queueStats.totalBooked}</div>
              <span className="text-[11px] text-[#91BB40] font-semibold block mt-0.5">
                {settings.maxDailyCapacity ? `Cap: ${settings.maxDailyCapacity} max/day` : 'Unlimited Daily Intake'}
              </span>
            </Card>

            <Card className="p-4 border-[#CBD5E1]">
              <span className="text-xs text-[#667085] font-medium block">Total Diagnostic Reports</span>
              <div className="text-2xl font-bold text-[#243447] mt-1">{pathologyReports.length}</div>
              <span className="text-[11px] text-[#667085] block mt-0.5">
                {pathologyReports.filter(r => r.status === 'published').length} published
              </span>
            </Card>

            <Card className="p-4 border-[#CBD5E1]">
              <span className="text-xs text-[#667085] font-medium block">Audit Trail Entries</span>
              <div className="text-2xl font-bold text-[#243447] mt-1">{auditLogs.length}</div>
              <span className="text-[11px] text-[#3DA9DF] block mt-0.5">Tamper-evident logs</span>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-[#243447]">Active Operational Rules Summary</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED]">
                  <span className="text-[#667085] block">OPD Commencement:</span>
                  <strong className="text-sm text-[#243447]">{settings.opdStartTime} AM Daily</strong>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED]">
                  <span className="text-[#667085] block">Same-Day Online Cutoff:</span>
                  <strong className="text-sm text-red-600">{settings.onlineCutoffTime} AM IST</strong>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED]">
                  <span className="text-[#667085] block">Shared Daily Capacity:</span>
                  <strong className="text-sm text-[#3DA9DF]">
                    {settings.maxDailyCapacity ? `${settings.maxDailyCapacity} Patients Max` : 'Unlimited Intake (No Ceiling)'}
                  </strong>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 2: OPD & TIMINGS SETTINGS */}
      {adminTab === 'settings' && (
        <Card className="max-w-2xl">
          <CardHeader>
            <h2 className="text-base font-bold text-[#243447]">
              Configure Hospital Scheduling &amp; Capacity
            </h2>
          </CardHeader>

          <CardBody>
            {saveSuccess && (
              <Alert type="success" title="Rules Applied">
                Hospital operational settings updated and synchronized across all portals.
              </Alert>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">
                    OPD Daily Start Time
                  </label>
                  <input
                    type="time"
                    value={opdStartTime}
                    onChange={(e) => setOpdStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    required
                  />
                  <span className="text-[11px] text-[#667085] mt-1 block">Default: 09:30 AM</span>
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">
                    Same-Day Online Booking Cutoff
                  </label>
                  <input
                    type="time"
                    value={onlineCutoffTime}
                    onChange={(e) => setOnlineCutoffTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    required
                  />
                  <span className="text-[11px] text-[#667085] mt-1 block">Default: 09:00 AM IST</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">
                    Online Booking Advance Window (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={onlineBookingWindowDays}
                    onChange={(e) => setOnlineBookingWindowDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    required
                  />
                  <span className="text-[11px] text-[#667085] mt-1 block">
                    Default: 1 calendar day before appointment date.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">
                    Maximum Daily Capacity (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank for Unlimited"
                    value={maxDailyCapacity}
                    onChange={(e) => setMaxDailyCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                  />
                  <span className="text-[11px] text-[#667085] mt-1 block">
                    Default is unlimited (no fixed daily ceiling).
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Operating Days of Week
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 pt-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} className="flex items-center gap-1.5 text-xs text-[#243447] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={operatingDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setOperatingDays([...operatingDays, day]);
                          } else {
                            setOperatingDays(operatingDays.filter(d => d !== day));
                          }
                        }}
                        className="rounded border-[#CBD5E1] text-[#3DA9DF]"
                      />
                      <span>{day.substring(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Scheduled Hospital Holidays (Comma-separated YYYY-MM-DD)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-11-04, 2026-12-25"
                  value={holidaysText}
                  onChange={(e) => setHolidaysText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Dates when OPD booking and clinics are suspended for scheduled holidays.
                </span>
              </div>

              <div className="p-4 rounded-xl border border-[#E1E8ED] bg-[#F8FAFC] space-y-3">
                <div className="font-semibold text-[#243447]">
                  Consultation Fee &amp; Payment Gateway (Pending Approval)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#667085] mb-1">
                      OPD Consultation Fee (₹ INR)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 300 (or leave blank for free)"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
                    />
                    <span className="text-[10px] text-[#667085] mt-1 block">
                      Keep unconfigured until hospital board approval.
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOnlinePaymentEnabled}
                        onChange={(e) => setIsOnlinePaymentEnabled(e.target.checked)}
                        className="rounded border-[#CBD5E1] text-[#3DA9DF]"
                      />
                      <span className="font-medium text-[#243447]">Enable Live Razorpay Payments</span>
                    </label>
                    <span className="text-[10px] text-amber-700 block">
                      Disabled by default until hospital approves fee &amp; refund policy.
                    </span>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPolicyApprovedByHospital}
                        onChange={(e) => setIsPolicyApprovedByHospital(e.target.checked)}
                        className="rounded border-[#CBD5E1] text-[#3DA9DF]"
                      />
                      <span className="font-medium text-[#243447]">Hospital Board Policy Approval</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Emergency Desk Hotline
                </label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Public Portal Notice Banner
                </label>
                <textarea
                  rows={2}
                  value={noticeBanner}
                  onChange={(e) => setNoticeBanner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />}>
                  Save &amp; Publish Hospital Configuration
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* TAB 3: STAFF & ROLES */}
      {adminTab === 'staff' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-base font-bold text-[#243447]">Staff Access Directory</h2>
                <p className="text-xs text-[#667085]">Role-based access enforced via database RLS.</p>
              </div>
              <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                Invite Staff Account
              </Button>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <Table
              data={demoAccounts}
              keyExtractor={(item) => item.id}
              columns={[
                {
                  header: 'Staff Member',
                  cell: (item) => (
                    <div>
                      <div className="font-bold text-[#243447]">{item.fullName}</div>
                      <div className="text-[11px] text-[#667085]">{item.email}</div>
                    </div>
                  ),
                },
                {
                  header: 'Assigned Role',
                  cell: (item) => (
                    <Badge variant={item.role === 'admin' ? 'medical-blue' : item.role === 'doctor' ? 'lime-green' : 'neutral'} size="sm">
                      {item.role.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  header: 'Account Status',
                  cell: (item) => (
                    <span className="text-xs text-[#91BB40] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active &bull; Audited
                    </span>
                  ),
                },
                {
                  header: 'Permissions Scope',
                  cell: (item) => (
                    <span className="text-xs text-[#667085]">
                      {item.role === 'admin' ? 'Full operational settings & audits' :
                       item.role === 'doctor' ? 'Clinical visits & prescription sign-off' :
                       item.role === 'reception' ? 'Queue management & walk-ins' :
                       item.role === 'pathology' ? 'PDF report upload & publishing' : 'Patient portal only'}
                    </span>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {adminTab === 'audit' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-base font-bold text-[#243447]">Traceable Audit Logs</h2>
                <p className="text-xs text-[#667085]">Immutable security trace of all clinical and administrative actions.</p>
              </div>
              <Badge variant="neutral" size="sm">
                {auditLogs.length} Events Logged
              </Badge>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <Table
              data={auditLogs}
              keyExtractor={(item) => item.id}
              emptyMessage="No audit logs recorded yet."
              columns={[
                {
                  header: 'Timestamp',
                  cell: (item) => (
                    <span className="font-mono text-[11px] text-[#667085] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleTimeString()} &bull; {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  header: 'Actor',
                  cell: (item) => (
                    <div>
                      <div className="font-semibold text-xs text-[#243447]">{item.actorName}</div>
                      <Badge variant="neutral" size="sm">{item.actorRole.toUpperCase()}</Badge>
                    </div>
                  ),
                },
                {
                  header: 'Action Type',
                  cell: (item) => (
                    <span className="font-mono text-xs text-[#3DA9DF] font-semibold">
                      {item.actionType}
                    </span>
                  ),
                },
                {
                  header: 'Description',
                  cell: (item) => (
                    <span className="text-xs text-[#243447] max-w-sm truncate block">
                      {item.description}
                    </span>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      )}

      {/* TAB 5: SYSTEM & INTEGRATION READINESS */}
      {adminTab === 'system' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-[#243447]">
                Backend &amp; Storage Boundaries Status
              </h2>
            </CardHeader>

            <CardBody className="space-y-4 text-xs">
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E1E8ED] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#3DA9DF]" />
                    <span className="font-bold text-[#243447]">Supabase PostgreSQL &amp; Auth</span>
                  </div>
                  <Badge variant={supabaseStatus.configured ? 'lime-green' : 'warning'} size="sm">
                    {supabaseStatus.configured ? 'Configured in Environment' : 'Local Fallback Active'}
                  </Badge>
                </div>
                <p className="text-[#667085]">
                  Endpoint URL: <strong className="font-mono text-[11px] text-[#193247]">{supabaseStatus.url}</strong>
                </p>
                {supabaseStatus.missingVariables.length > 0 && (
                  <p className="text-amber-800 text-[11px]">
                    Missing environment variables: {supabaseStatus.missingVariables.join(', ')}
                  </p>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleCheckSupabaseHealth}
                    isLoading={isCheckingHealth}
                  >
                    Test Live Database Health
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[#3DA9DF]"
                    onClick={() => setShowMigrationSql(!showMigrationSql)}
                  >
                    {showMigrationSql ? 'Hide Migration SQL' : 'View Migration SQL Instructions'}
                  </Button>
                </div>

                {supabaseHealth && (
                  <div className={`p-3 rounded-xl border text-xs space-y-2 mt-2 ${
                    supabaseHealth.reachable 
                      ? supabaseHealth.tablesDetected.length > 0 
                        ? 'bg-[#F3F8EC] border-[#D5E8BA] text-[#486812]'
                        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>Live Diagnostic Result:</span>
                      <span className="text-[10px] text-[#647785]">Checked {new Date(supabaseHealth.lastChecked).toLocaleTimeString()}</span>
                    </div>
                    {supabaseHealth.errorMessage && (
                      <p className="text-xs">{supabaseHealth.errorMessage}</p>
                    )}
                    {supabaseHealth.tablesDetected.length > 0 && (
                      <div>
                        <strong>Tables Detected ({supabaseHealth.tablesDetected.length}):</strong> {supabaseHealth.tablesDetected.join(', ')}
                      </div>
                    )}
                    {supabaseHealth.tablesMissing.length > 0 && (
                      <div className="text-[11px]">
                        <strong>Pending Tables:</strong> {supabaseHealth.tablesMissing.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {showMigrationSql && (
                  <div className="p-3 bg-white rounded-xl border border-[#CBD7DD] space-y-2 text-xs">
                    <div className="font-bold text-[#193247]">Supabase SQL Migration Instructions:</div>
                    <p className="text-[#647785] text-[11px] leading-relaxed">
                      To initialize or verify all tables in Supabase, open your Supabase Dashboard &rarr; <strong>SQL Editor</strong>, and execute the migration file located at:
                      <code className="block mt-1 p-2 bg-[#F8FAFC] rounded border font-mono text-[10px] text-[#193247]">
                        supabase/migrations/20261022000001_satya_hospital_schema.sql<br />
                        supabase/migrations/20261023000002_gallery_and_testimonials.sql
                      </code>
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E1E8ED] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-[#91BB40]" />
                    <span className="font-bold text-[#243447]">Cloudflare R2 / PDF Storage Boundary</span>
                  </div>
                  <Badge variant="lime-green" size="sm">
                    Boundary Ready (Private Bucket Guard)
                  </Badge>
                </div>
                <p className="text-[#667085]">
                  Short-lived signed URLs, 10 MB file ceiling, PDF MIME-type verification, and role guards are active.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
