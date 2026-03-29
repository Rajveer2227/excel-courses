import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ChevronRight, Clock, IndianRupee, Briefcase, X, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { courses, courseCategories } from '../data/courses';

export default function Courses() {
    const [activeCategory, setActiveCategory] = useState('All Courses');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCourses = courses.filter(course => {
        if (searchQuery.trim() !== '') {
            return course.title.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return activeCategory === 'All Courses' || course.category === activeCategory;
    });

    return (
        <div className="min-h-screen bg-[#0d1117] pt-24 pb-32 relative overflow-hidden">
            {/* Background depth layers */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(37,99,235,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(124,58,237,0.1),transparent_50%)]" />
            <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize:'28px 28px'}} />
            <div className="container mx-auto px-6 lg:pl-32 lg:pr-8 max-w-7xl relative z-10">

                {/* Header Section */}
                <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl lg:text-5xl font-bold text-white mb-4"
                        >
                            Explore Our <span className="text-gradient">Courses</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-slate-300 text-lg max-w-xl"
                        >
                            Industry-relevant curriculum designed to make you job-ready from <span className="whitespace-nowrap">day one.</span>
                        </motion.p>
                    </div>

                    {/* Search Box */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative w-full lg:w-[450px] group"
                    >
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-[110px] text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium backdrop-blur-sm"
                            placeholder="Search by course name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center gap-1 z-10">
                            <AnimatePresence>
                                {searchQuery && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={() => setSearchQuery('')}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors hidden sm:flex items-center justify-center"
                                        title="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                            <button className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95">
                                Search
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Categories Tab Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-3 mb-12"
                >
                    {courseCategories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                "relative px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-colors overflow-hidden group border",
                                activeCategory === cat 
                                    ? "text-white border-transparent" 
                                    : "text-slate-600 hover:text-slate-900 bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                            )}
                        >
                            {activeCategory === cat && (
                                <motion.div
                                    layoutId="activeCategory"
                                    className="absolute inset-0 bg-primary rounded-2xl shadow-lg z-0"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 block">{cat}</span>
                        </button>
                    ))}
                </motion.div>

                {/* Course Grid */}
                <div className="min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCategory + searchQuery}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className={filteredCourses.length > 0 ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "w-full"}
                        >
                            {filteredCourses.length > 0 ? (
                                filteredCourses.map((course) => {
                                    return (
                                        <div
                                            key={course.id}
                                            className="bg-white border border-slate-100 rounded-3xl overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
                                        >
                                            {/* Card Header (Gradient + Icon or Image) */}
                                            <div className={cn("h-40 relative flex items-center justify-center bg-gradient-to-br overflow-hidden", course.color)}>
                                                {'coverImage' in course && typeof course.coverImage === 'string' ? (
                                                    <img src={course.coverImage} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-black/5 mix-blend-overlay" />
                                                        {/* Animated Glass Shine Effect */}
                                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                                            <div className="absolute inset-0 w-[300%] h-full bg-[linear-gradient(115deg,transparent_45%,rgba(255,255,255,0.25)_50%,transparent_55%)] animate-shimmer-slow" />
                                                        </div>
                                                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                                        <div className="relative z-10 px-6 text-center">
                                                            <span className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter leading-[1] drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] block select-none">
                                                                {course.title}
                                                            </span>
                                                            <div className="h-1 w-8 bg-white/40 mx-auto mt-3 rounded-full" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Tags */}
                                                <div className="absolute top-4 right-4 flex gap-2 z-10">
                                                    {course.popular && (
                                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-wide border border-white/30 text-right">
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-6 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <span className="text-primary font-bold text-sm mb-3 block min-h-[1.25rem] line-clamp-1">{course.category}</span>
                                                    <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-2 min-h-[3.5rem] leading-snug">
                                                        {course.title}
                                                    </h3>

                                                    {/* USP Badge */}
                                                    <div className="mb-6 h-[28px]">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                            <Award className="w-3.5 h-3.5" /> Certificate Included
                                                        </span>
                                                    </div>

                                                    {/* Quick Info */}
                                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                                                <Clock className="w-5 h-5 text-slate-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Duration</p>
                                                                <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{course.duration}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                                                <IndianRupee className="w-5 h-5 text-slate-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Fees</p>
                                                                <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{course.fees}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Internship Badge Container */}
                                                    <div className="mb-6 h-[50px] flex flex-col justify-end">
                                                        {course.hasInternship ? (
                                                            <div className="w-full px-4 py-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center gap-3">
                                                                <Briefcase className="w-5 h-5 text-accent flex-shrink-0" />
                                                                <p className="text-xs font-bold text-accent-dark tracking-tighter uppercase line-clamp-1">
                                                                    Includes 1-Month Internship
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="h-px w-full bg-slate-100 mt-auto" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action */}
                                                <Link to={`/courses/${course.id}`} className="w-full mt-auto">
                                                    <button className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2">
                                                        View Details
                                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-20 text-center w-full">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Filter className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No courses found</h3>
                                    <p className="text-slate-500">Try adjusting your search or category filter.</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
