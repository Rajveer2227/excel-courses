import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Settings,
  Clock,
  PhoneOff,
  FileWarning,
  WifiOff,
  ServerCrash,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  Code,
  Download,
  RotateCcw
} from 'lucide-react';
import type { DispatchResult } from '../../services/whatsappDispatchEngine';
import {
  PerformanceFormatter,
  MaskingUtility,
  CopyFormatter,
  DiagnosticExporter,
  type PerformanceMetrics,
  type TimelineEvent
} from '../../utils/dispatchDiagnostics';

export interface ToastMessageData {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  dynamicMetaMessage?: string;
  code?: string;
  statusCode?: number;
  dispatchId?: string;
  recipientPhone?: string;
  studentName?: string;
  courseTitle?: string;
  filesCount?: number;
  wamid?: string;
  sentAt?: string;
  rawDetails?: any;
  timestamp: string;
  timeline?: TimelineEvent[];
  metrics?: PerformanceMetrics;
  originalOptions?: any;
}

interface ToastNotificationProps {
  toast: ToastMessageData | null;
  onClose: () => void;
  onRetry?: (toast: ToastMessageData) => void;
  isRetrying?: boolean;
}

export function mapResultToToastData(
  res: DispatchResult,
  extraContext?: {
    recipientPhone?: string;
    studentName?: string;
    courseTitle?: string;
    filesCount?: number;
    timeline?: TimelineEvent[];
    metrics?: PerformanceMetrics;
    originalOptions?: any;
  }
): ToastMessageData {
  const code = (res.code || '').toUpperCase();
  const statusCode = res.statusCode;
  const dispatchId = res.dispatchId;
  const errorMsg = res.error || '';
  const now = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });

  // Extract dynamic Meta message if present
  const metaErrorObj = res.details?.metaError || res.details?.error || {};
  const dynamicMetaMsg =
    metaErrorObj.error_user_msg ||
    metaErrorObj.message ||
    metaErrorObj.error_data?.details ||
    (typeof res.details?.error === 'string' ? res.details.error : undefined);

  const recipientPhone = extraContext?.recipientPhone || res.details?.recipient;
  const studentName = extraContext?.studentName;
  const courseTitle = extraContext?.courseTitle;
  const filesCount = extraContext?.filesCount ?? res.deliveredMediaCount;
  const wamid = res.textMessageId || res.details?.messageId;
  const timeline = extraContext?.timeline;
  const metrics = extraContext?.metrics || {
    backendDurationMs: res.details?.durationMs || 350,
    totalDurationMs: (res.details?.durationMs || 350) + 120
  };
  const originalOptions = extraContext?.originalOptions;

  // 1. Success Case
  if (res.success) {
    return {
      id: `toast-${Date.now()}`,
      type: 'success',
      title: 'WhatsApp Message Sent',
      message: 'The WhatsApp message and selected materials were delivered successfully.',
      code: 'SUCCESS',
      statusCode: 200,
      dispatchId,
      recipientPhone,
      studentName,
      courseTitle,
      filesCount,
      wamid,
      sentAt: now,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 2. META_AUTH_ERROR (401 / 403)
  if (code.includes('AUTH') || statusCode === 401 || statusCode === 403) {
    return {
      id: `toast-${Date.now()}`,
      type: 'error',
      title: 'Authentication Failed',
      message: 'The WhatsApp Business access token is invalid or has expired. Please generate a new access token in the Meta Developer Console and update the server configuration.',
      dynamicMetaMessage: dynamicMetaMsg || 'Access token has expired or is unauthorized.',
      code: 'META_AUTH_ERROR',
      statusCode: statusCode || 401,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 3. CREDENTIALS_NOT_CONFIGURED (503)
  if (code.includes('CREDENTIALS') || statusCode === 503) {
    return {
      id: `toast-${Date.now()}`,
      type: 'warning',
      title: 'Server Configuration Missing',
      message: 'Required WhatsApp Business credentials are missing from the server environment. Please verify the deployment configuration.',
      dynamicMetaMessage: dynamicMetaMsg,
      code: 'CREDENTIALS_NOT_CONFIGURED',
      statusCode: 503,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 4. META_CONVERSATION_WINDOW_CLOSED (131047 / 24-hour window)
  if (code.includes('WINDOW') || errorMsg.includes('24-hour') || errorMsg.includes('window') || errorMsg.includes('131047')) {
    return {
      id: `toast-${Date.now()}`,
      type: 'warning',
      title: 'Conversation Window Closed',
      message: 'The customer has not contacted this WhatsApp Business number within the last 24 hours. Send an approved template message or ask the customer to send a message first.',
      dynamicMetaMessage: dynamicMetaMsg || '24-hour customer engagement window expired.',
      code: 'META_CONVERSATION_WINDOW_CLOSED',
      statusCode: statusCode || 400,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 5. META_INVALID_PHONE / INVALID_PHONE_NUMBER
  if (code.includes('PHONE') || errorMsg.includes('phone') || errorMsg.includes('number')) {
    return {
      id: `toast-${Date.now()}`,
      type: 'warning',
      title: 'Invalid Phone Number',
      message: 'The supplied phone number is invalid or is not registered on WhatsApp.',
      dynamicMetaMessage: dynamicMetaMsg || 'The phone number is not registered on WhatsApp.',
      code: 'META_INVALID_PHONE',
      statusCode: statusCode || 400,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 6. MEDIA_DOWNLOAD_FAILED / INVALID_MEDIA_URL
  if (code.includes('MEDIA') || errorMsg.includes('media') || errorMsg.includes('URL') || errorMsg.includes('download')) {
    return {
      id: `toast-${Date.now()}`,
      type: 'warning',
      title: 'Attachment Not Accessible',
      message: 'The selected PDF or media file could not be downloaded by Meta. Verify that the file is publicly accessible over HTTPS.',
      dynamicMetaMessage: dynamicMetaMsg,
      code: 'MEDIA_DOWNLOAD_FAILED',
      statusCode: statusCode || 400,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 7. NETWORK_ERROR / REQUEST_TIMEOUT (504)
  if (code.includes('TIMEOUT') || code.includes('NETWORK') || statusCode === 504) {
    return {
      id: `toast-${Date.now()}`,
      type: 'error',
      title: 'Network Error',
      message: 'Unable to reach the WhatsApp service. Please check your internet connection and try again.',
      dynamicMetaMessage: dynamicMetaMsg,
      code: 'NETWORK_ERROR',
      statusCode: statusCode || 504,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 8. SERVER_ERROR (500 / 502)
  if (code.includes('SERVER') || statusCode === 500 || statusCode === 502) {
    return {
      id: `toast-${Date.now()}`,
      type: 'error',
      title: 'Internal Server Error',
      message: 'An unexpected server error occurred while processing the request.',
      dynamicMetaMessage: dynamicMetaMsg,
      code: 'SERVER_ERROR',
      statusCode: statusCode || 500,
      dispatchId,
      recipientPhone,
      rawDetails: MaskingUtility.maskSecrets(res.details || res),
      timestamp: now,
      timeline,
      metrics,
      originalOptions
    };
  }

  // 9. Fallback (Unknown Error)
  return {
    id: `toast-${Date.now()}`,
    type: 'error',
    title: 'Dispatch Failed',
    message: 'An unexpected error occurred. Please copy the diagnostics below if you contact support.',
    dynamicMetaMessage: dynamicMetaMsg || errorMsg,
    code: code || 'UNKNOWN_ERROR',
    statusCode: statusCode || 500,
    dispatchId,
    recipientPhone,
    rawDetails: MaskingUtility.maskSecrets(res.details || res),
    timestamp: now,
    timeline,
    metrics,
    originalOptions
  };
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose, onRetry, isRetrying }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);

  useEffect(() => {
    if (!toast) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (!isExpanded && !showRawJson) {
      const timer = setTimeout(() => {
        onClose();
      }, 9000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast, isExpanded, showRawJson, onClose]);

  if (!toast) return null;

  const handleCopyDiagnostics = () => {
    const copyText = CopyFormatter.generateCopyText(toast);
    navigator.clipboard.writeText(copyText);
    setCopiedDiagnostics(true);
    setTimeout(() => setCopiedDiagnostics(false), 2000);
  };

  const handleExportDiagnostics = () => {
    DiagnosticExporter.downloadDiagnosticsJson(toast);
  };

  const colorStyles = {
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-slate-900/95',
      glow: 'shadow-[0_10px_30px_rgba(16,185,129,0.15)]',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    },
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-slate-900/95',
      glow: 'shadow-[0_10px_30px_rgba(245,158,11,0.15)]',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    },
    error: {
      border: 'border-rose-500/40',
      bg: 'bg-slate-900/95',
      glow: 'shadow-[0_10px_30px_rgba(244,63,94,0.15)]',
      iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    },
    info: {
      border: 'border-cyan-500/40',
      bg: 'bg-slate-900/95',
      glow: 'shadow-[0_10px_30px_rgba(6,182,212,0.15)]',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
    }
  }[toast.type];

  const renderIcon = () => {
    switch (toast.code) {
      case 'META_AUTH_ERROR':
        return <ShieldAlert className="w-5 h-5" />;
      case 'CREDENTIALS_NOT_CONFIGURED':
        return <Settings className="w-5 h-5" />;
      case 'META_CONVERSATION_WINDOW_CLOSED':
        return <Clock className="w-5 h-5" />;
      case 'META_INVALID_PHONE':
        return <PhoneOff className="w-5 h-5" />;
      case 'MEDIA_DOWNLOAD_FAILED':
        return <FileWarning className="w-5 h-5" />;
      case 'NETWORK_ERROR':
        return <WifiOff className="w-5 h-5" />;
      case 'SERVER_ERROR':
        return <ServerCrash className="w-5 h-5" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      tabIndex={0}
      className="fixed top-5 right-3 sm:right-5 z-[9999] w-[calc(100vw-24px)] sm:w-[90%] md:w-[420px] max-w-[420px] transition-all duration-300 transform translate-y-0 opacity-100 outline-none"
    >
      <div className={`p-4 rounded-2xl border backdrop-blur-xl ${colorStyles.bg} ${colorStyles.border} ${colorStyles.glow} text-slate-100 shadow-2xl space-y-3`}>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 ${colorStyles.iconBg}`}>
              {renderIcon()}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-100 tracking-wide">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {toast.message}
              </p>

              {/* Dynamic Meta Error Highlight */}
              {toast.dynamicMetaMessage && toast.type !== 'success' && (
                <div className="mt-1.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-amber-300 font-medium leading-normal">
                  {toast.dynamicMetaMessage}
                </div>
              )}

              {/* Retry Failed Dispatch Button */}
              {toast.type !== 'success' && onRetry && (
                <div className="pt-1.5">
                  <button
                    onClick={() => onRetry(toast)}
                    disabled={isRetrying}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? 'Retrying Dispatch...' : 'Retry Dispatch'}</span>
                  </button>
                </div>
              )}

              {/* Rich Success Info */}
              {toast.type === 'success' && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300 font-mono">
                  {toast.recipientPhone && (
                    <div>
                      <span className="text-slate-500 font-sans">Recipient: </span>
                      <span className="text-emerald-400 font-semibold">{toast.recipientPhone}</span>
                    </div>
                  )}

                  {toast.studentName && (
                    <div>
                      <span className="text-slate-500 font-sans">Student: </span>
                      <span className="text-slate-200 font-medium">{toast.studentName}</span>
                    </div>
                  )}

                  {toast.courseTitle && (
                    <div className="col-span-2">
                      <span className="text-slate-500 font-sans">Course: </span>
                      <span className="text-slate-200 font-medium">{toast.courseTitle}</span>
                    </div>
                  )}

                  {typeof toast.filesCount === 'number' && (
                    <div>
                      <span className="text-slate-500 font-sans">Files Sent: </span>
                      <span className="text-cyan-400 font-bold">{toast.filesCount}</span>
                    </div>
                  )}

                  {toast.sentAt && (
                    <div>
                      <span className="text-slate-500 font-sans">Sent At: </span>
                      <span className="text-slate-400">{toast.sentAt}</span>
                    </div>
                  )}

                  {toast.wamid && (
                    <div className="col-span-2 text-[10px] text-slate-400 truncate" title={toast.wamid}>
                      <span className="text-slate-500 font-sans">WAMID: </span>
                      <span>{toast.wamid}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors flex-shrink-0"
            title="Dismiss notification (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Technical Details Accordion */}
        {(toast.code || toast.statusCode || toast.dispatchId) && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-[11px] font-medium text-slate-400 hover:text-slate-200 py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>Technical Details</span>
                {toast.dispatchId && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {toast.dispatchId}
                  </span>
                )}
              </span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-2.5 text-xs font-mono">
                {toast.code && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 font-sans text-[11px]">Error Code:</span>
                    <span className="text-amber-400 font-semibold">{toast.code}</span>
                  </div>
                )}

                {toast.statusCode && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 font-sans text-[11px]">HTTP Status:</span>
                    <span className="text-slate-200 font-medium">{toast.statusCode}</span>
                  </div>
                )}

                {/* API Performance Metrics */}
                {toast.metrics && (
                  <div className="pt-1.5 border-t border-slate-900 space-y-1">
                    <div className="text-[10px] font-sans text-slate-400 font-semibold uppercase tracking-wider">
                      Performance Metrics
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-sans">Backend: </span>
                        <span className="text-cyan-400 font-semibold">{PerformanceFormatter.formatMs(toast.metrics.backendDurationMs)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Total: </span>
                        <span className="text-emerald-400 font-semibold">{PerformanceFormatter.formatMs(toast.metrics.totalDurationMs)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Timeline */}
                {toast.timeline && toast.timeline.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-900 space-y-1">
                    <div className="text-[10px] font-sans text-slate-400 font-semibold uppercase tracking-wider">
                      Delivery Timeline
                    </div>
                    <div className="space-y-1 pl-1">
                      {toast.timeline.map((ev, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className={ev.status === 'success' ? 'text-emerald-400' : ev.status === 'failed' ? 'text-rose-400' : 'text-amber-400'}>
                              {ev.status === 'success' ? '✓' : ev.status === 'failed' ? '✗' : '•'}
                            </span>
                            <span className="text-slate-300">{ev.label}</span>
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">{ev.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnostics Action Buttons */}
                <div className="pt-2 border-t border-slate-900 grid grid-cols-3 gap-1.5">
                  <button
                    onClick={handleCopyDiagnostics}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[10px] text-cyan-400 font-sans transition-colors border border-slate-700"
                  >
                    {copiedDiagnostics ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDiagnostics ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <button
                    onClick={handleExportDiagnostics}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[10px] text-emerald-400 font-sans transition-colors border border-slate-700"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[10px] text-amber-400 font-sans transition-colors border border-slate-700"
                  >
                    <Code className="w-3 h-3" />
                    <span>{showRawJson ? 'Hide' : 'Raw JSON'}</span>
                  </button>
                </div>

                {/* Raw JSON Accordion (Secret Masked) */}
                {showRawJson && toast.rawDetails && (
                  <div className="mt-2 pt-2 border-t border-slate-900">
                    <pre className="p-2.5 rounded-lg bg-slate-950 text-[10px] text-emerald-400 border border-slate-800 overflow-x-auto max-h-48 leading-tight">
                      {JSON.stringify(toast.rawDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
