import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft, Clock, IndianRupee,
    CheckCircle2, Users, ArrowRight,
    Target, Rocket, GraduationCap, Briefcase,
    Award, Zap, Terminal, BookOpen, Code2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { courses } from '../data/courses';
import type { Course } from '../data/courses';

export default function CourseDetail() {
    const { id } = useParams();
    const course = courses.find((c) => c.id === id) as Course | undefined;

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-slate-800">Course not found</h2>
                    <Link to="/courses" className="text-primary hover:underline font-bold">Return to Courses</Link>
                </div>
            </div>
        );
    }

    // Default Fallbacks
    const titleHook = 'titleHook' in course ? course.titleHook : `Master ${course.title} 🚀`;
    const tagline = 'tagline' in course ? course.tagline : "Build industry-ready skills and start your professional journey today.";
    const overview = 'overview' in course ? course.overview : "Learn from scratch with our comprehensive, practical-first training approach designed for modern industry requirements.";
    const highlights = 'highlightFeatures' in course ? (course.highlightFeatures as string[]) : ["Certificate Included 🎓", "Weekly Tests 📝", "Practical Training 💻"];
    const benefits = 'benefits' in course ? (course.benefits as string[]) : [];
    const whoShouldJoin = 'whoShouldJoin' in course ? (course.whoShouldJoin as string[]) : [];
    const careerOutcomes = 'careerOutcomes' in course ? (course.careerOutcomes as string[]) : [];

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* 2. HERO SECTION (HOOK) */}
            <div className={cn("pt-20 pb-24 relative overflow-hidden bg-gradient-to-br", course.color)}>
                {/* Background depth layers */}
                <div className="absolute inset-0 bg-black/25 mix-blend-overlay" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
                {/* Decorative glow orb */}
                <div className="absolute top-10 right-[20%] w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

                <div className="mx-auto w-full max-w-4xl px-6 relative z-10 text-center">
                    {/* Back button — premium pill style */}
                    <div className="flex justify-center mb-8">
                        <Link to="/courses" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 px-5 py-2.5 rounded-full transition-all group shadow-lg shadow-black/20">
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-extrabold uppercase tracking-[0.15em] text-[10px]">Back to Courses</span>
                        </Link>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        {/* Feature Pills — colorful & premium */}
                        <div className="flex flex-wrap justify-center gap-3 mb-10">
                            {highlights.map((feature, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        boxShadow: [
                                            '0 0 0px rgba(255,255,255,0)',
                                            '0 0 25px rgba(255,255,255,0.7)',
                                            '0 0 0px rgba(255,255,255,0)',
                                        ],
                                        scale: [1, 1.04, 1]
                                    }}
                                    transition={{
                                        opacity: { duration: 0.4, delay: i * 0.1 },
                                        y: { duration: 0.4, delay: i * 0.1 },
                                        boxShadow: {
                                            duration: 2,
                                            delay: i * 0.4,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        },
                                        scale: {
                                            duration: 2,
                                            delay: i * 0.4,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/95 text-slate-800 shadow-2xl shadow-black/20 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap border border-white/60 backdrop-blur-sm"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    {feature}
                                </motion.span>
                            ))}
                        </div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg"
                        >
                            {/* Title text — strip all emojis */}
                            {(titleHook ?? '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1FFFF}]/gu, '').trim()}
                        </motion.h1>
                        {/* Fixed ⚡ emoji — same for all courses */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                            className="text-5xl md:text-6xl mt-3 mb-5 select-none"
                        >
                            ⚡
                        </motion.div>

                        {/* Shimmer divider */}
                        <div className="flex justify-center mb-5">
                            <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                        </div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-xl text-white/90 font-medium max-w-2xl leading-relaxed mx-auto"
                        >
                            {tagline}
                        </motion.p>
                    </div>
                </div>
            </div>


            {/* 1. TOP STRIP (STATIC OVERLAP) */}
            <div className="w-full relative -mt-16 container mx-auto px-6 z-10">
                <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 flex flex-wrap md:flex-nowrap items-center justify-between py-6 md:py-5 rounded-[2rem] bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 gap-y-6">
                    <div className="w-1/2 md:flex-1 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Duration</p>
                            <p className="text-lg font-black text-white uppercase">{course.duration}</p>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-8 bg-white/10 shrink-0" />

                    <div className="w-1/2 md:flex-1 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <IndianRupee className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Fees</p>
                            <p className="text-lg font-black text-white uppercase">{course.fees}</p>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-8 bg-white/10 shrink-0" />

                    <div className="w-full md:flex-1 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Mode</p>
                            <p className="text-lg font-black text-white uppercase">Offline / Online</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[1600px] mx-auto px-6 mt-12">
                <div className="flex flex-col lg:flex-row items-start justify-center gap-12 lg:gap-20">
                    
                    {/* LEFT SPACER (Slight offset from nav menu, content expands left) */}
                    <div className="hidden lg:block w-full lg:w-[80px] shrink-0" />

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 min-w-0 space-y-16">
                        
                        {/* 3. COURSE OVERVIEW */}
                        <section>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                                <Rocket className="w-3.5 h-3.5" /> Course Overview
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-6">Master the Fundamentals</h2>
                            <p className="text-lg md:text-xl text-slate-600 leading-[1.6] font-medium max-w-4xl">
                                {overview}
                            </p>
                        </section>

                        {/* 4. WHY THIS COURSE (BENEFITS) */}
                        <section>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-10">Why Choose This Course?</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {benefits.map((benefit, i) => (
                                    <motion.div 
                                        key={i}
                                        whileHover={{ y: -5 }}
                                        className="p-4 bg-white border border-slate-100 rounded-xl flex items-center gap-3 group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 group-hover:text-inherit" />
                                        </div>
                                        <span className="font-bold text-slate-700 text-base md:text-lg">{benefit}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                        {/* 5. WHO SHOULD JOIN */}
                        <section className="bg-slate-50 rounded-[2rem] p-8 md:p-12 border border-slate-100">
                             <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-lg text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                    <Users className="w-3.5 h-3.5" /> Target Audience
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-8">Is This For You?</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {whoShouldJoin.map((who, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-1">
                                                <Target className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <p className="font-bold text-slate-700 leading-snug text-base md:text-lg">{who}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </section>

                        {/* 6. CAREER PATH */}
                        <section>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-8">What Can You Do After This Course?</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {careerOutcomes.map((outcome, i) => (
                                    <motion.div 
                                        key={i}
                                        whileHover={{ x: 10 }}
                                        className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between group cursor-default"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                                                <Briefcase className="w-4 h-4 text-amber-400" />
                                            </div>
                                            <span className="text-base md:text-lg font-bold">{outcome}</span>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Quick Decision Panel */}
                    <div className="w-full lg:w-[400px] lg:sticky lg:top-32 h-fit shrink-0">
                        <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                                <Zap className="w-3.5 h-3.5" /> Quick Decision Panel
                            </div>
                            
                            <h4 className="text-2xl font-black text-slate-800 mb-8 leading-tight">Key Value Points</h4>

                            <div className="space-y-6">
                                {course.hasInternship && (
                                    <div className="flex gap-4 group">
                                        <motion.div
                                            animate={{
                                                boxShadow: [
                                                    '0 0 0px rgba(244, 63, 94, 0)',
                                                    '0 0 15px rgba(244, 63, 94, 0.4)',
                                                    '0 0 0px rgba(244, 63, 94, 0)',
                                                ],
                                                scale: [1, 1.05, 1]
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200"
                                        >
                                            <Award className="w-5 h-5 text-rose-500" />
                                        </motion.div>
                                        <p className="text-base font-black text-rose-600 leading-tight pt-1">Includes 1-Month Internship</p>
                                    </div>
                                )}

                                <div className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <Award className="w-5 h-5 text-emerald-500 group-hover:text-inherit" />
                                    </div>
                                    <p className="text-base font-bold text-slate-700 leading-tight pt-1">Certificate Included</p>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Terminal className="w-5 h-5 text-blue-500 group-hover:text-inherit" />
                                    </div>
                                    <p className="text-base font-bold text-slate-700 leading-tight pt-1">100% Practical Training</p>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <Users className="w-5 h-5 text-purple-500 group-hover:text-inherit" />
                                    </div>
                                    <p className="text-base font-bold text-slate-700 leading-tight pt-1">Expert Trainers</p>
                                </div>

                                {course.category !== '🎨 Design & Creative Tools' && (
                                    <div className="flex gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                            <BookOpen className="w-5 h-5 text-amber-500 group-hover:text-inherit" />
                                        </div>
                                        <p className="text-base font-bold text-slate-700 leading-tight pt-1">Weekly MCQ Tests through our dedicated Test App</p>
                                    </div>
                                )}

                                <div className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                        <Code2 className="w-5 h-5 text-rose-500 group-hover:text-inherit" />
                                    </div>
                                    <p className="text-base font-bold text-slate-700 leading-tight pt-1">
                                        {course.category === '🎨 Design & Creative Tools' 
                                            ? "Regular Tests for practical skill development"
                                            : "Regular Coding Tests for practical skill development"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Empowering Students Since 2000</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
