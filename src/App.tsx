import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';
import IntroOverlay from './components/common/IntroOverlay';
import { AnimatePresence } from 'framer-motion';

// Lazy load page components for performance optimization (Home, Courses, Compare, Presentation, Share)
const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Presentation = lazy(() => import('./pages/Presentation'));
const Share = lazy(() => import('./pages/Share'));

// Minimal suspense fallback (IntroOverlay handles initial app loading)
const LoadingFallback = () => null;

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
      
      <AnimatePresence>
        {showIntro && (
          <IntroOverlay key="intro" onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>

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
    </BrowserRouter>
  );
}

export default App;
