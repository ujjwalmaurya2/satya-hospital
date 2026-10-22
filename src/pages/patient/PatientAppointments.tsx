import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { Appointment } from '../../types';

export const PatientAppointments: React.FC = () => {
  const { patientProfile } = useAuth();
  const { appointments, updateAppointmentStatus, settings } = useHospital();

  const [cancelModalApt, setCancelModalApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const myAppointments = appointments.filter(
    a => a.patientProfileId === patientProfile?.id || a.patientId === patientProfile?.patientId
  );

  const handleConfirmCancel = () => {
    if (!cancelModalApt) return;
    updateAppointmentStatus(cancelModalApt.id, 'cancelled', 'patient', cancelReason || 'Cancelled by patient');
    setCancelModalApt(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
            My Outpatient Appointments
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            View your token status, queue positions, and past consultation history.
          </p>
        </div>
        <Link to="/book-appointment">
          <Button variant="accent" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
            Book New Token
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0 divide-y divide-[#E1E8ED]">
          {myAppointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#667085]">
              No appointment records found for your account.
            </div>
          ) : (
            myAppointments.map((apt) => {
              const isCancellable = apt.status === 'booked';
              return (
                <div key={apt.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'medical-blue'} size="sm" dot>
                        {apt.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm font-bold text-[#243447]">
                        Token #{apt.tokenNumber}
                      </span>
                      <span className="text-xs text-[#667085] font-mono">
                        ({apt.appointmentCode})
                      </span>
                    </div>

                    <div className="text-xs text-[#243447] font-semibold">
                      Date: {apt.appointmentDate} &bull; Doctor: {apt.doctorName}
                    </div>

                    <div className="text-xs text-[#667085] flex flex-wrap items-center gap-3">
                      <span>Queue Type: <strong>{apt.queueType === 'online' ? 'Online Reservation' : 'Reception Walk-in'}</strong></span>
                      {apt.notes && <span>&bull; Note: {apt.notes}</span>}
                      {apt.cancellationReason && (
                        <span className="text-red-600 font-medium">&bull; Reason: {apt.cancellationReason}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCancellable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setCancelModalApt(apt)}
                      >
                        Cancel Token
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      {/* Cancellation Modal */}
      <Modal
        isOpen={Boolean(cancelModalApt)}
        onClose={() => setCancelModalApt(null)}
        title="Cancel OPD Appointment Token"
        description="Are you sure you wish to cancel this appointment?"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#243447]">
            Cancelling Token <strong>#{cancelModalApt?.tokenNumber}</strong> for date <strong>{cancelModalApt?.appointmentDate}</strong> will release the token back to the shared hospital capacity.
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#243447] mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Schedule conflict, feeling better..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs focus:ring-2 focus:ring-[#3DA9DF]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setCancelModalApt(null)}>
              Keep Appointment
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
