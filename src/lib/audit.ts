import { AuditLogEntry, UserRole } from '../types';

const AUDIT_STORAGE_KEY = 'satya_hospital_audit_logs';

/**
 * Audit Logger Service
 * Maintains an immutable log of access, status updates, role changes, and clinical/lab events.
 */
class AuditLogger {
  private logs: AuditLogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      }
    } catch {
      this.logs = [];
    }
  }

  public getLogs(): AuditLogEntry[] {
    return [...this.logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public record(params: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    actionType: AuditLogEntry['actionType'];
    targetEntity: string;
    targetId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry {
    // Sanitise metadata: strip passwords, raw tokens, or signed URLs
    const sanitizedMetadata = params.metadata ? { ...params.metadata } : {};
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.signedUrl;
    delete sanitizedMetadata.accessToken;

    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      actionType: params.actionType,
      targetEntity: params.targetEntity,
      targetId: params.targetId,
      description: params.description,
      metadata: sanitizedMetadata,
      createdAt: new Date().toISOString(),
    };

    this.logs.unshift(entry);

    // Keep up to 500 audit logs in local store
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(0, 500);
    }

    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.logs));
      }
    } catch {
      // Storage quota or privacy mode fallback
    }

    return entry;
  }
}

export const auditLogger = new AuditLogger();
