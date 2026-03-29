import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';

// Placeholder Pages
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Compare from './pages/Compare';
import Presentation from './pages/Presentation';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
    </BrowserRouter>
  );
}

export default App;
