/**
 * Production Diagnostics & Formatters for WhatsApp Dispatch Pipeline
 * Centralized utility handlers for error mapping, performance metrics, copy formatters, and export downloads.
 */

import type { ToastMessageData } from '../components/common/ToastNotification';

export interface PerformanceMetrics {
  backendDurationMs: number;
  mediaUploadDurationMs?: number;
  totalDurationMs: number;
}

export interface TimelineEvent {
  label: string;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
}

export class PerformanceFormatter {
  public static formatMs(ms?: number): string {
    if (!ms || ms <= 0) return '0 ms';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} sec`;
  }
}

export class MaskingUtility {
  public static maskSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(clone)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('bearer') ||
        lowerKey.includes('password')
      ) {
        clone[key] = '***MASKED_SECRET***';
      } else if (typeof clone[key] === 'object' && clone[key] !== null) {
        clone[key] = MaskingUtility.maskSecrets(clone[key]);
      }
    }

    return clone;
  }
}

export class CopyFormatter {
  public static generateCopyText(toast: ToastMessageData): string {
    const lines = [
      `=== EXCEL COMPUTERS WHATSAPP DISPATCH DIAGNOSTICS ===`,
      `Dispatch ID: ${toast.dispatchId || 'N/A'}`,
      `Timestamp: ${toast.timestamp}`,
      `Status: ${toast.type.toUpperCase()}`,
      `HTTP Status Code: ${toast.statusCode || 'N/A'}`,
      `Error Code: ${toast.code || 'N/A'}`,
      `Title: ${toast.title}`,
      `Message: ${toast.message}`,
      `Meta Detail: ${toast.dynamicMetaMessage || 'N/A'}`,
      `Recipient: ${toast.recipientPhone || 'N/A'}`,
      `Student Name: ${toast.studentName || 'N/A'}`,
      `Course Title: ${toast.courseTitle || 'N/A'}`,
      `Files Sent: ${toast.filesCount ?? 0}`,
      `Backend Duration: ${PerformanceFormatter.formatMs(toast.metrics?.backendDurationMs)}`,
      `Total Duration: ${PerformanceFormatter.formatMs(toast.metrics?.totalDurationMs)}`
    ];
    return lines.join('\n');
  }
}

export class DiagnosticExporter {
  public static downloadDiagnosticsJson(toast: ToastMessageData) {
    const sanitizedToast = MaskingUtility.maskSecrets(toast);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitizedToast, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `dispatch-diagnostics-${toast.dispatchId || Date.now()}.json`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
