import { useEffect } from 'react';

export function useWindowResize(
  resizeHandler: (width: number, height: number) => void
) {
  useEffect(() => {
    function handleResize() {
      resizeHandler(window.innerWidth, window.innerHeight);
    }

    // Calling once before resize
    resizeHandler(window.innerWidth, window.innerHeight);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeHandler]);
}
