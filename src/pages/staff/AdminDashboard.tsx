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
import { Avatar, PageHeader, Panel, StatCard, Tabs } from '../../components/dashboard/Dashboard';
import { to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';
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

type AdminTab = 'overview' | 'settings' | 'staff' | 'audit' | 'system';

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
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  
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

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const scope: Record<UserRole, string> = {
    admin: 'Settings, audit logs and every desk',
    doctor: 'Consultations and prescription sign-off',
    reception: 'Queue, walk-ins and scan uploads',
    pathology: 'Report upload, verification and publishing',
    patient: 'Own records only',
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Hospital overview" description="Operational rules, staff access, audit trail and integrations." />

      <Panel flush>
        <Tabs
          label="Administration sections"
          layoutId="admin-tab"
          value={adminTab}
          onChange={setAdminTab}
          className="px-3 sm:px-4"
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'settings', label: 'OPD rules' },
            { id: 'staff', label: 'Staff & roles' },
            { id: 'audit', label: 'Audit log', count: auditLogs.length },
            { id: 'system', label: 'Integrations' },
          ]}
        />

        {adminTab === 'overview' && (
          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Registered patients" value={patientProfiles.length} hint="Unique patient IDs" icon={<Users className="h-4 w-4" />} tone="brand" />
              <StatCard
                label="Today’s OPD"
                value={queueStats.totalBooked}
                hint={settings.maxDailyCapacity ? `Cap ${settings.maxDailyCapacity} per day` : 'No daily cap'}
                icon={<Activity className="h-4 w-4" />}
                tone="leaf"
              />
              <StatCard
                label="Lab reports"
                value={pathologyReports.length}
                hint={`${pathologyReports.filter(r => r.status === 'published').length} published`}
                icon={<ClipboardList className="h-4 w-4" />}
              />
              <StatCard label="Audit entries" value={auditLogs.length} hint="This browser session" icon={<ShieldAlert className="h-4 w-4" />} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold text-ink-900">Active rules</h2>
              <dl className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
                {[
                  ['OPD begins', `${to12h(settings.opdStartTime)} daily`],
                  ['Same-day online cutoff', `${to12h(settings.onlineCutoffTime)} IST`],
                  ['Daily capacity', settings.maxDailyCapacity ? `${settings.maxDailyCapacity} patients` : 'Unlimited'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white p-5">
                    <dt className="text-[13px] text-ink-500">{k}</dt>
                    <dd className="mt-1 text-lg font-semibold text-ink-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {adminTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-6 p-5 sm:p-6">
            {saveSuccess && (
              <Alert type="success" title="Settings saved">
                Hospital settings are updated across the portals.
              </Alert>
            )}

            <fieldset className="space-y-4">
              <legend className="text-[15px] font-semibold text-ink-900">Timings</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-opd" className="field-label">OPD start time</label>
                  <input id="s-opd" type="time" value={opdStartTime} onChange={e => setOpdStartTime(e.target.value)} className="field-control" required />
                  <p className="field-hint">Default 09:30 AM</p>
                </div>
                <div>
                  <label htmlFor="s-cutoff" className="field-label">Same-day online cutoff</label>
                  <input id="s-cutoff" type="time" value={onlineCutoffTime} onChange={e => setOnlineCutoffTime(e.target.value)} className="field-control" required />
                  <p className="field-hint">Default 09:00 AM IST</p>
                </div>
                <div>
                  <label htmlFor="s-window" className="field-label">Advance booking window (days)</label>
                  <input
                    id="s-window"
                    type="number"
                    min={1}
                    max={14}
                    value={onlineBookingWindowDays}
                    onChange={e => setOnlineBookingWindowDays(e.target.value)}
                    className="field-control"
                    required
                  />
                  <p className="field-hint">Default 1 day before the visit</p>
                </div>
                <div>
                  <label htmlFor="s-cap" className="field-label">Maximum daily capacity</label>
                  <input id="s-cap" placeholder="Leave blank for unlimited" value={maxDailyCapacity} onChange={e => setMaxDailyCapacity(e.target.value)} className="field-control" />
                  <p className="field-hint">Default is unlimited</p>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="field-label">Operating days</legend>
              <div className="flex flex-wrap gap-2">
                {days.map(day => {
                  const on = operatingDays.includes(day);
                  return (
                    <label
                      key={day}
                      className={cn(
                        'inline-flex h-10 min-w-14 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
                        on ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink-500 hover:border-ink-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={e => setOperatingDays(e.target.checked ? [...operatingDays, day] : operatingDays.filter(d => d !== day))}
                      />
                      {day.slice(0, 3)}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="s-holidays" className="field-label">Hospital holidays</label>
              <input id="s-holidays" placeholder="e.g. 2026-11-04, 2026-12-25" value={holidaysText} onChange={e => setHolidaysText(e.target.value)} className="field-control" />
              <p className="field-hint">Comma-separated dates (YYYY-MM-DD) when OPD booking is closed.</p>
            </div>

            <fieldset className="rounded-2xl border border-line bg-ink-50/50 p-5">
              <legend className="px-1 text-sm font-semibold text-ink-900">Fees & payments</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-fee" className="field-label">OPD consultation fee (₹)</label>
                  <input id="s-fee" type="number" placeholder="Leave blank until approved" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} className="field-control" />
                  <p className="field-hint">Keep blank until the hospital board approves.</p>
                </div>
                <div className="space-y-3 sm:pt-7">
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-800">
                    <input type="checkbox" checked={isOnlinePaymentEnabled} onChange={e => setIsOnlinePaymentEnabled(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-700" />
                    <span>
                      Enable live Razorpay payments
                      <span className="block text-xs text-warning-700">Keep off until the fee and refund policy are approved.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
                    <input type="checkbox" checked={isPolicyApprovedByHospital} onChange={e => setIsPolicyApprovedByHospital(e.target.checked)} className="h-4 w-4 accent-brand-700" />
                    Hospital board policy approved
                  </label>
                </div>
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="s-emergency" className="field-label">Emergency hotline</label>
                <input id="s-emergency" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className="field-control" required />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="s-notice" className="field-label">Public notice banner</label>
                <textarea id="s-notice" rows={2} value={noticeBanner} onChange={e => setNoticeBanner(e.target.value)} className="field-control resize-y" />
              </div>
            </div>

            <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>
              Save settings
            </Button>
          </form>
        )}

        {adminTab === 'staff' && (
          <>
            <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-[13px] text-ink-500">Access is enforced by database row-level security.</p>
              <p className="inline-flex items-center gap-2 text-[13px] text-ink-600">
                <UserPlus className="h-4 w-4 text-brand-600" aria-hidden="true" />
                New staff are added in Supabase Auth, then given a role (see supabase/README.md).
              </p>
            </div>
            <Table
              caption="Staff accounts"
              data={demoAccounts}
              keyExtractor={item => item.id}
              columns={[
                {
                  header: 'Staff member',
                  cell: item => (
                    <div className="flex items-center gap-3">
                      <Avatar name={item.fullName} size="sm" />
                      <div>
                        <p className="font-semibold text-ink-900">{item.fullName}</p>
                        <p className="text-xs text-ink-500">{item.email}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Role',
                  cell: item => (
                    <Badge variant={item.role === 'admin' ? 'medical-blue' : item.role === 'doctor' ? 'lime-green' : 'neutral'} size="sm" className="capitalize">
                      {item.role}
                    </Badge>
                  ),
                },
                {
                  header: 'Status',
                  cell: () => (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-leaf-700">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Active
                    </span>
                  ),
                },
                { header: 'Access', cell: item => <span className="text-[13px] text-ink-500">{scope[item.role]}</span> },
              ]}
            />
          </>
        )}

        {adminTab === 'audit' && (
          <Table
            caption="Audit log"
            data={auditLogs}
            keyExtractor={item => item.id}
            emptyMessage="No audit events yet"
            emptyHint="Sign-ins, bookings and report actions will be recorded here."
            columns={[
              {
                header: 'Time',
                cell: item => (
                  <span className="font-mono text-xs text-ink-500">
                    {new Date(item.createdAt).toLocaleDateString('en-IN')} · {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ),
              },
              {
                header: 'Actor',
                cell: item => (
                  <div>
                    <p className="text-[13px] font-semibold text-ink-900">{item.actorName}</p>
                    <p className="text-xs capitalize text-ink-500">{item.actorRole}</p>
                  </div>
                ),
              },
              { header: 'Action', cell: item => <span className="font-mono text-xs font-medium text-brand-700">{item.actionType}</span> },
              { header: 'Details', className: 'whitespace-normal', cell: item => <span className="block max-w-md text-[13px] text-ink-700">{item.description}</span> },
            ]}
          />
        )}

        {adminTab === 'system' && (
          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                  <Database className="h-4 w-4 text-brand-600" aria-hidden="true" /> Supabase database & auth
                </h2>
                <Badge variant={supabaseStatus.configured ? 'lime-green' : 'warning'} size="sm">
                  {supabaseStatus.configured ? 'Configured' : 'Local fallback'}
                </Badge>
              </div>
              <p className="mt-3 break-all font-mono text-xs text-ink-600">{supabaseStatus.url}</p>
              {supabaseStatus.missingVariables.length > 0 && <p className="mt-2 text-[13px] text-warning-700">Missing: {supabaseStatus.missingVariables.join(', ')}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCheckSupabaseHealth} isLoading={isCheckingHealth} loadingText="Checking…">
                  Test connection
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMigrationSql(!showMigrationSql)}>
                  {showMigrationSql ? 'Hide migration steps' : 'Migration steps'}
                </Button>
              </div>
              {supabaseHealth && (
                <div
                  className={cn(
                    'mt-4 rounded-xl border p-4 text-[13px]',
                    supabaseHealth.reachable
                      ? supabaseHealth.tablesDetected.length > 0
                        ? 'border-leaf-200 bg-leaf-50 text-leaf-800'
                        : 'border-warning-200 bg-warning-50 text-warning-700'
                      : 'border-danger-200 bg-danger-50 text-danger-700'
                  )}
                  role="status"
                >
                  <p className="font-semibold">Checked {new Date(supabaseHealth.lastChecked).toLocaleTimeString('en-IN')}</p>
                  {supabaseHealth.errorMessage && <p className="mt-1">{supabaseHealth.errorMessage}</p>}
                  {supabaseHealth.tablesDetected.length > 0 && (
                    <p className="mt-1">
                      <strong>{supabaseHealth.tablesDetected.length} tables found:</strong> {supabaseHealth.tablesDetected.join(', ')}
                    </p>
                  )}
                  {supabaseHealth.tablesMissing.length > 0 && <p className="mt-1">Missing: {supabaseHealth.tablesMissing.join(', ')}</p>}
                </div>
              )}
              {showMigrationSql && (
                <div className="mt-4 rounded-xl bg-ink-50 p-4 text-[13px] text-ink-700">
                  Run these in the Supabase SQL Editor, in order:
                  <code className="mt-2 block space-y-1 font-mono text-xs text-ink-900">
                    <span className="block">supabase/complete_satya_hospital_setup.sql</span>
                    <span className="block">supabase/migrations/20261024000003_staff_queue_desk.sql</span>
                  </code>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-line p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                  <Cloud className="h-4 w-4 text-leaf-600" aria-hidden="true" /> PDF storage boundary
                </h2>
                <Badge variant="lime-green" size="sm">Private bucket guard</Badge>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
                Short-lived signed URLs, a 10 MB file limit, PDF type checks and role guards are in place for report access.
              </p>
            </section>
          </div>
        )}
      </Panel>
    </div>
  );
};
