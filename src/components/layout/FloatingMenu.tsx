import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, Layers, Play, Share2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/courses', icon: BookOpen, label: 'Courses' },
    { path: '/compare', icon: Layers, label: 'Compare' },
    { path: '/presentation', icon: Play, label: 'Auto' },
    { path: '/share', icon: Share2, label: 'Share' },
];

export default function FloatingMenu() {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Handle scroll effect for mobile bottom bar
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Prevent body scrolling when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100%';
            document.documentElement.style.overflow = 'hidden';
            document.documentElement.style.height = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
        };
    }, [isMenuOpen]);

    // Hide floating menu on presentation screens
    if (location.pathname.includes('/presentation') || location.pathname.includes('/slide')) {
        return null;
    }

    return (
        <>
            {/* Desktop & Tablet Side Navigation */}
            <motion.nav
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                // Tablet (md/lg): left-3 / left-4 top-20 / top-32 prevents overlapping content.
                // Desktop (xl): inset-y-0 my-auto restores perfect vertical centering.
                className="hidden md:flex flex-col items-center justify-center fixed left-3 md:left-4 top-20 md:top-24 lg:top-32 xl:top-0 xl:bottom-0 xl:my-auto h-fit z-50 py-6 md:py-8 px-3 md:px-4 rounded-[2.5rem] glass backdrop-blur-2xl border border-white/20 shadow-2xl"
            >
                <div className="flex flex-col gap-6 md:gap-8">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path));

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "relative group p-3 md:p-4 rounded-3xl transition-all duration-300 flex items-center justify-center",
                                    isActive ? "shadow-lg shadow-primary/40" : "text-slate-600 hover:text-primary hover:bg-primary/5"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill-desktop"
                                        className="absolute inset-0 bg-primary rounded-3xl"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon className={cn("w-6 h-6 md:w-7 md:h-7 relative z-10", isActive ? "text-white" : "")} strokeWidth={2.5} />
                                {/* Tooltip */}
                                <span className="absolute left-full ml-6 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-2xl">
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </div>
            </motion.nav>

            {/* Mobile hamburger — only below md (768px) */}
            <div className="md:hidden">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={cn(
                        "fixed right-4 md:right-8 z-[60] p-3 rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300 text-white", 
                        isScrolled ? "top-4 md:top-8 bg-slate-900/95 border-slate-700" : "top-6 md:top-8 bg-slate-900/90 border-slate-700"
                    )}
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="fixed inset-0 z-[55] bg-[#0d1117]/95 backdrop-blur-xl flex flex-col items-center justify-center"
                        >
                            <div className="flex flex-col gap-4 w-full px-8 max-w-sm">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path ||
                                        (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-300",
                                                isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-300 hover:bg-white/10"
                                            )}
                                        >
                                            <Icon className="w-6 h-6" />
                                            {item.label}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
