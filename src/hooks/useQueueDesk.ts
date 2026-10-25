import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { canTransition, STATUS_LABELS, summarizeQueue, todaysQueue } from '../lib/queue';
import { getHospitalCurrentTime, getHospitalTodayDate } from '../lib/tokens';
import { ConsultationNotes, queueService, VisitSummary, WalkInInput } from '../services/queueService';
import { Appointment, AppointmentStatus, FeePaymentMode } from '../types';

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

/** Re-renders every `intervalMs` so IST date / cutoff status stay current. */
function useIstClock(intervalMs = 30_000) {
  const [clock, setClock] = useState(() => ({ date: getHospitalTodayDate(), time: getHospitalCurrentTime() }));
  useEffect(() => {
    const id = setInterval(() => setClock({ date: getHospitalTodayDate(), time: getHospitalCurrentTime() }), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return clock;
}

/**
 * Queue desk data + actions. Uses Supabase (RPCs + Realtime) when a real staff
 * session exists, otherwise the local demo store in HospitalContext. Both
 * paths share the transition rules in src/lib/queue.ts.
 */
export function useQueueDesk() {
  const { isLiveSession, user } = useAuth();
  const hospital = useHospital();
  const live = isSupabaseConfigured && isLiveSession;
  const { date: today, time } = useIstClock();
  // Day being viewed; actions that issue or call tokens are limited to today.
  const [viewDate, setViewDate] = useState(today);
  const isToday = viewDate === today;

  const [liveRows, setLiveRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(live);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!live) return;
    try {
      setLiveRows(await queueService.listForDate(viewDate));
      setSyncError(null);
    } catch (err) {
      setSyncError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [live, viewDate]);

  useEffect(() => {
    if (!live) return;
    setLoading(true);
    refresh();
    const unsubscribe = queueService.subscribe(viewDate, refresh);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, viewDate, refresh]);

  const appointments = live ? liveRows : todaysQueue(hospital.appointments, viewDate);
  const summary = summarizeQueue(appointments, viewDate);

  const callNext = async (): Promise<ActionResult> => {
    if (live) {
      try {
        const token = await queueService.callNext();
        await refresh();
        return token === null
          ? { ok: false, error: 'No checked-in patients are waiting.' }
          : { ok: true, message: `Token #${token} called to consultation.` };
      } catch (err) {
        return { ok: false, error: errorText(err) };
      }
    }
    const res = hospital.callNextToken();
    return res.success && res.appointment
      ? { ok: true, message: `Token #${res.appointment.tokenNumber} called to consultation.` }
      : { ok: false, error: res.error || 'Could not call the next token.' };
  };

  const setStatus = async (appt: Appointment, status: AppointmentStatus): Promise<ActionResult> => {
    if (!canTransition(appt.status, status)) {
      return { ok: false, error: `Token #${appt.tokenNumber} cannot move from ${STATUS_LABELS[appt.status]} to ${STATUS_LABELS[status]}.` };
    }
    const message = `Token #${appt.tokenNumber} marked ${STATUS_LABELS[status]}.`;
    if (live) {
      try {
        await queueService.setStatus(appt.id, status);
        await refresh();
        return { ok: true, message };
      } catch (err) {
        return { ok: false, error: errorText(err) };
      }
    }
    const res = hospital.changeQueueStatus(appt.id, status);
    return res.success ? { ok: true, message } : { ok: false, error: res.error || 'Status update failed.' };
  };

  const setFee = async (appt: Appointment, mode: FeePaymentMode | null): Promise<ActionResult> => {
    if (appt.paymentProvider === 'razorpay') {
      return { ok: false, error: `Token #${appt.tokenNumber} was paid online; the fee can’t be changed at the desk.` };
    }
    const message = mode
      ? `Fee for token #${appt.tokenNumber} recorded as ${mode.toUpperCase()} paid.`
      : `Fee for token #${appt.tokenNumber} marked unpaid.`;
    if (live) {
      try {
        await queueService.setFee(appt.id, mode);
        await refresh();
        return { ok: true, message };
      } catch (err) {
        return { ok: false, error: errorText(err) };
      }
    }
    const res = hospital.setConsultationFee(appt.id, mode);
    return res.success ? { ok: true, message } : { ok: false, error: res.error || 'Fee update failed.' };
  };

  const registerWalkIn = async (input: WalkInInput): Promise<ActionResult & { tokenNumber?: number }> => {
    if (live) {
      try {
        const { tokenNumber } = await queueService.registerWalkIn(input);
        await refresh();
        return { ok: true, message: `Token #${tokenNumber} issued to ${input.fullName}.`, tokenNumber };
      } catch (err) {
        return { ok: false, error: errorText(err) };
      }
    }
    const reg = hospital.registerPatient(
      { fullName: input.fullName, phone: input.phone, gender: input.gender, dob: input.dob },
      'reception'
    );
    if (!reg.success || !reg.patient) return { ok: false, error: reg.error || 'Could not register patient.' };
    const res = hospital.registerWalkInAppointment({
      patientProfileId: reg.patient.id,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
    });
    if (!res.success || !res.appointment) return { ok: false, error: res.error || 'Could not issue a token.' };
    const tokenNumber = res.appointment.tokenNumber;
    return { ok: true, message: `Token #${tokenNumber} issued to ${input.fullName}.`, tokenNumber };
  };

  /** Doctor: save notes and complete. Live sessions use one server transaction. */
  const completeConsultation = async (appt: Appointment, n: ConsultationNotes): Promise<ActionResult> => {
    const message = `Token #${appt.tokenNumber} completed and notes saved.`;
    if (live) {
      try {
        await queueService.completeConsultation(appt.id, n);
        await refresh();
        return { ok: true, message };
      } catch (err) {
        return { ok: false, error: errorText(err) };
      }
    }
    hospital.addPatientVisit({
      patientProfileId: appt.patientProfileId,
      appointmentId: appt.id,
      doctorId: user?.id || 'doc-1',
      doctorName: user?.fullName || 'Doctor',
      visitDate: appt.appointmentDate,
      chiefComplaint: n.complaint,
      clinicalNotes: n.notes,
      diagnosis: n.diagnosis,
      doctorSignature: user?.fullName,
      status: 'completed',
    });
    return { ok: true, message };
  };

  const visitsFor = async (patientProfileId: string): Promise<VisitSummary[]> =>
    live
      ? queueService.visitsFor(patientProfileId)
      : hospital.visits.filter(v => v.patientProfileId === patientProfileId).map(v => ({ id: v.id, visitDate: v.visitDate, doctorName: v.doctorName, diagnosis: v.diagnosis, clinicalNotes: v.clinicalNotes }));

  return {
    live,
    loading,
    syncError,
    today,
    viewDate,
    setViewDate,
    isToday,
    istTime: time,
    settings: hospital.settings,
    appointments,
    summary,
    refresh,
    callNext,
    setStatus,
    setFee,
    registerWalkIn,
    completeConsultation,
    visitsFor,
  };
}
