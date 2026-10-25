export type UserRole = 'patient' | 'reception' | 'doctor' | 'pathology' | 'admin';

export interface UserProfile {
  id: string; // Supabase auth UUID
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PatientProfile {
  id: string; // Primary UUID
  profileId?: string; // Supabase auth user link if registered online
  patientId: string; // Immutable hospital identifier, e.g. "SH-2026-00042"
  fullName: string;
  dob?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other'; // optional on the online booking form
  phone: string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 
  | 'booked' 
  | 'checked_in' 
  | 'in_consultation' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export type QueueType = 'online' | 'walk_in';

export type PaymentStatus = 
  | 'unpaid'
  | 'not_applicable' 
  | 'pending' 
  | 'captured' 
  | 'paid'
  | 'failed' 
  | 'refunded' 
  | 'delayed_reconciled';

export interface Appointment {
  id: string;
  appointmentCode: string; // e.g. "APT-2026-891"
  patientProfileId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  tokenNumber: number; // Daily OPD token sequence (e.g. 1, 2, 3...)
  queueType: QueueType;
  status: AppointmentStatus;
  doctorId?: string;
  doctorName?: string;
  cancellationReason?: string;
  bookedByRole: UserRole;
  notes?: string;
  idempotencyKey?: string;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  paymentReconciliationNotes?: string;
  consultationFeeAmount?: number;
  bookingReference?: string;
  contactPhone?: string;
  visitReason?: string;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  amountPaid?: number | null;
  paidAt?: string;
  feePaymentMode?: FeePaymentMode | null;
  feeCollectedAt?: string;
  checkedInAt?: string;
  calledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type FeePaymentMode = 'cash' | 'upi';

export interface DoctorProfile {
  id: string;
  profileId: string;
  fullName: string;
  qualifications: string;
  department: string;
  designation: string;
  consultationRoom: string;
  availableDays: string[];
  opdTimings: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  headOfDepartment?: string;
  iconName: string;
  isActive: boolean;
  displayOrder: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  description: string;
  features: string[];
  isEmergencyAvailable: boolean;
  isActive: boolean;
}

export interface PatientVisit {
  id: string;
  patientProfileId: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  chiefComplaint: string;
  clinicalNotes: string;
  diagnosis?: string;
  doctorSignature?: string;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'handwritten_prescription_scan' 
  | 'doctor_summary' 
  | 'external_report' 
  | 'consent_form';

export interface MedicalDocument {
  id: string;
  patientProfileId: string;
  visitId?: string;
  documentType: DocumentType;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: UserRole;
  verificationStatus: 'unverified' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export type PathologyReportStatus = 
  | 'unmatched'
  | 'pending_verification' 
  | 'published' 
  | 'superseded' 
  | 'rejected';

export interface PathologyTest {
  id: string;
  testCode: string; // e.g. "CBC", "LFT", "KFT"
  name: string;
  category: string;
  specimenType: string | null; // null until verified by pathology staff
  fastingRequired: boolean;
  turnaroundHours: number | null;
  price: number;
  isActive: boolean;
}

export interface PathologyReport {
  id: string;
  reportCode: string; // e.g. "REP-2026-0045"
  patientProfileId?: string;
  patientId: string;
  patientName: string;
  orderId?: string;
  labAccessionNumber: string; // e.g. "ACC-2026-904"
  testName: string;
  reportDate: string;
  storageKey: string;
  fileName: string;
  fileSize: number;
  checksum?: string;
  status: PathologyReportStatus;
  versionNumber: number;
  supersededById?: string;
  correctionReason?: string;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifierName?: string;
  verifiedAt?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface HospitalSettings {
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  timezone: string; // e.g. "Asia/Kolkata"
  opdStartTime: string; // e.g. "09:30"
  onlineCutoffTime: string; // e.g. "09:00"
  maxDailyCapacity?: number | null; // Optional; null represents UNLIMITED daily capacity (no hard limit of 50)
  opdDays: string[]; // e.g. ['Monday', 'Tuesday', ...]
  operatingDays: string[]; // explicit configured days
  holidays: string[]; // specific dates in YYYY-MM-DD
  onlineBookingWindowDays: number; // deprecated: superseded by maxAdvanceBookingDays
  maxAdvanceBookingDays: number; // online booking open for eligible dates up to this many days ahead
  isOnlineBookingEnabled: boolean;
  isOnlinePaymentEnabled: boolean; // default: false (payments disabled until hospital approves)
  consultationFee: number | null; // null represents unconfirmed/pending hospital fee approval
  isPolicyApprovedByHospital: boolean; // false = DRAFT text
  noticeBanner?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actionType: 
    | 'auth.login'
    | 'auth.logout'
    | 'patient.register'
    | 'patient.update'
    | 'appointment.book'
    | 'appointment.status_change'
    | 'payment.callback'
    | 'payment.reconcile'
    | 'payment.refund'
    | 'prescription.upload'
    | 'prescription.verify'
    | 'pathology.upload'
    | 'pathology.verify_publish'
    | 'pathology.correct_supersede'
    | 'staff.role_change'
    | 'settings.update'
    | 'document.access';
  targetEntity: string;
  targetId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  patientProfileId?: string;
  consentType: 'dpdp_privacy_notice' | 'medical_treatment_terms' | 'teleconsult_disclaimer';
  policyVersion: string;
  agreed: boolean;
  ipAddress?: string;
  timestamp: string;
}
