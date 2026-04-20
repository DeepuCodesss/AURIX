import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

interface UsePollingOptions<T> {
  enabled?: boolean;
  immediate?: boolean;
  initialData?: T;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  options: UsePollingOptions<T> = {}
) {
  const { enabled = true, immediate = true, initialData } = options;
  const fetcherRef = useRef(fetcher);
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(immediate);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetcherRef.current();
      startTransition(() => {
        setData(next);
        setError(null);
        setLastUpdated(Date.now());
      });
      return next;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (immediate) {
      void refresh();
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, immediate, intervalMs, refresh]);

  return {
    data,
    error,
    loading,
    lastUpdated,
    isPending,
    refresh,
  };
}
