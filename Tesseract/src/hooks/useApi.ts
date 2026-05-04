"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toApiError, type ApiError } from "@/lib/api/client";

interface ApiHookState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  setData: (d: T | null) => void;
  lastLoadedAt: number | null;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): ApiHookState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const alive = useRef(true);
  const hasData = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetcher = useCallback(fetcher, deps);

  const run = useCallback(async (isManualRefetch = false) => {
    if (isManualRefetch && hasData.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await stableFetcher();
      if (alive.current) {
        hasData.current = true;
        setData(res);
        setLastLoadedAt(Date.now());
      }
    } catch (e) {
      if (alive.current) setError(toApiError(e));
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [stableFetcher]);

  // Reset hasData when the fetcher's deps change so a new dep-driven
  // fetch correctly shows the loading spinner instead of the refreshing one.
  useEffect(() => {
    hasData.current = false;
  }, [stableFetcher]);

  useEffect(() => {
    alive.current = true;
    run(false);
    return () => {
      alive.current = false;
    };
  }, [run]);

  const refetch = useCallback(async () => run(true), [run]);

  return { data, loading, refreshing, error, refetch, setData, lastLoadedAt };
}

export function useAsyncAction<TArgs extends unknown[], TRet>(
  action: (...args: TArgs) => Promise<TRet>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const res = await action(...args);
        return res;
      } catch (e) {
        const err = toApiError(e);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [action],
  );

  return { run, loading, error };
}
