import { useCallback, useEffect, useRef, useState } from 'react';

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    const scheduleFrame =
      typeof globalThis.requestAnimationFrame === 'function'
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : (callback: () => void) => setTimeout(callback, 0);
    scheduleFrame(() => resolve());
  });
}

export function useLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runWithLoading = useCallback(async <T>(task: () => Promise<T>) => {
    if (mountedRef.current) {
      setIsLoading(true);
    }

    await waitForNextFrame();

    try {
      return await task();
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return {
    isLoading,
    runWithLoading,
  };
}
