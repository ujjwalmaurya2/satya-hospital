import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { 
  Appointment, 
  AppointmentStatus, 
  Department, 
  FeePaymentMode,
  DoctorProfile, 
  HospitalSettings, 
  MedicalDocument, 
  PathologyReport, 
  PathologyTest, 
  PatientProfile, 
  PatientVisit,
  PaymentStatus,
  QueueType,
  UserRole
} from '../types';
import { 
  initialAppointments, 
  initialDepartments, 
  initialDoctors, 
  initialHospitalSettings, 
  initialMedicalDocuments, 
  initialPathologyReports, 
  initialPathologyTests, 
  initialPatientProfiles, 
  initialVisits 
} from '../data/mockData';
import { 
  checkOnlineBookingCutoff, 
  generateAppointmentCode, 
  generatePatientId, 
  getHospitalTodayDate, 
  isValidIndianPhone 
} from '../lib/tokens';
import { auditLogger } from '../lib/audit';
import { applyCallNext, applyFeePayment, applyStatusChange, nextTokenNumber } from '../lib/queue';
import { useAuth } from './AuthContext';
import { supabaseService } from '../services/supabaseService';

interface BookingResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
}

interface HospitalContextType {
  settings: HospitalSettings;
  updateSettings: (newSettings: Partial<HospitalSettings>, updatedByRole: UserRole) => void;
  departments: Department[];
  doctors: DoctorProfile[];
  pathologyTests: PathologyTest[];
  patientProfiles: PatientProfile[];
  appointments: Appointment[];
  visits: PatientVisit[];
  medicalDocuments: MedicalDocument[];
  pathologyReports: PathologyReport[];
  
  // Registration & Patient Search
  registerPatient: (data: {
    fullName: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    dob?: string;
    age?: number;
    email?: string;
    bloodGroup?: string;
    address?: string;
    emergencyContact?: string;
  }, registeredByRole: UserRole) => { success: boolean; patient?: PatientProfile; error?: string };
  searchPatients: (query: string) => PatientProfile[];
  getPatientById: (patientId: string) => PatientProfile | undefined;

  // Appointment & OPD Queue Operations
  bookOnlineAppointment: (params: {
    patientProfileId: string;
    appointmentDate: string; // YYYY-MM-DD
    doctorId?: string;
    notes?: string;
    idempotencyKey?: string;
    paymentStatus?: PaymentStatus;
    paymentReconciliationNotes?: string;
  }) => BookingResult;
  registerWalkInAppointment: (params: {
    patientProfileId: string;
    doctorId?: string;
    notes?: string;
    idempotencyKey?: string;
  }) => BookingResult;
  updateAppointmentStatus: (
    appointmentId: string, 
    status: AppointmentStatus, 
    actorRole: UserRole,
    reason?: string
  ) => boolean;

  // Reception queue desk (validated transitions, see src/lib/queue.ts)
  callNextToken: () => BookingResult;
  changeQueueStatus: (appointmentId: string, status: AppointmentStatus, reason?: string) => BookingResult;
  setConsultationFee: (appointmentId: string, mode: FeePaymentMode | null) => BookingResult;

  // Clinical Consultation Operations
  addPatientVisit: (visit: Omit<PatientVisit, 'id' | 'createdAt' | 'updatedAt'>) => PatientVisit;
  
  // Scanned Handwritten Prescription & Document Operations
  uploadMedicalDocument: (doc: Omit<MedicalDocument, 'id' | 'createdAt'>) => MedicalDocument;
  verifyMedicalDocument: (documentId: string, verifierName: string) => boolean;

  // Pathology Operations
  uploadPathologyReport: (report: Omit<PathologyReport, 'id' | 'reportCode' | 'createdAt'>) => PathologyReport;
  verifyAndPublishPathologyReport: (reportId: string, verifierName: string) => boolean;
  supersedePathologyReport: (
    originalReportId: string, 
    correctionReason: string,
    newFileDetails: { storageKey: string; fileName: string; fileSize: number; checksum?: string }
  ) => PathologyReport | null;

  // Real-time capacity calculation
  getTodayQueueStats: () => {
    totalBooked: number;
    onlineCount: number;
    walkInCount: number;
    waitingCount: number;
    inConsultationCount: number;
    completedCount: number;
    remainingCapacity: number | null;
    isCapacityFull: boolean;
  };
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SETTINGS: 'satya_settings_v1',
  PATIENTS: 'satya_patients_v1',
  APPOINTMENTS: 'satya_appointments_v1',
  VISITS: 'satya_visits_v1',
  DOCUMENTS: 'satya_documents_v1',
  REPORTS: 'satya_reports_v1',
  TOKEN_COUNTERS: 'satya_token_counters_v1',
};

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<HospitalSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? JSON.parse(stored) : initialHospitalSettings;
    } catch {
      return initialHospitalSettings;
    }
  });

  const [departments] = useState<Department[]>(initialDepartments);
  const [doctors] = useState<DoctorProfile[]>(initialDoctors);
  const [pathologyTests] = useState<PathologyTest[]>(initialPathologyTests);

  const [patientProfiles, setPatientProfiles] = useState<PatientProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      return stored ? JSON.parse(stored) : initialPatientProfiles;
    } catch {
      return initialPatientProfiles;
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return stored ? JSON.parse(stored) : initialAppointments;
    } catch {
      return initialAppointments;
    }
  });

  const [visits, setVisits] = useState<PatientVisit[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VISITS);
      return stored ? JSON.parse(stored) : initialVisits;
    } catch {
      return initialVisits;
    }
  });

  const [medicalDocuments, setMedicalDocuments] = useState<MedicalDocument[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      return stored ? JSON.parse(stored) : initialMedicalDocuments;
    } catch {
      return initialMedicalDocuments;
    }
  });

  const [pathologyReports, setPathologyReports] = useState<PathologyReport[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return stored ? JSON.parse(stored) : initialPathologyReports;
    } catch {
      return initialPathologyReports;
    }
  });

  const [tokenCounters, setTokenCounters] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TOKEN_COUNTERS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Refs mirror state so back-to-back calls in one handler (register patient ->
  // issue token) see each other's writes instead of a stale render closure.
  const appointmentsRef = useRef(appointments);
  const patientsRef = useRef(patientProfiles);
  const countersRef = useRef(tokenCounters);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patientProfiles; }, [patientProfiles]);
  useEffect(() => { countersRef.current = tokenCounters; }, [tokenCounters]);

  const commitAppointments = (next: Appointment[]) => {
    appointmentsRef.current = next;
    setAppointments(next);
  };

  // Initial Supabase Sync
  useEffect(() => {
    async function syncSupabaseData() {
      try {
        const remoteSettings = await supabaseService.getHospitalSettings();
        if (remoteSettings && remoteSettings.hospitalName) {
          setSettings(prev => ({ ...prev, ...remoteSettings }));
        }
      } catch (err) {
        console.warn('Initial Supabase settings sync skipped (local mode active):', err);
      }
    }
    syncSupabaseData();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patientProfiles));
  }, [patientProfiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
  }, [visits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(medicalDocuments));
  }, [medicalDocuments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(pathologyReports));
  }, [pathologyReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOKEN_COUNTERS, JSON.stringify(tokenCounters));
  }, [tokenCounters]);

  // Update Settings
  const updateSettings = (newSettings: Partial<HospitalSettings>, updatedByRole: UserRole) => {
    const updated: HospitalSettings = {
      ...settings,
      ...newSettings,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: user?.fullName || 'Hospital Admin',
    };
    setSettings(updated);

    auditLogger.record({
      actorId: user?.id || 'admin',
      actorName: user?.fullName || 'Super Admin',
      actorRole: updatedByRole,
      actionType: 'settings.update',
      targetEntity: 'hospital_settings',
      targetId: 'global',
      description: 'Hospital operational configuration updated.',
      metadata: newSettings as Record<string, unknown>,
    });
  };

  // Register Patient with immutable collision-safe ID
  const registerPatient = (
    data: {
      fullName: string;
      phone: string;
      gender: 'male' | 'female' | 'other';
      dob?: string;
      age?: number;
      email?: string;
      bloodGroup?: string;
      address?: string;
      emergencyContact?: string;
    },
    registeredByRole: UserRole
  ): { success: boolean; patient?: PatientProfile; error?: string } => {
    if (!data.fullName.trim()) {
      return { success: false, error: 'Patient full name is mandatory.' };
    }
    if (!isValidIndianPhone(data.phone)) {
      return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
    }

    // Match on phone + name: siblings often share a parent's mobile number.
    const existing = patientsRef.current.find(
      p => p.phone === data.phone.trim() && p.fullName.trim().toLowerCase() === data.fullName.trim().toLowerCase()
    );
    if (existing) {
      return {
        success: true,
        patient: existing,
        error: `Patient already registered with Patient ID: ${existing.patientId}. Reusing existing hospital record.`,
      };
    }

    const nextSeq = patientsRef.current.length + 1;
    const patientId = generatePatientId(nextSeq);

    const newPatient: PatientProfile = {
      id: `pat-${Date.now()}`,
      patientId,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      gender: data.gender,
      dob: data.dob,
      age: data.age,
      email: data.email?.trim(),
      bloodGroup: data.bloodGroup,
      address: data.address?.trim(),
      emergencyContact: data.emergencyContact?.trim(),
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    patientsRef.current = [newPatient, ...patientsRef.current];
    setPatientProfiles(patientsRef.current);

    auditLogger.record({
      actorId: user?.id || 'staff',
      actorName: user?.fullName || 'Staff Member',
      actorRole: registeredByRole,
      actionType: 'patient.register',
      targetEntity: 'patient_profiles',
      targetId: newPatient.id,
      description: `New patient registered with assigned Hospital ID: ${patientId}`,
      metadata: { patientId, fullName: newPatient.fullName, phone: newPatient.phone },
    });

    return { success: true, patient: newPatient };
  };

  // Patient Search (ID, Phone, Name)
  const searchPatients = (query: string): PatientProfile[] => {
    const q = query.trim().toLowerCase();
    if (!q) return patientProfiles.slice(0, 10);
    return patientProfiles.filter(p => 
      p.patientId.toLowerCase().includes(q) ||
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  };

  const getPatientById = (patientId: string): PatientProfile | undefined => {
    return patientProfiles.find(p => p.patientId.toLowerCase() === patientId.trim().toLowerCase() || p.id === patientId);
  };

  // Helper: Next Daily Token for target date (monotonic sequence allocation)
  const allocateNextTokenForDate = (dateStr: string): number => {
    const nextToken = nextTokenNumber(appointmentsRef.current, dateStr, countersRef.current[dateStr] || 0);
    countersRef.current = { ...countersRef.current, [dateStr]: nextToken };
    setTokenCounters(countersRef.current);
    return nextToken;
  };

  // Book Online Appointment
  const bookOnlineAppointment = (params: {
    patientProfileId: string;
    appointmentDate: string;
    doctorId?: string;
    notes?: string;
    idempotencyKey?: string;
    paymentStatus?: PaymentStatus;
    paymentReconciliationNotes?: string;
  }): BookingResult => {
    // 0. Idempotency Check: Prevent duplicate processing for repeated submissions / payment retries
    if (params.idempotencyKey) {
      const existing = appointmentsRef.current.find(a => a.idempotencyKey === params.idempotencyKey);
      if (existing) {
        return { success: true, appointment: existing };
      }
    }

    // 1. Check cutoff time & booking window unless delayed payment callback reconciliation
    const isDelayedPaymentReconciled = params.paymentStatus === 'delayed_reconciled';
    if (!isDelayedPaymentReconciled) {
      const cutoffCheck = checkOnlineBookingCutoff(params.appointmentDate, {
        cutoffTimeStr: settings.onlineCutoffTime,
        operatingDays: settings.operatingDays,
        holidays: settings.holidays,
      });
      if (!cutoffCheck.allowed) {
        return { success: false, error: cutoffCheck.reason };
      }
    }

    // 2. Check daily capacity ONLY IF explicitly configured (null = unlimited)
    const currentDayAppointments = appointmentsRef.current.filter(
      a => a.appointmentDate === params.appointmentDate && a.status !== 'cancelled'
    );
    if (
      settings.maxDailyCapacity !== null && 
      settings.maxDailyCapacity !== undefined && 
      currentDayAppointments.length >= settings.maxDailyCapacity
    ) {
      return {
        success: false,
        error: `Daily OPD capacity of ${settings.maxDailyCapacity} appointments has been reached for ${params.appointmentDate}. Please select another date or contact reception.`,
      };
    }

    // 3. Prevent duplicate active booking on same date for same patient
    const duplicate = currentDayAppointments.find(
      a => a.patientProfileId === params.patientProfileId
    );
    if (duplicate) {
      return {
        success: false,
        error: `Patient already has an active OPD appointment (Token #${duplicate.tokenNumber}, Code: ${duplicate.appointmentCode}) scheduled for ${params.appointmentDate}.`,
      };
    }

    const patient = patientsRef.current.find(p => p.id === params.patientProfileId);
    if (!patient) {
      return { success: false, error: 'Selected patient profile was not found.' };
    }

    const doctor = doctors.find(d => d.id === params.doctorId) || doctors[0];
    const tokenNumber = allocateNextTokenForDate(params.appointmentDate);
    const appointmentCode = generateAppointmentCode(appointmentsRef.current.length + 101);

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      appointmentCode,
      patientProfileId: patient.id,
      patientId: patient.patientId,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      appointmentDate: params.appointmentDate,
      tokenNumber,
      queueType: 'online',
      status: 'booked',
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      bookedByRole: 'patient',
      notes: params.notes,
      idempotencyKey: params.idempotencyKey,
      paymentStatus: params.paymentStatus || 'unpaid',
      paymentReconciliationNotes: isDelayedPaymentReconciled
        ? (params.paymentReconciliationNotes || 'Payment confirmed after 09:00 AM cutoff; reconciled for administrative / reception consultation handling.')
        : params.paymentReconciliationNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    commitAppointments([newAppointment, ...appointmentsRef.current]);

    // Asynchronously synchronize with Supabase (if configured)
    supabaseService.saveAppointment(newAppointment).catch(err => {
      console.warn('Background Supabase appointment sync warning:', err);
    });

    auditLogger.record({
      actorId: user?.id || patient.id,
      actorName: patient.fullName,
      actorRole: 'patient',
      actionType: 'appointment.book',
      targetEntity: 'appointments',
      targetId: newAppointment.id,
      description: `Online OPD Appointment confirmed. Date: ${params.appointmentDate}, Token: #${tokenNumber}`,
      metadata: { 
        code: appointmentCode, 
        date: params.appointmentDate, 
        token: tokenNumber,
        paymentStatus: newAppointment.paymentStatus,
        idempotencyKey: newAppointment.idempotencyKey
      },
    });

    return { success: true, appointment: newAppointment };
  };

  // Register Walk-In Appointment (Reception)
  const registerWalkInAppointment = (params: {
    patientProfileId: string;
    doctorId?: string;
    notes?: string;
    idempotencyKey?: string;
  }): BookingResult => {
    // 0. Idempotency Check
    if (params.idempotencyKey) {
      const existing = appointmentsRef.current.find(a => a.idempotencyKey === params.idempotencyKey);
      if (existing) {
        return { success: true, appointment: existing };
      }
    }

    const today = getHospitalTodayDate();

    // Check shared capacity ONLY IF explicitly configured
    const currentDayAppointments = appointmentsRef.current.filter(
      a => a.appointmentDate === today && a.status !== 'cancelled'
    );
    if (
      settings.maxDailyCapacity !== null && 
      settings.maxDailyCapacity !== undefined && 
      currentDayAppointments.length >= settings.maxDailyCapacity
    ) {
      return {
        success: false,
        error: `Daily OPD capacity of ${settings.maxDailyCapacity} patients reached for today.`,
      };
    }

    const patient = patientsRef.current.find(p => p.id === params.patientProfileId);
    if (!patient) {
      return { success: false, error: 'Selected patient profile was not found.' };
    }

    const alreadyQueued = currentDayAppointments.find(a => a.patientProfileId === patient.id);
    if (alreadyQueued) {
      return {
        success: false,
        error: `${patient.fullName} already holds token #${alreadyQueued.tokenNumber} for today.`,
      };
    }

    const doctor = doctors.find(d => d.id === params.doctorId) || doctors[0];
    const tokenNumber = allocateNextTokenForDate(today);
    const appointmentCode = generateAppointmentCode(appointmentsRef.current.length + 101);

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      appointmentCode,
      patientProfileId: patient.id,
      patientId: patient.patientId,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      appointmentDate: today,
      tokenNumber,
      queueType: 'walk_in',
      status: 'checked_in', // Walk-ins at reception are automatically checked-in
      checkedInAt: new Date().toISOString(),
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      bookedByRole: 'reception',
      notes: params.notes || 'Walk-in registration at reception.',
      idempotencyKey: params.idempotencyKey,
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    commitAppointments([newAppointment, ...appointmentsRef.current]);

    // Asynchronously synchronize with Supabase (if configured)
    supabaseService.saveAppointment(newAppointment).catch(err => {
      console.warn('Background Supabase appointment sync warning:', err);
    });

    auditLogger.record({
      actorId: user?.id || 'reception',
      actorName: user?.fullName || 'Reception Desk',
      actorRole: 'reception',
      actionType: 'appointment.book',
      targetEntity: 'appointments',
      targetId: newAppointment.id,
      description: `Walk-in patient registered at Reception. Assigned Token: #${tokenNumber}`,
      metadata: { token: tokenNumber, code: appointmentCode, idempotencyKey: newAppointment.idempotencyKey },
    });

    return { success: true, appointment: newAppointment };
  };

  // Update Appointment Status
  const updateAppointmentStatus = (
    appointmentId: string, 
    status: AppointmentStatus, 
    actorRole: UserRole,
    reason?: string
  ): boolean => {
    const target = appointments.find(a => a.id === appointmentId);
    if (!target) return false;

    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        return {
          ...a,
          status,
          cancellationReason: status === 'cancelled' ? reason || 'Cancelled by staff/patient' : a.cancellationReason,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    }));

    auditLogger.record({
      actorId: user?.id || 'staff',
      actorName: user?.fullName || 'Staff User',
      actorRole,
      actionType: 'appointment.status_change',
      targetEntity: 'appointments',
      targetId: appointmentId,
      description: `Appointment status transitioned from ${target.status.toUpperCase()} to ${status.toUpperCase()}`,
      metadata: { previousStatus: target.status, newStatus: status, reason },
    });

    return true;
  };

  const recordQueueAudit = (appointment: Appointment, description: string, metadata: Record<string, unknown>) => {
    auditLogger.record({
      actorId: user?.id || 'reception',
      actorName: user?.fullName || 'Reception Desk',
      actorRole: user?.role || 'reception',
      actionType: metadata.feeMode !== undefined ? 'payment.reconcile' : 'appointment.status_change',
      targetEntity: 'appointments',
      targetId: appointment.id,
      description,
      metadata,
    });
  };

  const callNextToken = (): BookingResult => {
    const res = applyCallNext(appointmentsRef.current, getHospitalTodayDate());
    if (!res.ok) return { success: false, error: res.error };
    commitAppointments(res.appointments);
    recordQueueAudit(res.appointment, `Token #${res.appointment.tokenNumber} called to consultation.`, {
      newStatus: 'in_consultation',
    });
    return { success: true, appointment: res.appointment };
  };

  const changeQueueStatus = (appointmentId: string, status: AppointmentStatus, reason?: string): BookingResult => {
    const previous = appointmentsRef.current.find(a => a.id === appointmentId);
    const res = applyStatusChange(appointmentsRef.current, appointmentId, status, { reason });
    if (!res.ok) return { success: false, error: res.error };
    commitAppointments(res.appointments);
    recordQueueAudit(res.appointment, `Token #${res.appointment.tokenNumber} moved to ${status.toUpperCase()}.`, {
      previousStatus: previous?.status,
      newStatus: status,
      reason,
    });
    return { success: true, appointment: res.appointment };
  };

  const setConsultationFee = (appointmentId: string, mode: FeePaymentMode | null): BookingResult => {
    const res = applyFeePayment(appointmentsRef.current, appointmentId, mode);
    if (!res.ok) return { success: false, error: res.error };
    commitAppointments(res.appointments);
    recordQueueAudit(
      res.appointment,
      mode
        ? `Consultation fee collected for token #${res.appointment.tokenNumber} via ${mode.toUpperCase()}.`
        : `Consultation fee for token #${res.appointment.tokenNumber} marked unpaid.`,
      { feeMode: mode }
    );
    return { success: true, appointment: res.appointment };
  };

  // Add Patient Visit (Doctor Consultation Notes)
  const addPatientVisit = (visitData: Omit<PatientVisit, 'id' | 'createdAt' | 'updatedAt'>): PatientVisit => {
    const newVisit: PatientVisit = {
      ...visitData,
      id: `vis-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setVisits(prev => [newVisit, ...prev]);

    // Mark corresponding appointment as completed
    if (visitData.appointmentId) {
      updateAppointmentStatus(visitData.appointmentId, 'completed', 'doctor');
    }

    auditLogger.record({
      actorId: user?.id || visitData.doctorId,
      actorName: visitData.doctorName,
      actorRole: 'doctor',
      actionType: 'prescription.upload',
      targetEntity: 'patient_visits',
      targetId: newVisit.id,
      description: `Doctor consultation recorded for Patient Profile ID: ${visitData.patientProfileId}`,
      metadata: { diagnosis: visitData.diagnosis },
    });

    return newVisit;
  };

  // Upload Medical Document / Scanned Prescription
  const uploadMedicalDocument = (docData: Omit<MedicalDocument, 'id' | 'createdAt'>): MedicalDocument => {
    const newDoc: MedicalDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setMedicalDocuments(prev => [newDoc, ...prev]);

    auditLogger.record({
      actorId: user?.id || docData.uploaderId,
      actorName: docData.uploaderName,
      actorRole: docData.uploaderRole,
      actionType: 'prescription.upload',
      targetEntity: 'medical_documents',
      targetId: newDoc.id,
      description: `Scanned clinical document uploaded: ${docData.title}`,
      metadata: { type: docData.documentType, fileName: docData.fileName },
    });

    return newDoc;
  };

  // Doctor Verifies Scanned Prescription
  const verifyMedicalDocument = (documentId: string, verifierName: string): boolean => {
    setMedicalDocuments(prev => prev.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          verificationStatus: 'verified',
          verifiedBy: verifierName,
          verifiedAt: new Date().toISOString(),
        };
      }
      return doc;
    }));

    auditLogger.record({
      actorId: user?.id || 'doctor',
      actorName: verifierName,
      actorRole: 'doctor',
      actionType: 'prescription.verify',
      targetEntity: 'medical_documents',
      targetId: documentId,
      description: `Doctor verified scanned prescription for patient portal release.`,
    });

    return true;
  };

  // Upload Pathology Report (Starts as pending_verification)
  const uploadPathologyReport = (
    reportData: Omit<PathologyReport, 'id' | 'reportCode' | 'createdAt'>
  ): PathologyReport => {
    const reportCode = `REP-2026-${(pathologyReports.length + 101).toString().padStart(4, '0')}`;
    const newReport: PathologyReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      reportCode,
      createdAt: new Date().toISOString(),
    };

    setPathologyReports(prev => [newReport, ...prev]);

    auditLogger.record({
      actorId: user?.id || reportData.uploadedBy,
      actorName: reportData.uploaderName,
      actorRole: 'pathology',
      actionType: 'pathology.upload',
      targetEntity: 'pathology_reports',
      targetId: newReport.id,
      description: `Pathology PDF report uploaded: ${reportData.testName} (Accession: ${reportData.labAccessionNumber})`,
      metadata: { status: newReport.status, patientId: reportData.patientId },
    });

    return newReport;
  };

  // Verify and Publish Pathology Report (Two-step safety safeguard)
  const verifyAndPublishPathologyReport = (reportId: string, verifierName: string): boolean => {
    const target = pathologyReports.find(r => r.id === reportId);
    if (!target) return false;

    // Safety check: Cannot publish an unmatched report
    if (target.status === 'unmatched' || !target.patientProfileId) {
      return false;
    }

    setPathologyReports(prev => prev.map(rep => {
      if (rep.id === reportId) {
        return {
          ...rep,
          status: 'published',
          verifiedBy: user?.id || 'pathologist',
          verifierName,
          verifiedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        };
      }
      return rep;
    }));

    auditLogger.record({
      actorId: user?.id || 'pathology',
      actorName: verifierName,
      actorRole: 'pathology',
      actionType: 'pathology.verify_publish',
      targetEntity: 'pathology_reports',
      targetId: reportId,
      description: `Pathology report verified and published to patient portal. Accession: ${target.labAccessionNumber}`,
      metadata: { testName: target.testName, patientId: target.patientId },
    });

    return true;
  };

  // Supersede an erroneous report with traceable versioning
  const supersedePathologyReport = (
    originalReportId: string,
    correctionReason: string,
    newFileDetails: { storageKey: string; fileName: string; fileSize: number; checksum?: string }
  ): PathologyReport | null => {
    const original = pathologyReports.find(r => r.id === originalReportId);
    if (!original) return null;

    const newReportId = `rep-${Date.now()}`;
    const newReportCode = `${original.reportCode}-V${original.versionNumber + 1}`;

    const newReport: PathologyReport = {
      ...original,
      id: newReportId,
      reportCode: newReportCode,
      storageKey: newFileDetails.storageKey,
      fileName: newFileDetails.fileName,
      fileSize: newFileDetails.fileSize,
      checksum: newFileDetails.checksum,
      versionNumber: original.versionNumber + 1,
      status: 'published', // Verified correction
      correctionReason,
      uploadedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      verifierName: user?.fullName || 'Senior Pathologist',
      createdAt: new Date().toISOString(),
    };

    // Mark original as superseded
    setPathologyReports(prev => prev.map((rep): PathologyReport => {
      if (rep.id === originalReportId) {
        return {
          ...rep,
          status: 'superseded' as const,
          supersededById: newReportId,
          correctionReason,
        };
      }
      return rep;
    }).concat(newReport));

    auditLogger.record({
      actorId: user?.id || 'pathology',
      actorName: user?.fullName || 'Senior Pathologist',
      actorRole: 'pathology',
      actionType: 'pathology.correct_supersede',
      targetEntity: 'pathology_reports',
      targetId: newReportId,
      description: `Report ${original.reportCode} superseded by ${newReportCode}. Reason: ${correctionReason}`,
      metadata: { originalId: originalReportId, newId: newReportId, reason: correctionReason },
    });

    return newReport;
  };

  // Today Queue Stats
  const getTodayQueueStats = () => {
    const today = getHospitalTodayDate();
    const todayApts = appointments.filter(a => a.appointmentDate === today && a.status !== 'cancelled');
    
    const onlineCount = todayApts.filter(a => a.queueType === 'online').length;
    const walkInCount = todayApts.filter(a => a.queueType === 'walk_in').length;
    const waitingCount = todayApts.filter(a => a.status === 'booked' || a.status === 'checked_in').length;
    const inConsultationCount = todayApts.filter(a => a.status === 'in_consultation').length;
    const completedCount = todayApts.filter(a => a.status === 'completed').length;
    const remainingCapacity = (settings.maxDailyCapacity !== null && settings.maxDailyCapacity !== undefined)
      ? Math.max(0, settings.maxDailyCapacity - todayApts.length)
      : null;

    return {
      totalBooked: todayApts.length,
      onlineCount,
      walkInCount,
      waitingCount,
      inConsultationCount,
      completedCount,
      remainingCapacity,
      isCapacityFull: (settings.maxDailyCapacity !== null && settings.maxDailyCapacity !== undefined)
        ? todayApts.length >= settings.maxDailyCapacity
        : false,
    };
  };

  return (
    <HospitalContext.Provider
      value={{
        settings,
        updateSettings,
        departments,
        doctors,
        pathologyTests,
        patientProfiles,
        appointments,
        visits,
        medicalDocuments,
        pathologyReports,
        registerPatient,
        searchPatients,
        getPatientById,
        bookOnlineAppointment,
        registerWalkInAppointment,
        updateAppointmentStatus,
        callNextToken,
        changeQueueStatus,
        setConsultationFee,
        addPatientVisit,
        uploadMedicalDocument,
        verifyMedicalDocument,
        uploadPathologyReport,
        verifyAndPublishPathologyReport,
        supersedePathologyReport,
        getTodayQueueStats,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
