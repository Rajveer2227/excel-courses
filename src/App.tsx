import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';
import IntroOverlay from './components/common/IntroOverlay';
import { AnimatePresence, motion } from 'framer-motion';

// Lazy load page components for performance optimization (Home, Courses, Compare, Presentation, Share)
const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Presentation = lazy(() => import('./pages/Presentation'));
const Share = lazy(() => import('./pages/Share'));

// Seamless full-screen dark loading fallback with EC branding
const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#0d1117] fixed inset-0 z-50 select-none">
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-[#0d1117] border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden">
                <span className="font-black text-2xl tracking-tighter flex items-center">
                    <span className="text-[#2384C6]">E</span><span className="text-[#D94444]">C</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#2384C6]/30 border-t-[#2384C6] rounded-full animate-spin" />
                <p className="text-slate-400 text-xs font-black tracking-[0.2em] uppercase animate-pulse">Loading Workspace...</p>
            </div>
        </div>
    </div>
);

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Check if intro has already been seen in this session
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('hasSeenIntro');
    }
    return true;
  });

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('hasSeenIntro', 'true');
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      
      <AnimatePresence mode="wait">
        {showIntro ? (
          <IntroOverlay key="intro" onComplete={handleIntroComplete} />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="courses" element={<Courses />} />
                  <Route path="courses/:id" element={<CourseDetail />} />
                  <Route path="compare" element={<Compare />} />
                  <Route path="share" element={<Share />} />
                </Route>
                <Route path="/presentation" element={<Presentation />} />
              </Routes>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
