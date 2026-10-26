/**
 * Reception: appointment search across any dates, patient lookup and medical
 * documents. All filtering, permissions and validation happen in Postgres
 * (20261030000009); this module only calls it. Files live in the private
 * `medical-records` bucket and are opened through short-lived signed URLs.
 */
import { supabase } from '../lib/supabase';
import { preparePdf } from '../lib/preparePdf';
import { mapAppointmentRow } from './queueService';
import { Appointment, AppointmentStatus } from '../types';

export const RECORD_TYPES = [
  { id: 'prescription', label: 'Doctor prescription' },
  { id: 'previous_record', label: 'Previous medical record' },
  { id: 'pathology_report', label: 'Pathology report' },
  { id: 'diagnostic_report', label: 'Diagnostic report' },
  { id: 'discharge_summary', label: 'Discharge summary' },
  { id: 'other', label: 'Other medical document' },
] as const;
export type RecordType = (typeof RECORD_TYPES)[number]['id'];
export const recordTypeLabel = (t: string) => RECORD_TYPES.find(r => r.id === t)?.label ?? (t.includes('prescription') ? 'Doctor prescription' : 'Other medical document');

export const MAX_RECORD_BYTES = 10 * 1024 * 1024;

export interface AppointmentQuery {
  from: string | null;
  to: string | null;
  statuses: AppointmentStatus[];
  queueType: 'online' | 'walk_in' | null;
  payment: 'paid' | 'unpaid' | null;
  query: string;
  sort: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface DaySummary {
  date: string;
  total: number;
  booked: number;
  checked_in: number;
  in_consultation: number;
  completed: number;
  cancelled: number;
  no_show: number;
  walk_in: number;
  online: number;
  upcoming: number;
}

export interface PatientRow {
  id: string;
  patient_id: string;
  full_name: string;
  phone: string;
  gender: string | null;
  dob: string | null;
  profile_id: string | null;
  created_at: string;
}

export interface MedicalDocumentRow {
  id: string;
  patient_profile_id: string;
  appointment_id: string | null;
  document_type: string;
  title: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_key: string;
  uploader_name: string | null;
  uploader_role: string;
  verification_status: 'unverified' | 'verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  record_date: string | null;
  superseded_by_id: string | null;
  replace_reason: string | null;
  created_at: string;
  patient?: { full_name: string; patient_id: string } | null;
  appointment?: { appointment_date: string; token_number: number; booking_reference: string | null } | null;
}

export interface UploadInput {
  patientProfileId: string;
  appointmentId: string | null;
  type: RecordType;
  title: string;
  file: File;
  recordDate: string | null;
  notes: string;
  replacesId?: string | null;
  replaceReason?: string;
}

export type UploadStage = 'checking' | 'uploading' | 'saving';

const DOC_SELECT = '*, patient:patient_profiles(full_name, patient_id), appointment:appointments(appointment_date, token_number, booking_reference)';

function client() {
  if (!supabase) throw new Error('The hospital database is not connected.');
  return supabase;
}

function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || 'Request failed. Please try again.');
}

/** PostgREST `or` filters treat , ( ) specially; strip them from free text. */
const safe = (q: string) => q.replace(/[,()*%\\]/g, ' ').trim();

/** Check the real file signature, not just the name or browser-reported type. */
export async function detectRecordFile(file: File): Promise<{ mime: 'application/pdf' | 'image/jpeg' | 'image/png'; ext: 'pdf' | 'jpg' | 'png' } | null> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPdf = new TextDecoder('latin1').decode(head).includes('%PDF-');
  if (isPdf && ext === 'pdf') return { mime: 'application/pdf', ext: 'pdf' };
  if (isJpeg && (ext === 'jpg' || ext === 'jpeg')) return { mime: 'image/jpeg', ext: 'jpg' };
  if (isPng && ext === 'png') return { mime: 'image/png', ext: 'png' };
  return null;
}

export const receptionService = {
  async searchAppointments(q: AppointmentQuery): Promise<{ total: number; rows: Appointment[] }> {
    const { data, error } = await client().rpc('reception_search_appointments', {
      p_from: q.from,
      p_to: q.to,
      p_statuses: q.statuses.length ? q.statuses : null,
      p_queue_type: q.queueType,
      p_payment: q.payment,
      p_query: q.query.trim() || null,
      p_sort: q.sort,
      p_limit: q.limit,
      p_offset: q.offset,
    });
    if (error) fail(error);
    return { total: Number(data?.total ?? 0), rows: (data?.rows ?? []).map(mapAppointmentRow) };
  },

  async summary(date: string): Promise<DaySummary> {
    const { data, error } = await client().rpc('reception_appointment_summary', { p_date: date });
    if (error) fail(error);
    return data;
  },

  async updateDetails(appointmentId: string, contactPhone: string, receptionNotes: string) {
    const { error } = await client().rpc('update_appointment_details', {
      p_appointment_id: appointmentId,
      p_contact_phone: contactPhone || null,
      p_reception_notes: receptionNotes,
    });
    if (error) fail(error);
  },

  async patientAppointments(patientProfileId: string): Promise<Appointment[]> {
    const { data, error } = await client()
      .from('appointments')
      .select('*, patient:patient_profiles(patient_id, full_name, phone), doctor:doctor_profiles(full_name)')
      .eq('patient_profile_id', patientProfileId)
      .order('appointment_date', { ascending: false })
      .limit(50);
    if (error) fail(error);
    return (data ?? []).map(mapAppointmentRow);
  },

  async searchPatients(query: string): Promise<PatientRow[]> {
    const text = safe(query);
    if (text.length < 2) return [];
    const digits = text.replace(/\D/g, '');
    const ors = [`full_name.ilike.*${text}*`, `patient_id.ilike.*${text}*`];
    if (digits.length >= 4) ors.push(`phone.like.*${digits}*`);
    const { data, error } = await client()
      .from('patient_profiles')
      .select('id, patient_id, full_name, phone, gender, dob, profile_id, created_at')
      .or(ors.join(','))
      .order('full_name')
      .limit(25);
    if (error) fail(error);
    return data ?? [];
  },

  async patient(id: string): Promise<PatientRow | null> {
    const { data, error } = await client().from('patient_profiles').select('id, patient_id, full_name, phone, gender, dob, profile_id, created_at').eq('id', id).maybeSingle();
    if (error) fail(error);
    return data;
  },

  /** Documents visible to the caller (RLS: staff see all; patients their verified, current ones). */
  async documents(f: { patientProfileId?: string; type?: string; from?: string; to?: string; unverifiedOnly?: boolean; includeReplaced?: boolean; limit?: number } = {}): Promise<MedicalDocumentRow[]> {
    let req = client().from('medical_documents').select(DOC_SELECT).order('created_at', { ascending: false }).limit(f.limit ?? 100);
    if (f.patientProfileId) req = req.eq('patient_profile_id', f.patientProfileId);
    if (f.type) req = req.eq('document_type', f.type);
    if (f.from) req = req.gte('record_date', f.from);
    if (f.to) req = req.lte('record_date', f.to);
    if (f.unverifiedOnly) req = req.eq('verification_status', 'unverified');
    if (!f.includeReplaced) req = req.is('superseded_by_id', null);
    const { data, error } = await req;
    if (error) fail(error);
    return (data ?? []) as MedicalDocumentRow[];
  },

  /**
   * Validate (signature + size), compress PDFs losslessly, upload to the private
   * bucket, then register. A file whose registration fails is deleted again.
   */
  async uploadDocument(input: UploadInput, onStage?: (s: UploadStage) => void): Promise<{ originalSize: number; finalSize: number }> {
    onStage?.('checking');
    const kind = await detectRecordFile(input.file);
    if (!kind) throw new Error('Only PDF, JPG and PNG files can be uploaded, and the file must match its extension.');

    let body: Blob = input.file;
    let originalSize = input.file.size;
    if (kind.mime === 'application/pdf') {
      const prepared = await preparePdf(input.file);
      body = new Blob([prepared.bytes as Uint8Array<ArrayBuffer>], { type: kind.mime });
      originalSize = prepared.originalSize;
    }
    if (body.size > MAX_RECORD_BYTES) throw new Error('Files must be 10 MB or smaller.');

    const key = `patients/${input.patientProfileId}/${crypto.randomUUID()}.${kind.ext}`;
    const fileName = input.file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || `record.${kind.ext}`;

    onStage?.('uploading');
    const { error: upErr } = await client().storage.from('medical-records').upload(key, body, { contentType: kind.mime, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    onStage?.('saving');
    const { error } = await client().rpc('register_medical_document', {
      p_patient_profile_id: input.patientProfileId,
      p_appointment_id: input.appointmentId,
      p_document_type: input.type,
      p_title: input.title,
      p_file_name: fileName,
      p_file_size: body.size,
      p_mime_type: kind.mime,
      p_storage_key: key,
      p_record_date: input.recordDate,
      p_notes: input.notes || null,
      p_replaces_id: input.replacesId ?? null,
      p_replace_reason: input.replaceReason || null,
    });
    if (error) {
      await client().storage.from('medical-records').remove([key]).catch(() => undefined);
      fail(error);
    }
    return { originalSize, finalSize: body.size };
  },

  /** Opens the file in a new tab through a 2-minute signed URL (storage RLS decides access). */
  async openDocument(storageKey: string) {
    const { data, error } = await client().storage.from('medical-records').createSignedUrl(storageKey, 120);
    if (error || !data) throw new Error('This document isn’t available to your account.');
    window.open(data.signedUrl, '_blank', 'noopener');
  },

  async verifyDocument(id: string) {
    const { error } = await client().rpc('verify_medical_document', { p_document_id: id });
    if (error) fail(error);
  },

  /** Any appointment change (Reception or Doctor) triggers onChange; caller refetches. */
  subscribe(onChange: () => void): () => void {
    const sb = client();
    const channel = sb
      .channel(`reception-appointments-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => onChange())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  },
};
