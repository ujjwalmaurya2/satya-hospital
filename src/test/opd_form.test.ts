import { describe, expect, it } from 'vitest';
import { validateOpdForm, OpdFormValues } from '../lib/opdForm';

const base: OpdFormValues = { appointmentDate: '2026-10-26', patientName: 'Aarav Mishra', phone: '9876543210', gender: '', reason: 'Fever since yesterday' };

describe('OPD booking form validation', () => {
  it('accepts a complete form with gender left blank', () => {
    expect(validateOpdForm(base)).toEqual({});
  });

  it('requires a mobile number and validates its format', () => {
    expect(validateOpdForm({ ...base, phone: '' }).phone).toMatch(/mobile number/);
    expect(validateOpdForm({ ...base, phone: '12345' }).phone).toMatch(/valid 10-digit/);
  });

  it('requires a reason for visit and a patient name', () => {
    expect(validateOpdForm({ ...base, reason: '   ' }).reason).toBeDefined();
    expect(validateOpdForm({ ...base, patientName: '' }).patientName).toBeDefined();
  });

  it('requires a date', () => {
    expect(validateOpdForm({ ...base, appointmentDate: '' }).appointmentDate).toBeDefined();
  });
});
