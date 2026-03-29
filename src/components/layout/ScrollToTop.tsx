import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Force immediate scroll to top before any rendering/layout occurs
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
