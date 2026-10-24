/**
 * Satya Hospital Supabase Data Access Service
 * 
 * Provides type-safe persistence operations against Supabase with:
 * - Row Level Security (RLS) enforcement
 * - Graceful fallback to verified local/mock records when offline or before remote SQL migration
 * - Clean error mapping without exposing database internals or credentials
 * - Fast timeout guard (300ms in test, 2500ms in production) to prevent hanging when offline
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Appointment, 
  DoctorProfile, 
  Department, 
  PathologyTest, 
  PatientProfile, 
  PathologyReport,
  HospitalSettings
} from '../types';
import { 
  initialDepartments, 
  initialDoctors, 
  initialHospitalSettings, 
  initialPathologyTests 
} from '../data/mockData';

export interface TestimonialRecord {
  id: string;
  patientName: string;
  locality: string;
  department: string;
  serviceType: string;
  comment: string;
  verifiedStatus: string;
  isApproved: boolean;
  displayOrder: number;
}

export interface GalleryItemRecord {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  roomInfo: string;
  description: string;
  equipment: string[];
  imageSrc?: string;
  gradient?: string;
  accentColor?: string;
  isActive: boolean;
  displayOrder: number;
}

// Timeout helper to ensure network drops or sandboxed tests fail fast to fallback
const DEFAULT_TIMEOUT_MS = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ? 300 : 2500;

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs)
    )
  ]);
}

export const supabaseService = {
  /**
   * Fetch active hospital configuration
   */
  async getHospitalSettings(): Promise<HospitalSettings> {
    if (!isSupabaseConfigured || !supabase) {
      return initialHospitalSettings;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('hospital_settings')
          .select('*')
          .limit(1)
          .maybeSingle()
      );

      if (error || !data) {
        return initialHospitalSettings;
      }

      return {
        hospitalName: data.hospital_name,
        address: data.address,
        phone: data.phone,
        emergencyPhone: data.emergency_phone,
        email: data.email,
        opdStartTime: data.opd_start_time,
        onlineCutoffTime: data.online_cutoff_time,
        maxDailyCapacity: data.max_daily_capacity,
        opdDays: data.opd_days || initialHospitalSettings.opdDays,
        operatingDays: data.opd_days || initialHospitalSettings.operatingDays,
        holidays: data.holidays || [],
        onlineBookingWindowDays: data.online_booking_window_days || 1,
        maxAdvanceBookingDays: data.max_advance_booking_days || 30,
        consultationFee: data.consultation_fee ? Number(data.consultation_fee) : null,
        isOnlinePaymentEnabled: data.is_online_payment_enabled ?? false,
        isPolicyApprovedByHospital: data.is_policy_approved_by_hospital ?? false,
        timezone: data.timezone || 'Asia/Kolkata',
        isOnlineBookingEnabled: data.is_online_booking_enabled ?? true,
        noticeBanner: data.notice_banner,
        lastUpdatedAt: data.updated_at,
        lastUpdatedBy: 'Hospital Administration',
      };
    } catch {
      return initialHospitalSettings;
    }
  },

  /**
   * Fetch active doctor profiles
   */
  async getDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured || !supabase) {
      return initialDoctors;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('doctor_profiles')
          .select('*')
          .eq('is_active', true)
      );

      if (error || !data || data.length === 0) {
        return initialDoctors;
      }

      return data.map((d: any) => ({
        id: d.id,
        profileId: d.profile_id,
        fullName: d.full_name,
        qualifications: d.qualifications,
        department: d.department,
        designation: d.designation,
        consultationRoom: d.consultation_room,
        availableDays: d.available_days,
        opdTimings: d.opd_timings,
        isActive: d.is_active,
        createdAt: d.created_at,
      }));
    } catch {
      return initialDoctors;
    }
  },

  /**
   * Fetch clinical departments
   */
  async getDepartments(): Promise<Department[]> {
    if (!isSupabaseConfigured || !supabase) {
      return initialDepartments;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('departments')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      );

      if (error || !data || data.length === 0) {
        return initialDepartments;
      }

      return data.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        headOfDepartment: dept.head_of_department,
        iconName: dept.icon_name || 'Activity',
        isActive: dept.is_active ?? true,
        displayOrder: dept.display_order ?? 0,
      }));
    } catch {
      return initialDepartments;
    }
  },

  /**
   * Fetch pathology test catalogue
   */
  async getPathologyTests(): Promise<PathologyTest[]> {
    if (!isSupabaseConfigured || !supabase) {
      return initialPathologyTests;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('pathology_tests')
          .select('*')
          .eq('is_active', true)
      );

      if (error || !data || data.length === 0) {
        return initialPathologyTests;
      }

      return data.map((t: any) => ({
        id: t.id,
        testCode: t.test_code,
        name: t.name,
        category: t.category,
        specimenType: t.specimen_type,
        fastingRequired: t.fasting_required,
        turnaroundHours: t.turnaround_hours,
        price: Number(t.price),
        isActive: t.is_active,
        createdAt: t.created_at,
      }));
    } catch {
      return initialPathologyTests;
    }
  },

  /**
   * Save an appointment to Supabase
   */
  async saveAppointment(appt: Appointment): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true }; // Local persistence handles it
    }

    try {
      const { error } = await withTimeout(
        supabase.from('appointments').insert({
          appointment_code: appt.appointmentCode,
          patient_profile_id: appt.patientProfileId,
          doctor_id: appt.doctorId || null,
          appointment_date: appt.appointmentDate,
          token_number: appt.tokenNumber,
          queue_type: appt.queueType,
          status: appt.status,
          booked_by_role: appt.bookedByRole,
          notes: appt.notes || null,
          idempotency_key: appt.idempotencyKey || null,
          payment_status: appt.paymentStatus || 'unpaid',
          payment_reconciliation_notes: appt.paymentReconciliationNotes || null,
        })
      );

      if (error) {
        console.warn('Supabase appointment insert notice (using local storage fallback):', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Database error' };
    }
  },

  /**
   * Fetch patient's appointments
   */
  async getPatientAppointments(patientProfileId: string): Promise<Appointment[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('appointments')
          .select('*')
          .eq('patient_profile_id', patientProfileId)
          .order('appointment_date', { ascending: false })
      );

      if (error || !data) {
        return [];
      }

      return data.map((a: any) => ({
        id: a.id,
        appointmentCode: a.appointment_code,
        patientProfileId: a.patient_profile_id,
        patientId: a.patient_id || 'PAT-LOCAL',
        patientName: a.patient_name || 'Patient',
        patientPhone: a.patient_phone || '',
        doctorId: a.doctor_id,
        appointmentDate: a.appointment_date,
        tokenNumber: a.token_number,
        queueType: a.queue_type,
        status: a.status,
        cancellationReason: a.cancellation_reason,
        bookedByRole: a.booked_by_role,
        notes: a.notes,
        idempotencyKey: a.idempotency_key,
        paymentStatus: a.payment_status,
        paymentReconciliationNotes: a.payment_reconciliation_notes,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch published pathology reports for a patient
   */
  async getPatientReports(patientProfileId: string): Promise<PathologyReport[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('pathology_reports')
          .select('*')
          .eq('patient_profile_id', patientProfileId)
          .eq('status', 'published')
          .order('report_date', { ascending: false })
      );

      if (error || !data) {
        return [];
      }

      return data.map((r: any) => ({
        id: r.id,
        reportCode: r.report_code,
        patientProfileId: r.patient_profile_id,
        patientId: r.patient_id || 'PAT-LOCAL',
        patientName: r.patient_name || 'Patient',
        orderId: r.order_id,
        labAccessionNumber: r.lab_accession_number,
        testName: r.test_name,
        reportDate: r.report_date,
        storageKey: r.storage_key,
        fileName: r.file_name,
        fileSize: r.file_size,
        checksum: r.checksum,
        status: r.status,
        versionNumber: r.version_number,
        uploadedBy: r.uploaded_by,
        uploaderName: r.uploader_name || 'Senior Pathologist',
        uploadedAt: r.uploaded_at,
        verifiedBy: r.verified_by,
        verifiedAt: r.verified_at,
        publishedAt: r.published_at,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch approved testimonials
   */
  async getApprovedTestimonials(): Promise<TestimonialRecord[] | null> {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('testimonials')
          .select('*')
          .eq('is_approved', true)
          .order('display_order', { ascending: true })
      );

      if (error || !data || data.length === 0) {
        return null;
      }

      return data.map((t: any) => ({
        id: t.id,
        patientName: t.patient_name,
        locality: t.locality,
        department: t.department,
        serviceType: t.service_type,
        comment: t.comment,
        verifiedStatus: t.verified_status,
        isApproved: t.is_approved,
        displayOrder: t.display_order,
      }));
    } catch {
      return null;
    }
  },

  /**
   * Fetch active gallery items
   */
  async getActiveGalleryItems(): Promise<GalleryItemRecord[] | null> {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('gallery_items')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      );

      if (error || !data || data.length === 0) {
        return null;
      }

      return data.map((g: any) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        categoryLabel: g.category_label,
        roomInfo: g.room_info,
        description: g.description,
        equipment: g.equipment || [],
        imageSrc: g.image_src,
        gradient: g.gradient,
        accentColor: g.accent_color,
        isActive: g.is_active,
        displayOrder: g.display_order,
      }));
    } catch {
      return null;
    }
  }
};
