/**
 * Custom hook for fetching sheet data using React Query
 * Handles caching, error handling, and loading states
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { RowData } from '@/types';
import { sheetApiService } from '@/lib/api/sheets';

export interface UseSheetDataOptions {
  enabled?: boolean;
  retry?: number | false;
  staleTime?: number;
  cacheTime?: number;
}

/**
 * Hook to fetch escalation sheet data
 */
export function useEscalationSheetData(
  options: UseSheetDataOptions = {}
): UseQueryResult<RowData[], Error> {
  return useQuery({
    queryKey: ['sheet', 'escalation'],
    queryFn: async () => {
      const data = await sheetApiService.getEscalationSheet();
      return data;
    },
    enabled: options.enabled !== false,
    retry: options.retry ?? 3,
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: options.cacheTime ?? 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch tech sheet data
 */
export function useTechSheetData(
  options: UseSheetDataOptions = {}
): UseQueryResult<RowData[], Error> {
  return useQuery({
    queryKey: ['sheet', 'tech'],
    queryFn: async () => {
      const data = await sheetApiService.getTechSheet();
      return data;
    },
    enabled: options.enabled !== false,
    retry: options.retry ?? 3,
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    gcTime: options.cacheTime ?? 10 * 60 * 1000,
  });
}

/**
 * Generic hook to fetch any sheet data
 */
export function useSheetData(
  sheetName: string,
  options: UseSheetDataOptions = {}
): UseQueryResult<RowData[], Error> {
  const { data: session, status } = useSession();
  const hasToken = !!(session as any)?.sheet_token;
  const isSessionReady = status !== 'loading';
  
  return useQuery({
    queryKey: ['sheet', sheetName],
    queryFn: async () => {
      const data = await sheetApiService.getSheetData(sheetName);
      return data;
    },
    // Only enable query if:
    // 1. Explicitly enabled (or not disabled)
    // 2. Sheet name is provided
    // 3. Session is loaded (not loading)
    // 4. User is authenticated with a token
    enabled: (options.enabled !== false) && !!sheetName && isSessionReady && status === 'authenticated' && hasToken,
    retry: options.retry ?? 3,
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    gcTime: options.cacheTime ?? 10 * 60 * 1000,
  });
}

/**
 * Hook to get sheet data with error details
 * Useful for better error handling in components
 */
export function useSheetDataWithError(
  sheetId: string,
  options: UseSheetDataOptions = {}
) {
  const query = useSheetData(sheetId, options);

  return {
    ...query,
    isEmpty: query.data && query.data.length === 0,
    hasError: query.isError,
    errorMessage: query.error?.message || 'Failed to load sheet data',
  };
}

