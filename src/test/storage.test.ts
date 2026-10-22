import { describe, it, expect } from 'vitest';
import { 
  validateDocumentFile, 
  generateStorageKey, 
  getAuthorizedSignedDocumentUrl 
} from '../lib/storage';

describe('Satya Hospital - Secure Document Storage & Boundary', () => {
  it('validates authentic PDF files and rejects oversized or invalid extensions', () => {
    // Valid PDF
    const validPdf = new File(['%PDF-1.4 mock content'], 'report.pdf', { type: 'application/pdf' });
    const resValid = validateDocumentFile(validPdf, false);
    expect(resValid.valid).toBe(true);

    // Invalid format (e.g. .exe or .txt)
    const invalidFile = new File(['malicious'], 'script.exe', { type: 'application/x-msdownload' });
    const resInvalid = validateDocumentFile(invalidFile, false);
    expect(resInvalid.valid).toBe(false);
    expect(resInvalid.error).toContain('Invalid file format');

    // Oversized file > 10MB
    const bigFile = {
      name: 'huge_scan.pdf',
      type: 'application/pdf',
      size: 15 * 1024 * 1024, // 15MB
    } as unknown as File;
    const resBig = validateDocumentFile(bigFile, false);
    expect(resBig.valid).toBe(false);
    expect(resBig.error).toContain('limit');
  });

  it('generates secure, sanitized private storage keys', () => {
    const key = generateStorageKey('reports', 'SH-2026-00001', 'Blood Report #1 (CBC).pdf');
    expect(key).toContain('reports/SH-2026-00001/');
    expect(key).toContain('blood_report__1__cbc_.pdf');
    expect(key).not.toContain(' ');
    expect(key).not.toContain('#');
  });

  it('enforces patient authorization boundaries: Patient A cannot access Patient B records', () => {
    const storageKey = 'reports/SH-2026-00002/20261022_tsh.pdf';

    // Patient A (SH-2026-00001) attempting to access Patient B's report (SH-2026-00002)
    const unauthorizedAccess = getAuthorizedSignedDocumentUrl(
      storageKey,
      'patient',
      'SH-2026-00001', // Requesting Patient ID
      'SH-2026-00002'  // Document Owner ID
    );
    expect(unauthorizedAccess.success).toBe(false);
    expect(unauthorizedAccess.error).toContain('Security Violation');

    // Patient B accessing their own report
    const authorizedAccess = getAuthorizedSignedDocumentUrl(
      storageKey,
      'patient',
      'SH-2026-00002',
      'SH-2026-00002'
    );
    expect(authorizedAccess.success).toBe(true);

    // Doctor accessing record
    const doctorAccess = getAuthorizedSignedDocumentUrl(
      storageKey,
      'doctor',
      undefined,
      'SH-2026-00002'
    );
    expect(doctorAccess.success).toBe(true);
  });
});
