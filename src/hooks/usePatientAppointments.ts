import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { supabase } from '../lib/supabase';
import { mapAppointmentRow } from '../services/queueService';
import { Appointment } from '../types';

/**
 * The signed-in patient's appointments. With a real Supabase session this
 * reads the database (RLS limits rows to the patient's own family records);
 * otherwise it falls back to the local demo store.
 */
export function usePatientAppointments() {
  const { isLiveSession, patientProfile } = useAuth();
  const { appointments } = useHospital();
  const live = Boolean(isLiveSession && supabase);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live || !supabase) return;
    let alive = true;
    setLoading(true);
    supabase
      .from('appointments')
      .select('*, patient:patient_profiles(patient_id, full_name, phone), doctor:doctor_profiles(full_name)')
      .order('appointment_date', { ascending: false })
      .order('token_number', { ascending: true })
      .limit(100)
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError(err.message);
        else setRows((data || []).map(mapAppointmentRow));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [live]);

  if (live) return { appointments: rows, loading, error, live };
  const local = appointments.filter(a => a.patientProfileId === patientProfile?.id || a.patientId === patientProfile?.patientId);
  return { appointments: local, loading: false, error: null, live };
}
