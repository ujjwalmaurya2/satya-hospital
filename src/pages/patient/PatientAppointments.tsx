import React, { useState } from 'react';
import { CalendarCheck, CalendarDays } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader, Panel, Segmented } from '../../components/dashboard/Dashboard';
import { AppointmentItem, prettyDate } from '../../components/patient/PatientUI';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { Appointment } from '../../types';

type View = 'upcoming' | 'past';

export const PatientAppointments: React.FC = () => {
  const { patientProfile } = useAuth();
  const { appointments, updateAppointmentStatus } = useHospital();

  const [cancelModalApt, setCancelModalApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [view, setView] = useState<View>('upcoming');

  const myAppointments = appointments.filter(a => a.patientProfileId === patientProfile?.id || a.patientId === patientProfile?.patientId);
  const isUpcoming = (a: Appointment) => a.status === 'booked' || a.status === 'checked_in' || a.status === 'in_consultation';
  const upcoming = myAppointments.filter(isUpcoming);
  const past = myAppointments.filter(a => !isUpcoming(a));
  const list = view === 'upcoming' ? upcoming : past;

  const handleConfirmCancel = () => {
    if (!cancelModalApt) return;
    updateAppointmentStatus(cancelModalApt.id, 'cancelled', 'patient', cancelReason || 'Cancelled by patient');
    setCancelModalApt(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Your tokens, their status and past consultations."
        actions={
          <LinkButton to="/book-appointment" size="sm" leftIcon={<CalendarCheck className="h-4 w-4" />}>
            Book new token
          </LinkButton>
        }
      />

      <Panel
        flush
        title={
          <Segmented
            label="Appointment view"
            layoutId="appt-view"
            value={view}
            onChange={setView}
            items={[
              { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
              { id: 'past', label: 'Past', count: past.length },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <EmptyState
            title={view === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            description={view === 'upcoming' ? 'Reserve a consultation token online — there is no upfront fee.' : 'Completed and cancelled visits will be listed here.'}
            actionLabel={view === 'upcoming' ? 'Book a token' : undefined}
            actionLink="/book-appointment"
            icon={<CalendarDays className="h-6 w-6" />}
          />
        ) : (
          <div className="divide-y divide-line">
            {list.map(a => (
              <AppointmentItem
                key={a.id}
                appt={a}
                action={
                  a.status === 'booked' ? (
                    <Button variant="ghost" size="sm" className="text-danger-700 hover:bg-danger-50 hover:text-danger-700" onClick={() => setCancelModalApt(a)}>
                      Cancel token
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </Panel>

      <Modal isOpen={Boolean(cancelModalApt)} onClose={() => setCancelModalApt(null)} title="Cancel this appointment?" description="You can book again later if needed.">
        <div className="space-y-5">
          <p className="text-sm text-ink-700">
            Token <strong className="font-semibold text-ink-900">#{cancelModalApt?.tokenNumber}</strong> on{' '}
            <strong className="font-semibold text-ink-900">{cancelModalApt ? prettyDate(cancelModalApt.appointmentDate) : ''}</strong> will be cancelled. Token
            numbers are never reissued, so the queue order of other patients is unchanged.
          </p>
          <div>
            <label htmlFor="cancel-reason" className="field-label">
              Reason <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <input id="cancel-reason" placeholder="e.g. Schedule conflict, feeling better" value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="field-control" />
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setCancelModalApt(null)}>
              Keep appointment
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel}>
              Cancel appointment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
