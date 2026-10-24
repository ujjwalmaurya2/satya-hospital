import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CalendarDays, Download, FileText, Lock, Microscope } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';
import { Panel } from '../../components/dashboard/Dashboard';
import { AppointmentItem, InlineNote, prettyDate, usePatientDocumentOpener } from '../../components/patient/PatientUI';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { to12h } from '../../lib/contact';

export const PatientDashboard: React.FC = () => {
  const { user, patientProfile } = useAuth();
  const { appointments, pathologyReports, medicalDocuments, settings } = useHospital();
  const docs = usePatientDocumentOpener();

  // Only records belonging to the signed-in patient
  const myAppointments = appointments.filter(a => a.patientProfileId === patientProfile?.id || a.patientId === patientProfile?.patientId);
  const myReports = pathologyReports.filter(
    r => (r.patientProfileId === patientProfile?.id || r.patientId === patientProfile?.patientId) && r.status === 'published'
  );
  const myPrescriptions = medicalDocuments.filter(d => d.patientProfileId === patientProfile?.id && d.verificationStatus === 'verified');
  const upcoming = myAppointments.filter(a => a.status === 'booked' || a.status === 'checked_in' || a.status === 'in_consultation');
  const next = upcoming[0];

  const firstName = (patientProfile?.fullName || user?.fullName || '').split(' ')[0];

  return (
    <div className="space-y-8">
      {/* Greeting + next visit */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-ink-800 p-7 text-white sm:p-8">
          <div aria-hidden="true" className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-leaf-500/15 blur-3xl" />
          <div className="relative">
            <p className="text-sm text-brand-200">Patient portal</p>
            <h1 className="mt-2 text-[1.9rem] font-bold leading-tight tracking-[-0.02em]">Hello{firstName ? `, ${firstName}` : ''}</h1>
            <p className="mt-2 text-[15px] text-white/70">
              Patient ID <span className="font-mono font-semibold text-white">{patientProfile?.patientId}</span>
              {patientProfile?.phone ? ` · +91 ${patientProfile.phone}` : ''}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton to="/book-appointment" className="bg-white text-ink-900 hover:bg-brand-50" leftIcon={<CalendarCheck className="h-4 w-4 text-brand-600" />}>
                Book appointment
              </LinkButton>
              <LinkButton to="/patient/reports" variant="outline" className="border-white/25 bg-transparent text-white hover:border-white/50 hover:text-white">
                Lab reports
              </LinkButton>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-8">
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
              <p className="mt-1 text-sm text-ink-500">Online booking opens a day ahead and closes at {to12h(settings.onlineCutoffTime)} on the day.</p>
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

          <InlineNote tone="leaf" icon={<Lock className="h-4 w-4 text-leaf-700" />}>
            Downloads use short-lived private links. Lab results stay hidden until a pathologist has verified them.
          </InlineNote>
        </div>
      </div>
    </div>
  );
};
