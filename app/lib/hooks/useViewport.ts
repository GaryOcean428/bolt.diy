import { useState, useEffect } from 'react';

const useViewport = (threshold = 1024) => {
  // Initialize with a safe default for SSR, then update on client
  const [isSmallViewport, setIsSmallViewport] = useState(false);

  useEffect(() => {
    // Set initial value on client mount
    const checkViewport = () => setIsSmallViewport(window.innerWidth < threshold);
    checkViewport();

    const handleResize = () => setIsSmallViewport(window.innerWidth < threshold);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [threshold]);

  return isSmallViewport;
};

export default useViewport;
