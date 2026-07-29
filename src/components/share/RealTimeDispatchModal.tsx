import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, RefreshCw, X, Minimize2, ExternalLink, Clock, User, Layers, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DispatchProgressPayload } from '../../services/whatsappDispatchEngine';

export interface RealTimeDispatchModalProps {
  isOpen: boolean;
  progress: DispatchProgressPayload | null;
  recipientName: string;
  totalMaterials: number;
  onClose: () => void;
  onRetry?: () => void;
  onViewLog?: () => void;
  onViewHistory?: () => void;
}

export const RealTimeDispatchModal: React.FC<RealTimeDispatchModalProps> = ({
  isOpen,
  progress,
  recipientName,
  totalMaterials,
  onClose,
  onRetry,
  onViewLog,
  onViewHistory
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  const isCompleted = progress?.event === 'DISPATCH_COMPLETE' || progress?.state === 'completed';
  const isFailed = progress?.event === 'DISPATCH_FAILED' || progress?.state === 'failed';
  const isRunning = !isCompleted && !isFailed && isOpen;

  // Track elapsed dispatch time
  useEffect(() => {
    if (isOpen && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isRunning]);

  // Handle Auto-Close on completion
  useEffect(() => {
    if (isCompleted) {
      setAutoCloseCountdown(3);
      const interval = setInterval(() => {
        setAutoCloseCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      autoCloseTimerRef.current = interval;
      return () => {
        clearInterval(interval);
      };
    } else {
      setAutoCloseCountdown(null);
    }
  }, [isCompleted, onClose]);

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setElapsedMs(0);
      startTimeRef.current = Date.now();
    } else {
      startTimeRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPercent = progress?.progressPercent || (isCompleted ? 100 : 5);
  const displayCompletedCount = isCompleted
    ? totalMaterials
    : Math.min(progress?.currentMediaIndex || 0, totalMaterials);
  const currentMaterialTitle = progress?.currentMediaTitle || 'Initializing...';
  const durationSecStr = (elapsedMs / 1000).toFixed(1);

  // Status Badge Formatting
  const getStatusBadge = () => {
    if (isCompleted) return { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (isFailed) return { label: 'Failed', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    if (progress?.event === 'UTILITY_FALLBACK') return { label: 'Utility Fallback', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' };
    return { label: 'Live Dispatch', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse' };
  };

  const statusBadge = getStatusBadge();

  // Minimized Widget view
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-[#161b22]/95 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-white w-80"
        >
          <div className="relative w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
            {isRunning && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isFailed && <AlertTriangle className="w-5 h-5 text-rose-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white truncate">{progress?.message || 'Dispatching...'}</span>
              <span className="text-[10px] font-mono font-bold text-blue-400">{currentPercent}%</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentMaterialTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
            title="Expand Dispatch Progress Modal"
          >
            Expand
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <AnimatePresence mode="wait">
        <motion.div
          key="modal"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#161b22]/95 border border-white/20 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl"
        >
          {/* Top Decorative Ambient Glow */}
          <div className={cn(
            "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-500",
            isCompleted ? "bg-emerald-500/15" : isFailed ? "bg-rose-500/15" : "bg-blue-500/15"
          )} />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg shrink-0",
                isCompleted ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                isFailed ? "bg-rose-500/20 border-rose-500/40 text-rose-400" :
                "bg-blue-500/20 border-blue-500/40 text-blue-400"
              )}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                 isFailed ? <AlertTriangle className="w-5 h-5" /> :
                 <RefreshCw className="w-5 h-5 animate-spin" />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  {isCompleted ? 'Dispatch Completed' : isFailed ? 'Dispatch Failed' : 'Dispatching WhatsApp Package'}
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border", statusBadge.color)}>
                    {statusBadge.label}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {isCompleted ? 'All materials successfully processed and logged.' :
                   isFailed ? 'Dispatch halted due to a transmission error.' :
                   'Real-time event-driven WhatsApp Cloud API pipeline.'}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5">
              {isRunning && (
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Minimize progress view"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
              {!isRunning && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* MAIN MODAL BODY STATE CAROUSEL */}

          {/* 1. SUCCESS SCREEN */}
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-4 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-white">Successfully Delivered</h4>
                <p className="text-sm font-semibold text-emerald-300 mt-1">
                  {totalMaterials} materials successfully sent to {recipientName}.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Duration: <strong>{durationSecStr} seconds</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full pt-4">
                {onViewHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewHistory();
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>View History</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                >
                  Done {autoCloseCountdown !== null ? `(${autoCloseCountdown}s)` : ''}
                </button>
              </div>
            </motion.div>

          ) : isFailed ? (

            /* 2. FAILURE SCREEN */
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-4 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-500/20">
                <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-white">Dispatch Failed</h4>
                <p className="text-xs text-rose-300 font-semibold">
                  Failed while sending: <span className="underline font-bold">{progress?.failedMediaTitle || currentMaterialTitle}</span>
                </p>
                <p className="text-xs text-slate-400 max-w-sm pt-1">
                  {progress?.friendlyStatus || progress?.description || 'WhatsApp Cloud API encountered a transmission error. No further charges were incurred.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full pt-4">
                {onViewLog && (
                  <button
                    type="button"
                    onClick={onViewLog}
                    className="py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs border border-white/15 transition-all cursor-pointer"
                  >
                    View Log
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Dispatch</span>
                  </button>
                )}
              </div>
            </motion.div>

          ) : (

            /* 3. ACTIVE REAL-TIME DISPATCH PROGRESS VIEW */
            <div className="space-y-5">
              {/* Progress Readout & Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Progress Milestone</span>
                  </span>
                  <span className="text-lg font-black font-mono text-blue-400 tracking-tight">
                    {currentPercent}%
                  </span>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-3 rounded-full bg-[#0d1117] border border-white/10 overflow-hidden p-0.5 relative shadow-inner">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-purple-500 shadow-md transition-all duration-300 ease-out"
                    initial={{ width: '5%' }}
                    animate={{ width: `${currentPercent}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  />
                </div>
              </div>

              {/* Real-time Status Card */}
              <div className="p-4 rounded-2xl bg-[#0d1117]/90 border border-white/10 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>{progress?.message || 'Processing WhatsApp Dispatch...'}</span>
                  </h4>
                  {progress?.estimatedRemainingSec !== undefined && progress.estimatedRemainingSec > 0 && (
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      ≈ {progress.estimatedRemainingSec}s remaining
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {progress?.friendlyStatus || progress?.description || 'Connecting to Meta Cloud API...'}
                </p>
              </div>

              {/* Live Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" />
                    <span>Recipient</span>
                  </span>
                  <p className="text-xs font-extrabold text-white truncate">{recipientName || 'Contact'}</p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" />
                    <span>Materials</span>
                  </span>
                  <p className="text-xs font-extrabold text-white">{totalMaterials}</p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Completed</span>
                  </span>
                  <p className="text-xs font-extrabold text-emerald-400 font-mono">
                    {displayCompletedCount} / {totalMaterials}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>Current</span>
                  </span>
                  <p className="text-xs font-extrabold text-white truncate" title={currentMaterialTitle}>
                    {currentMaterialTitle}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
