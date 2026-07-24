import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface IntroOverlayProps {
    onComplete: () => void;
}

const IntroOverlay = ({ onComplete }: IntroOverlayProps) => {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Animate progress percentage from 0 to 100
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 5;
            });
        }, 50);

        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 1350);

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 1750);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0d1117] text-white overflow-hidden select-none"
                >
                    {/* Hardware-accelerated background lighting orbs */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.15, 0.3, 0.15]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[#2384C6]/20 blur-[130px]"
                        />
                        <motion.div
                            animate={{
                                scale: [1.2, 1, 1.2],
                                opacity: [0.15, 0.3, 0.15]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-[#D94444]/20 blur-[130px]"
                        />
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center space-y-6 max-w-md px-6 text-center">
                        {/* 3D EC Logo Badge with Conic Neon Border */}
                        <motion.div
                            initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 350, damping: 22 }}
                            className="relative group cursor-pointer"
                        >
                            {/* Rotating Conic Neon Halo Ring */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-1 rounded-[2.2rem] bg-[conic-gradient(from_0deg,#2384C6,#a855f7,#D94444,#2384C6)] opacity-80 blur-sm"
                            />

                            {/* Inner Glass Badge Container */}
                            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-[2rem] bg-[#0d1117] border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-xl overflow-hidden">
                                {/* Subtle inner shimmer */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 transform -translate-x-full animate-[shimmer_2s_infinite]" />
                                
                                <span className="font-black text-4xl md:text-5xl tracking-tighter flex items-center drop-shadow-2xl">
                                    <span className="text-[#2384C6]">E</span>
                                    <span className="text-[#D94444]">C</span>
                                </span>
                            </div>

                            {/* Sparkle Floating Indicator */}
                            <motion.div
                                animate={{ y: [-2, 2, -2] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 border border-emerald-300"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                            </motion.div>
                        </motion.div>

                        {/* Title & Branding */}
                        <div className="space-y-1.5">
                            <motion.h1
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="text-3xl md:text-5xl font-black tracking-[0.18em] uppercase flex items-center justify-center gap-2"
                            >
                                <span className="text-[#2384C6]">Excel</span>
                                <span className="text-[#D94444]">Computers</span>
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.5 }}
                                className="flex items-center justify-center gap-2"
                            >
                                <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] shadow-sm">
                                    Courses & Material System
                                </span>
                            </motion.div>
                        </div>

                        {/* Progress Bar & Status */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, duration: 0.5 }}
                            className="w-full max-w-xs space-y-2 pt-2"
                        >
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10 shadow-inner">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-[#2384C6] via-purple-500 to-[#D94444] shadow-md shadow-blue-500/50"
                                    style={{ width: `${progress}%` }}
                                    transition={{ duration: 0.1, ease: "easeOut" }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                <span className="flex items-center gap-1 text-slate-300">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                    <span>PWA Engine Active</span>
                                </span>
                                <span className="font-mono text-emerald-400">{progress}%</span>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default IntroOverlay;
