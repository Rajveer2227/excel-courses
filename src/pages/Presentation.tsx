import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
const slides = [
    {
        id: 'intro',
        title: 'Transform Your Career',
        subtitle: '25+ Years of Excellence in IT Training',
        content: 'Join 1,00,000+ students who have trusted Excel Computers to build their careers.',
        color: 'from-blue-600 to-indigo-600',
        image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 'python',
        title: 'Full Stack Python',
        subtitle: 'From Beginner to Pro',
        content: 'Master Python, Django, React, and build live projects. Includes a 1-Month Internship.',
        color: 'from-blue-500 to-cyan-500',
        image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?q=80&w=2014&auto=format&fit=crop',
    },
    {
        id: 'data',
        title: 'Data Analytics',
        subtitle: 'Unlock Insights',
        content: 'Learn Python, SQL, PowerBI, and Tableau. Guaranteed placement assistance.',
        color: 'from-purple-500 to-indigo-500',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 'internship',
        title: 'Real-World Experience',
        subtitle: 'In-house Software Company',
        content: 'Get hands-on experience working on live client projects. Stand out to employers.',
        color: 'from-rose-500 to-red-500',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    }
];

export default function Presentation() {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000); // 5 seconds per slide

        return () => clearInterval(timer);
    }, [isPlaying]);

    const slide = slides[currentSlide];

    const handleNext = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsPlaying(false);
    };

    const handlePrev = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setIsPlaying(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-hidden flex flex-col">
            {/* Background Image with Overlay */}
            <AnimatePresence mode="sync">
                <motion.div
                    key={slide.image}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 0.4, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${slide.image})` }}
                />
            </AnimatePresence>

            <div className={cn("absolute inset-0 opacity-80 mix-blend-multiply bg-gradient-to-br transition-colors duration-1000", slide.color)} />

            {/* Top Bar Controls */}
            <div className="relative z-10 p-6 flex justify-between items-center">
                <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 pl-0.5" />}
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mx-8 flex-1 max-w-xl">
                    {slides.map((_, idx) => (
                        <div key={idx} className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={false}
                                animate={{
                                    width: idx === currentSlide ? (isPlaying ? '100%' : '100%') : (idx < currentSlide ? '100%' : '0%')
                                }}
                                transition={{ duration: idx === currentSlide && isPlaying ? 5 : 0.3, ease: 'linear' }}
                                className="h-full bg-white rounded-full"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors hover:rotate-90"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Slide Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className="max-w-4xl"
                    >
                        <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-bold uppercase tracking-widest border border-white/30 mb-8">
                            {slide.title}
                        </span>
                        <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
                            {slide.subtitle}
                        </h1>
                        <p className="text-2xl md:text-3xl text-white/90 font-medium leading-relaxed max-w-3xl mx-auto text-balance drop-shadow-lg">
                            {slide.content}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="relative z-10 p-8 flex justify-between items-center max-w-6xl mx-auto w-full">
                <button
                    onClick={handlePrev}
                    className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors group"
                >
                    <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                </button>

                <button className="px-10 py-5 bg-white text-slate-900 rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl">
                    Tap to Explore
                </button>

                <button
                    onClick={handleNext}
                    className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors group"
                >
                    <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

        </div>
    );
}
