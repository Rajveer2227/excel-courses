import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Cpu } from 'lucide-react';

interface IntroOverlayProps {
    onComplete: () => void;
}

const IntroOverlay = ({ onComplete }: IntroOverlayProps) => {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Smooth progressive loading animation over ~2.2 seconds
        const startTime = Date.now();
        const totalDuration = 2200; // 2.2 seconds for 0 -> 100%

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const currentProgress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
            setProgress(currentProgress);

            if (currentProgress >= 100) {
                clearInterval(interval);
            }
        }, 30);

        // Fade out overlay after 2.5s, complete after 2.9s
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2500);

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 2950);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    // Dynamic status text based on load progress
    const getStatusText = () => {
        if (progress < 25) return 'Initializing PWA Engine...';
        if (progress < 55) return 'Loading Course Catalog & Materials...';
        if (progress < 85) return 'Syncing Meta Cloud & Storage Gateway...';
        return 'Welcome to Excel Computers ✨';
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0b0e14] text-white overflow-hidden select-none"
                >
                    {/* Hardware-accelerated ambient glow orbs */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div
                            animate={{
                                scale: [1, 1.25, 1],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#2384C6]/25 blur-[140px]"
                        />
                        <motion.div
                            animate={{
                                scale: [1.25, 1, 1.25],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-[#D94444]/25 blur-[140px]"
                        />
                        {/* Center radial glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center space-y-7 max-w-md px-6 text-center">
                        {/* 3D EC Logo Badge with Conic Neon Halo & Pulse Ring */}
                        <motion.div
                            initial={{ scale: 0.4, rotate: -15, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 280, damping: 20 }}
                            className="relative group cursor-pointer"
                        >
                            {/* Rotating Conic Neon Halo Ring */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-1.5 rounded-[2.5rem] bg-[conic-gradient(from_0deg,#2384C6,#a855f7,#D94444,#2384C6)] opacity-85 blur-sm"
                            />

                            {/* Inner Glass Badge Container */}
                            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-[2.2rem] bg-[#0b0e14]/90 border border-white/25 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden">
                                {/* Subtle inner metallic shimmer */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0 transform -translate-x-full animate-[shimmer_2.5s_infinite]" />
                                
                                <span className="font-black text-5xl md:text-6xl tracking-tighter flex items-center drop-shadow-2xl select-none">
                                    <span className="text-[#2384C6] drop-shadow-[0_0_15px_rgba(35,132,198,0.5)]">E</span>
                                    <span className="text-[#D94444] drop-shadow-[0_0_15px_rgba(217,68,68,0.5)]">C</span>
                                </span>
                            </div>

                            {/* Sparkle Floating Indicator Badge */}
                            <motion.div
                                animate={{ y: [-3, 3, -3], scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-2.5 -right-2.5 p-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/50 border border-white/40"
                            >
                                <Sparkles className="w-4 h-4" />
                            </motion.div>
                        </motion.div>

                        {/* Title & Branding */}
                        <div className="space-y-2">
                            <motion.h1
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="text-3xl md:text-5xl font-black tracking-[0.18em] uppercase flex items-center justify-center gap-2 drop-shadow-lg"
                            >
                                <span className="text-[#2384C6]">Excel</span>
                                <span className="text-[#D94444]">Computers</span>
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.6 }}
                                className="flex items-center justify-center gap-2"
                            >
                                <span className="px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] shadow-md backdrop-blur-md">
                                    Courses & Material System
                                </span>
                            </motion.div>
                        </div>

                        {/* Dynamic Progress Bar & Phase Status */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, duration: 0.6 }}
                            className="w-full max-w-xs space-y-2.5 pt-2"
                        >
                            {/* Glowing Progress Bar */}
                            <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/15 shadow-inner">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-[#2384C6] via-purple-500 to-[#D94444] shadow-[0_0_12px_rgba(35,132,198,0.8)]"
                                    style={{ width: `${progress}%` }}
                                    transition={{ duration: 0.1, ease: "easeOut" }}
                                />
                            </div>

                            {/* Phase Status Text */}
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                <span className="flex items-center gap-1.5 text-slate-300 truncate pr-2">
                                    <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
                                    <span className="truncate">{getStatusText()}</span>
                                </span>
                                <span className="font-mono text-emerald-400 font-extrabold shrink-0">{progress}%</span>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default IntroOverlay;
