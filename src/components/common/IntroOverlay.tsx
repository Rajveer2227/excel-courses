import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface IntroOverlayProps {
    onComplete: () => void;
}

const IntroOverlay = ({ onComplete }: IntroOverlayProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Total duration: ~1.4 - 1.6s
        // 0s: Excel appears
        // 0.45s: Courses appears
        // 1.2s: Start fading out
        // 1.5s: Complete
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 1200);

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 1600); // 1.2s start + 0.4s fade-out = 1.6s total

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0d1117] text-white"
                >
                    <div className="text-center space-y-2">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                                duration: 0.6, 
                                ease: [0.22, 1, 0.36, 1] 
                            }}
                            className="text-4xl md:text-6xl font-black tracking-[0.05em]"
                        >
                            <span className="text-[#2384C6]">Excel</span>{" "}
                            <span className="text-[#D94444]">Computers</span>
                        </motion.h1>

                        {/* Line 2: COURSES */}
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                                delay: 0.45, 
                                duration: 0.6, 
                                ease: [0.22, 1, 0.36, 1] 
                            }}
                            className="text-2xl md:text-4xl font-black tracking-[0.3em] uppercase text-blue-500"
                        >
                            Courses
                        </motion.h2>

                        {/* Subtle glow / pulse pulse */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.2, 0] }}
                            transition={{ 
                                delay: 0.6, 
                                duration: 2, 
                                repeat: Infinity 
                            }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default IntroOverlay;
