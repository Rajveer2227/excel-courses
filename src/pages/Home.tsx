import { motion } from 'framer-motion';
import { ChevronRight, Award, Star, Users, Instagram, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const stats = [
    { icon: Users, label: 'Students Trained', value: '1,00,000+' },
    { icon: Star, label: 'Rating on Google', value: '4.9', suffix: '⭐' },
    { icon: Award, label: 'Years Experience', value: '25+' },
];

export default function Home() {
    return (
        <div className="h-[100dvh] relative bg-[#0d1117] flex flex-col overflow-hidden">
            {/* Background depth layers - matching Courses page */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(37,99,235,0.15),transparent_50%)] pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(124,58,237,0.1),transparent_50%)] pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 px-4 md:px-12 lg:pl-44 lg:pr-12 pt-4">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        boxShadow: [
                            '0 0 0px rgba(255,255,255,0)',
                            '0 0 20px rgba(255,255,255,0.6)',
                            '0 0 0px rgba(255,255,255,0)',
                        ],
                    }}
                    transition={{
                        opacity: { duration: 0.5 },
                        scale: { duration: 0.5 },
                        boxShadow: {
                            duration: 2.5,
                            repeat: Infinity,
                            repeatType: 'loop',
                            ease: 'easeInOut',
                        },
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-4"
                >
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-sm font-semibold text-slate-200 tracking-wide uppercase">#1 Computer Institute in Kolhapur</span>
                </motion.div>

                {/* Hero Content */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="max-w-5xl mx-auto"
                >
                    <h1 className="text-4xl md:text-5xl lg:text-5xl font-black text-white mb-2 lg:mb-2 leading-tight flex flex-col items-center">
                        <span>Build Your Career with</span>
                        <span className="whitespace-nowrap mt-1">
                            <span className="text-[#2281c3]">Excel</span> <span className="text-[#d74345]">Computers 🚀</span>
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-xl text-slate-300 mb-4 font-medium max-w-3xl mx-auto px-4">
                        25+ Years of Excellence in IT Training. Transform your career with industry-oriented courses.
                    </p>

                    <div className="flex justify-center">
                        <Link to="/courses">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="group relative px-10 py-5 bg-primary text-white rounded-2xl font-bold text-xl shadow-2xl shadow-primary/30 overflow-hidden flex items-center justify-center gap-3 w-full sm:w-auto"
                            >
                                <span className="relative z-10">Explore Courses</span>
                                <ChevronRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Stats Section - Fixed at bottom */}
            <div className="container mx-auto px-6 md:px-12 lg:pl-44 lg:pr-12 relative z-10 pb-6 lg:pb-8 max-w-5xl shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                                whileHover={{ y: -5 }}
                                className="bg-white/8 backdrop-blur-md border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-4 flex flex-col items-center justify-center text-center group transition-all"
                            >
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-primary/30">
                                    <Icon className="w-6 h-6 md:w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-1 flex items-center gap-1">
                                    {stat.value}
                                    {stat.suffix && <span className="text-lg md:text-xl">{stat.suffix}</span>}
                                </h3>
                                <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    {stat.label}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Social & Web Links (Below Cards) */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-slate-500"
                >
                    <a href="https://instagram.com/excelcomputerskolhapur" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-500 transition-colors group">
                        <Instagram className="w-4 h-4" />
                        <span className="text-xs font-bold tracking-wide">excelcomputerskolhapur</span>
                    </a>
                    
                    <span className="hidden sm:inline-block font-black opacity-50">-</span>

                    <a href="https://excelcomputers.info" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors group">
                        <Globe className="w-4 h-4" />
                        <span className="text-xs font-bold tracking-wide">excelcomputers.info</span>
                    </a>
                </motion.div>
            </div>
        </div>
    );
}

