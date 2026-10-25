import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CalendarDays, ClipboardList, Download, FileText, FlaskConical, Lock, Microscope, PhoneCall } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { Panel } from '../../components/dashboard/Dashboard';
import { AppointmentItem, InlineNote, prettyDate, usePatientDocumentOpener } from '../../components/patient/PatientUI';
import { useAuth } from '../../context/AuthContext';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import { useHospital } from '../../context/HospitalContext';
import { phoneHref, to12h } from '../../lib/contact';
import { formatPaise } from '../../lib/labCart';
import { Badge } from '../../components/common/Badge';
import { LAB_STATUS, PAYMENT_STATUS } from '../../components/lab/LabOrderCard';
import { LabOrder, labService } from '../../services/labService';

export const PatientDashboard: React.FC = () => {
  const { user, patientProfile, isLiveSession } = useAuth();
  const { appointments, pathologyReports, medicalDocuments, settings } = useHospital();
  const docs = usePatientDocumentOpener();

  // Only records belonging to the signed-in patient
  const { appointments: myAppointments } = usePatientAppointments();
  const myReports = pathologyReports.filter(
    r => (r.patientProfileId === patientProfile?.id || r.patientId === patientProfile?.patientId) && r.status === 'published'
  );
  const myPrescriptions = medicalDocuments.filter(d => d.patientProfileId === patientProfile?.id && d.verificationStatus === 'verified');
  const upcoming = myAppointments.filter(a => a.status === 'booked' || a.status === 'checked_in' || a.status === 'in_consultation');
  const next = upcoming[0];

  const firstName = (patientProfile?.fullName || user?.fullName || '').split(' ')[0];

  // Real pathology orders (RLS: own orders, released reports only). Demo sessions keep the local sample reports.
  const [labOrders, setLabOrders] = useState<LabOrder[] | null>(null);
  const [labError, setLabError] = useState<string | null>(null);
  useEffect(() => {
    if (isLiveSession) labService.myOrders().then(setLabOrders).catch(e => setLabError(e instanceof Error ? e.message : 'Could not load lab orders.'));
  }, [isLiveSession]);
  const releasedCount = (labOrders ?? []).reduce((n, o) => n + (o.reports ?? []).filter(r => r.status === 'published').length, 0);

  const shortcuts = [
    { label: 'Appointments', to: '/patient/appointments', icon: CalendarDays, badge: 0 },
    { label: 'Lab orders', to: '/patient/lab-orders', icon: ClipboardList, badge: releasedCount },
    { label: 'Prescriptions', to: '/patient/prescriptions', icon: FileText, badge: 0 },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Greeting + next visit */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-ink-800 p-5 text-white sm:p-8">
          <div aria-hidden="true" className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-leaf-500/15 blur-3xl" />
          <div className="relative">
            <p className="text-sm text-brand-200">Patient portal</p>
            <h1 className="mt-1 text-[1.6rem] font-bold leading-tight tracking-[-0.02em] sm:mt-2 sm:text-[1.9rem]">Hello{firstName ? `, ${firstName}` : ''}</h1>
            {patientProfile?.patientId && (
              <p className="mt-2 text-[15px] text-white/70">
                Patient ID <span className="font-mono font-semibold text-white">{patientProfile.patientId}</span>
                {patientProfile.phone ? ` · +91 ${patientProfile.phone}` : ''}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
              <LinkButton to="/book-appointment" className="px-3 bg-white text-ink-900 hover:bg-brand-50" leftIcon={<CalendarCheck className="h-4 w-4 text-brand-600" />}>
                Book doctor
              </LinkButton>
              <LinkButton to="/lab-tests" variant="outline" className="px-3 border-white/25 bg-transparent text-white hover:border-white/50 hover:text-white" leftIcon={<FlaskConical className="h-4 w-4" />}>
                Lab tests
              </LinkButton>
            </div>
          </div>
        </div>

        {/* Phone shortcuts: everything one tap from the dashboard. */}
        <nav aria-label="My records" className="grid grid-cols-4 gap-2 md:hidden">
          {shortcuts.map(s => (
            <Link key={s.label} to={s.to} className="relative flex flex-col items-center gap-1.5 rounded-2xl py-2 text-center active:scale-[0.98] motion-reduce:active:scale-100">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line">
                <s.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              {s.badge > 0 && (
                <span className="absolute right-2 top-1 min-w-5 rounded-full bg-leaf-600 px-1.5 text-[11px] font-bold leading-5 text-white">
                  {s.badge}
                  <span className="sr-only"> reports ready</span>
                </span>
              )}
              <span className="text-xs font-medium leading-tight text-ink-700">{s.label}</span>
            </Link>
          ))}
          <a href={phoneHref(settings.phone)} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 text-center active:scale-[0.98] motion-reduce:active:scale-100">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line">
              <PhoneCall className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium leading-tight text-ink-700">Call us</span>
          </a>
        </nav>

        <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-8">
          <p className="text-sm font-medium text-ink-500">Next visit</p>
          {next ? (
            <>
              <div className="mt-3 flex items-end gap-4">
                <p className="text-5xl font-bold leading-none tracking-tight tabular-nums text-ink-900">#{next.tokenNumber}</p>
                <p className="pb-1 text-sm text-ink-500">token</p>
              </div>
              <p className="mt-4 font-semibold text-ink-900">{prettyDate(next.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <p className="mt-0.5 text-sm text-ink-500">
                {next.doctorName} · arrive by {to12h(settings.opdStartTime)}
              </p>
              <Link to="/patient/appointments" className="link mt-5 inline-flex items-center gap-1 text-sm">
                All appointments <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-lg font-semibold text-ink-900">No upcoming visits</p>
              <p className="mt-1 text-sm text-ink-500">Book any OPD day ahead; same-day online booking closes at {to12h(settings.onlineCutoffTime)}.</p>
              <LinkButton to="/book-appointment" variant="soft" className="mt-5" leftIcon={<CalendarCheck className="h-4 w-4" />}>
                Book a token
              </LinkButton>
            </>
          )}
        </div>
      </section>

      {docs.error && <Alert type="error">{docs.error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel
            flush
            title={
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-600" aria-hidden="true" /> Appointments
              </span>
            }
            actions={
              myAppointments.length > 0 && (
                <Link to="/patient/appointments" className="link text-sm">
                  View all ({myAppointments.length})
                </Link>
              )
            }
          >
            {myAppointments.length === 0 ? (
              <EmptyState
                title="No appointments yet"
                description="Book an OPD token online and it will appear here."
                actionLabel="Book appointment"
                actionLink="/book-appointment"
                icon={<CalendarDays className="h-6 w-6" />}
              />
            ) : (
              <div className="divide-y divide-line">
                {myAppointments.slice(0, 3).map(a => (
                  <AppointmentItem key={a.id} appt={a} />
                ))}
              </div>
            )}
          </Panel>

          <Panel
            flush
            title={
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" /> Prescriptions
              </span>
            }
            actions={
              myPrescriptions.length > 0 && (
                <Link to="/patient/prescriptions" className="link text-sm">
                  View all ({myPrescriptions.length})
                </Link>
              )
            }
          >
            {myPrescriptions.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ink-500">Prescriptions appear here once your doctor has verified the scan.</p>
            ) : (
              <ul className="divide-y divide-line">
                {myPrescriptions.slice(0, 3).map(doc => (
                  <li key={doc.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{doc.title}</p>
                      <p className="text-[13px] text-ink-500">
                        Verified by {doc.verifiedBy} · {prettyDate(doc.createdAt)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => docs.open(doc.storageKey)}>
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          {isLiveSession ? (
            <Panel
              flush
              title={
                <span className="inline-flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-leaf-600" aria-hidden="true" /> Pathology orders
                </span>
              }
              actions={
                (labOrders?.length ?? 0) > 0 && (
                  <Link to="/patient/lab-orders" className="link text-sm">
                    View all ({labOrders!.length})
                  </Link>
                )
              }
            >
              {labError ? (
                <p className="px-6 py-6 text-sm text-danger-700">{labError}</p>
              ) : labOrders === null ? (
                <p className="px-6 py-8 text-center text-sm text-ink-500">Loading…</p>
              ) : labOrders.length === 0 ? (
                <EmptyState title="No lab orders yet" description="Book tests or a health-checkup package — no appointment needed." actionLabel="Book lab tests" actionLink="/lab-tests" icon={<FlaskConical className="h-6 w-6" />} />
              ) : (
                <ul className="divide-y divide-line">
                  {labOrders.slice(0, 3).map(o => {
                    const ready = (o.reports ?? []).filter(r => r.status === 'published').length;
                    return (
                      <li key={o.id}>
                        <Link to={`/lab-tests/orders/${o.order_number}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-ink-50/50 sm:px-6">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{o.items.map(i => i.name).join(', ')}</p>
                            <p className="text-[13px] text-ink-500">
                              {prettyDate(o.created_at)} · {formatPaise(o.total_paise)}
                              {ready > 0 && ` · ${ready} report${ready === 1 ? '' : 's'} ready`}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge size="sm" variant={o.status === 'cancelled' ? 'neutral' : LAB_STATUS[o.lab_status].variant}>
                              {o.status === 'cancelled' ? 'Cancelled' : LAB_STATUS[o.lab_status].label}
                            </Badge>
                            <Badge size="sm" variant={PAYMENT_STATUS[o.payment_status].variant}>{PAYMENT_STATUS[o.payment_status].label}</Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : (
            <Panel
              flush
              title={
                <span className="inline-flex items-center gap-2">
                  <Microscope className="h-4 w-4 text-leaf-600" aria-hidden="true" /> Lab reports
                </span>
              }
              actions={
                myReports.length > 0 && (
                  <Link to="/patient/reports" className="link text-sm">
                    View all ({myReports.length})
                  </Link>
                )
              }
            >
              {myReports.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-ink-500">Reports appear here after the pathologist signs them off.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {myReports.slice(0, 4).map(rep => (
                    <li key={rep.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{rep.testName}</p>
                        <p className="text-[13px] text-ink-500">
                          {prettyDate(rep.reportDate)} · signed by {rep.verifierName || 'pathologist'}
                        </p>
                      </div>
                      <Button variant="soft" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => docs.open(rep.storageKey)} aria-label={`Download ${rep.testName}`}>
                        PDF
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <InlineNote tone="leaf" icon={<Lock className="h-4 w-4 text-leaf-700" />}>
            Downloads use short-lived private links. Lab results stay hidden until a pathologist has verified them.
          </InlineNote>
        </div>
      </div>
    </div>
  );
};
