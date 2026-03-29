import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, IndianRupee, Briefcase, Award, Zap,
    ChevronDown, ArrowRightLeft, CheckCircle2, XCircle,
    Rocket, Users, ArrowRight, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { courses } from '../data/courses';
import type { Course } from '../data/courses';
import { cn } from '../lib/utils';

// ─── Smart one-liner data helpers ───────────────────────────────────────────

const getDifficulty = (c: Course): string => {
    const cat = c.category.toLowerCase();
    if (cat.includes('full stack')) return 'Intermediate → Advanced';
    if (cat.includes('data') || cat.includes('ai')) return 'Intermediate';
    if (cat.includes('programming')) return 'Beginner → Intermediate';
    return 'Beginner Friendly';
};

const getBestFor = (c: Course): string => {
    if ('whoShouldJoin' in c && Array.isArray(c.whoShouldJoin) && c.whoShouldJoin.length)
        return (c.whoShouldJoin as string[])[0];
    return 'All learners';
};

const getTopCareer = (c: Course): string => {
    if ('careerOutcomes' in c && Array.isArray(c.careerOutcomes) && c.careerOutcomes.length)
        return (c.careerOutcomes as string[])[0];
    return 'Career growth';
};

const getLiveProjects = (c: Course): string => {
    const cat = c.category.toLowerCase();
    if (cat.includes('full stack') || cat.includes('data & analytics') || cat.includes('ai')) {
        return '1 Mega Project';
    }
    return '1 Mini Project';
};

// ─── Compare row config ───────────────────────────────────────────────────────
const rows = [
    {
        label: 'Duration',
        icon: Clock,
        get: (c: Course) => c.duration,
        isBoolean: false,
    },
    {
        label: 'Course Fees',
        icon: IndianRupee,
        get: (c: Course) => c.fees,
        isBoolean: false,
    },
    {
        label: 'Difficulty',
        icon: TrendingUp,
        get: getDifficulty,
        isBoolean: false,
    },
    {
        label: 'Live Projects',
        icon: Zap,
        get: getLiveProjects,
        isBoolean: false,
    },
    {
        label: '1-Month Internship',
        icon: Briefcase,
        get: (c: Course) => c.hasInternship,
        isBoolean: true,
    },
    {
        label: 'Best For',
        icon: Users,
        get: getBestFor,
        isBoolean: false,
    },
    {
        label: 'Top Career Role',
        icon: Rocket,
        get: getTopCareer,
        isBoolean: false,
    },
];

// ─── Custom styled select ────────────────────────────────────────────────────
function CourseSelect({
    value, onChange, exclude,
}: {
    value: string; onChange: (v: string) => void; exclude: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className={cn(
                    'w-full appearance-none rounded-2xl py-3 pl-4 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/40 transition-all cursor-pointer',
                    'bg-white/15 border border-white/25 text-white backdrop-blur-sm',
                )}
            >
                {courses.map(c => (
                    <option
                        key={c.id}
                        value={c.id}
                        disabled={c.id === exclude}
                        className="bg-slate-900 text-white"
                    >
                        {c.title}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Compare() {
    // Default to Full Stack Python vs Full Stack Java for best demo
    const defaultC1 = courses.find(c => c.id === 'full-stack-python')?.id || courses[0]?.id || '';
    const defaultC2 = courses.find(c => c.id === 'full-stack-java')?.id || courses[1]?.id || '';

    const [course1, setCourse1] = useState(defaultC1);
    const [course2, setCourse2] = useState(defaultC2);

    const scrollRef1 = useRef<HTMLDivElement>(null);
    const scrollRef2 = useRef<HTMLDivElement>(null);

    const syncScroll = (active: 'c1' | 'c2') => {
        const source = active === 'c1' ? scrollRef1.current : scrollRef2.current;
        const target = active === 'c1' ? scrollRef2.current : scrollRef1.current;
        if (source && target) {
            target.scrollTop = source.scrollTop;
        }
    };

    const c1 = courses.find(c => c.id === course1) as Course | undefined;
    const c2 = courses.find(c => c.id === course2) as Course | undefined;

    if (!c1 || !c2) return null;

    return (
        <div className="min-h-screen bg-[#0d1117] flex flex-col overflow-y-auto relative overflow-x-hidden">
            {/* Background depth layers */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(37,99,235,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(124,58,237,0.1),transparent_50%)]" />
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative z-10 flex flex-col h-full pt-16 pb-8 px-2 sm:px-4 md:px-8 md:pl-28 lg:pr-12 max-w-7xl mx-auto w-full">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4 shrink-0"
                >
                    <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                        Compare <span className="text-gradient">Courses</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Pick any two courses — see exactly what's different</p>
                </motion.div>

                {/* ── Two Column Layout ── */}
                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 md:gap-12 min-h-0">

                    {/* ── Course A Card ── */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col min-h-0 rounded-3xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md shadow-2xl"
                    >
                        {/* Card Header */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={course1}
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.2 }}
                                className={cn('relative p-5 bg-gradient-to-br overflow-hidden shrink-0', c1.color)}
                            >
                                <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_45%,rgba(255,255,255,0.2)_50%,transparent_55%)] animate-shimmer-slow" />
                                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                {c1.popular && (
                                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-wide border border-white/30">
                                        Popular
                                    </span>
                                )}
                                <div className="relative z-10">
                                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">{c1.category.replace(/^[^a-zA-Z]+/, '')}</p>
                                    <h2 className="text-lg lg:text-xl font-black text-white leading-tight mb-3">{c1.title}</h2>
                                    <CourseSelect value={course1} onChange={setCourse1} exclude={course2} />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Feature Rows */}
                        <div 
                            ref={scrollRef1}
                            onScroll={() => syncScroll('c1')}
                            className="flex-1 overflow-y-auto flex flex-col divide-y divide-white/5 scrollbar-hide"
                        >
                            {rows.map((row, i) => {
                                const Icon = row.icon;
                                const val = row.get(c1);
                                return (
                                    <AnimatePresence mode="wait" key={row.label}>
                                        <motion.div
                                            key={`c1-${course1}-${i}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/5 transition-colors flex-1"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                                                <Icon className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{row.label}</p>
                                                {row.isBoolean ? (
                                                    val
                                                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" />Included</span>
                                                        : <span className="flex items-center gap-1 text-slate-500 text-xs font-bold"><XCircle className="w-3.5 h-3.5" />Not Included</span>
                                                ) : (
                                                    <p className="text-white font-bold text-sm truncate">{String(val)}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                );
                            })}
                        </div>

                        {/* CTA */}
                        <div className="p-4 shrink-0 border-t border-white/5">
                            <Link to={`/courses/${c1.id}`}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={cn('w-full py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 bg-gradient-to-r', c1.color, 'shadow-lg')}
                                >
                                    Explore Full Course <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* ── VS Divider ── */}
                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                        <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"
                        >
                            <span className="text-[10px] font-black text-slate-300 tracking-widest">VS</span>
                        </motion.div>
                        <motion.button
                            whileHover={{ rotate: 180, scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => { const t = course1; setCourse1(course2); setCourse2(t); }}
                            title="Swap courses"
                            className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-300" />
                        </motion.button>
                        <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                    </div>

                    {/* ── Course B Card ── */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col min-h-0 rounded-3xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md shadow-2xl"
                    >
                        {/* Card Header */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={course2}
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.2 }}
                                className={cn('relative p-5 bg-gradient-to-br overflow-hidden shrink-0', c2.color)}
                            >
                                <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_45%,rgba(255,255,255,0.2)_50%,transparent_55%)] animate-shimmer-slow" />
                                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                {c2.popular && (
                                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-wide border border-white/30">
                                        Popular
                                    </span>
                                )}
                                <div className="relative z-10">
                                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">{c2.category.replace(/^[^a-zA-Z]+/, '')}</p>
                                    <h2 className="text-lg lg:text-xl font-black text-white leading-tight mb-3">{c2.title}</h2>
                                    <CourseSelect value={course2} onChange={setCourse2} exclude={course1} />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Feature Rows */}
                        <div 
                            ref={scrollRef2}
                            onScroll={() => syncScroll('c2')}
                            className="flex-1 overflow-y-auto flex flex-col divide-y divide-white/5 scrollbar-hide"
                        >
                            {rows.map((row, i) => {
                                const Icon = row.icon;
                                const val = row.get(c2);
                                return (
                                    <AnimatePresence mode="wait" key={row.label}>
                                        <motion.div
                                            key={`c2-${course2}-${i}`}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/5 transition-colors flex-1"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                                                <Icon className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{row.label}</p>
                                                {row.isBoolean ? (
                                                    val
                                                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" />Included</span>
                                                        : <span className="flex items-center gap-1 text-slate-500 text-xs font-bold"><XCircle className="w-3.5 h-3.5" />Not Included</span>
                                                ) : (
                                                    <p className="text-white font-bold text-sm truncate">{String(val)}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                );
                            })}
                        </div>

                        {/* CTA */}
                        <div className="p-4 shrink-0 border-t border-white/5">
                            <Link to={`/courses/${c2.id}`}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={cn('w-full py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 bg-gradient-to-r', c2.color, 'shadow-lg')}
                                >
                                    Explore Full Course <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* ── Footer ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-3 shrink-0"
                >
                    <Link to="/courses" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors">
                        <Award className="w-3.5 h-3.5" />
                        All courses include a Certificate of Completion
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
