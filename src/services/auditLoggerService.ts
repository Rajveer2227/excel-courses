/**
 * Production Audit Logging Service
 * Records audit logs for compliance, security, and administrative history
 */

export interface AuditLogEntry {
    id: string;
    eventType: 
        | 'UPLOAD_MEDIA'
        | 'REPLACE_MEDIA'
        | 'DELETE_MEDIA'
        | 'CREATE_CAMPAIGN'
        | 'DISPATCH_RECIPIENT_SUCCESS'
        | 'DISPATCH_RECIPIENT_FAILED'
        | 'CANCEL_CAMPAIGN'
        | 'DEDUPLICATE_LIST'
        | 'BULK_CAMPAIGN_LOGGED';
    actor: string;
    details: Record<string, unknown>;
    timestamp: string;
}

export class AuditLoggerService {
    private static STORAGE_KEY = 'excel_audit_logs';

    public static logEvent(eventType: AuditLogEntry['eventType'], details: Record<string, unknown>, actor = 'system'): AuditLogEntry {
        const entry: AuditLogEntry = {
            id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            eventType,
            actor,
            details,
            timestamp: new Date().toISOString()
        };

        if (typeof window !== 'undefined') {
            try {
                const existing = JSON.parse(localStorage.getItem(AuditLoggerService.STORAGE_KEY) || '[]');
                const updated = [entry, ...existing.slice(0, 499)]; // Keep latest 500 audit logs
                localStorage.setItem(AuditLoggerService.STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.warn('Failed to write audit log to storage', e);
            }
        }

        return entry;
    }

    public static getAuditLogs(): AuditLogEntry[] {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(localStorage.getItem(AuditLoggerService.STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }
}
