import { useEffect, useRef, useCallback } from 'react';

export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const argsRef = useRef<A | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function cleanup() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }

  useEffect(() => cleanup, []); // Cleanup on unmount

  const debouncedCallback = useCallback((...args: A) => {
    argsRef.current = args;
    cleanup();
    timeoutRef.current = setTimeout(() => {
      if (argsRef.current) {
        callback(...argsRef.current);
      }
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
} 