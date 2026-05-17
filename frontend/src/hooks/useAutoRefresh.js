import { useEffect, useRef } from 'react';

export function useAutoRefresh(fetchFn, intervalMs = 150000) {
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  });

  useEffect(() => {
    fetchRef.current();
    const interval = setInterval(() => {
      fetchRef.current();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}