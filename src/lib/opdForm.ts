import { isValidIndianPhone } from './tokens';

export interface OpdFormValues {
  appointmentDate: string;
  patientName: string;
  phone: string;
  gender: '' | 'male' | 'female' | 'other';
  reason: string;
}

export type OpdFormErrors = Partial<Record<keyof OpdFormValues, string>>;

/** Client-side checks for instant feedback. The database re-validates everything. */
export function validateOpdForm(v: OpdFormValues): OpdFormErrors {
  const errors: OpdFormErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.appointmentDate)) errors.appointmentDate = 'Choose an appointment date.';
  if (!v.patientName.trim()) errors.patientName = 'Enter the patient’s name.';
  else if (v.patientName.trim().length > 120) errors.patientName = 'Name is too long.';
  if (!v.phone.trim()) errors.phone = 'Enter a mobile number so the hospital can reach you.';
  else if (!isValidIndianPhone(v.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (!v.reason.trim()) errors.reason = 'Tell us briefly why you are visiting.';
  else if (v.reason.trim().length > 500) errors.reason = 'Please keep the reason under 500 characters.';
  return errors;
}

export function newBookingKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `opd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
