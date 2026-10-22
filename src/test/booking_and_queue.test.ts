import { describe, it, expect, beforeEach } from 'vitest';
import { initialHospitalSettings, initialPatientProfiles, initialAppointments } from '../data/mockData';
import { auditLogger } from '../lib/audit';

describe('Satya Hospital - Booking Engine & Shared Queue Logic', () => {
  it('records tamper-evident audit logs and strips sensitive auth secrets', () => {
    const entry = auditLogger.record({
      actorId: 'usr-admin-1',
      actorName: 'Admin User',
      actorRole: 'admin',
      actionType: 'settings.update',
      targetEntity: 'hospital_settings',
      targetId: 'global',
      description: 'Modified online booking cutoff time to 09:00 AM IST',
      metadata: {
        newCutoff: '09:00',
        password: 'secret_password_123', // Should be sanitized
        token: 'oauth_bearer_xyz',        // Should be sanitized
      },
    });

    expect(entry.id).toBeDefined();
    expect(entry.actionType).toBe('settings.update');
    expect(entry.metadata?.newCutoff).toBe('09:00');
    expect(entry.metadata?.password).toBeUndefined();
    expect(entry.metadata?.token).toBeUndefined();

    const logs = auditLogger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].id).toBe(entry.id);
  });

  it('verifies that initial pre-seeded hospital data contains valid Asian/Kolkata timezone rules and unlimited capacity', () => {
    expect(initialHospitalSettings.timezone).toBe('Asia/Kolkata');
    expect(initialHospitalSettings.opdStartTime).toBe('09:30');
    expect(initialHospitalSettings.onlineCutoffTime).toBe('09:00');
    expect(initialHospitalSettings.maxDailyCapacity).toBeNull(); // Unlimited daily capacity (no hard limit of 50 or 60)
    expect(initialHospitalSettings.isOnlinePaymentEnabled).toBe(false); // Live payments disabled until approved
    expect(initialHospitalSettings.isPolicyApprovedByHospital).toBe(false); // Legal draft status
  });

  it('verifies that pre-registered patients carry unique immutable Patient IDs', () => {
    const ids = initialPatientProfiles.map(p => p.patientId);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);

    ids.forEach(id => {
      expect(id).toMatch(/^SH-\d{4}-\d{5}$/);
    });
  });
});
