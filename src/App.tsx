import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';

// Lazy load page components for performance optimization
const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Presentation = lazy(() => import('./pages/Presentation'));

// Simple, minimal centered loading fallback
const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-bold tracking-widest uppercase animate-pulse">Loading...</p>
        </div>
    </div>
);

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:id" element={<CourseDetail />} />
            <Route path="compare" element={<Compare />} />
          </Route>
          {/* Presentation mode typically doesn't need the floating menu, so it's outside the standard layout or handled inside Layout */}
          <Route path="/presentation" element={<Presentation />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
