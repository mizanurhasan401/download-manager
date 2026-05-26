'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { fileConverterService } from '@/services/file-converter/file-converter.service';
import type { ConversionProgressEvent } from '@/types/file-converter';

interface ProgressStreamState {
  event: ConversionProgressEvent | null;
  isConnected: boolean;
  isComplete: boolean;
}

const INITIAL_STATE: ProgressStreamState = {
  event: null,
  isConnected: false,
  isComplete: false,
};

/**
 * Subscribe to the file-converter SSE progress endpoint for a single job.
 *
 * State is keyed by `jobId` so switching jobs (or clearing it) automatically
 * exposes a clean `INITIAL_STATE` through derived selection — avoiding the
 * useEffect-driven state reset anti-pattern flagged by react-hooks lint.
 *
 * On terminal events (`COMPLETED`/`FAILED`) the EventSource is closed and the
 * cached job record is invalidated so consumers re-fetch the final
 * representation (with output file metadata) via `useConversionJob`.
 */
export function useConversionProgressStream(
  jobId?: string | null,
): ProgressStreamState {
  const queryClient = useQueryClient();
  const [statesByJob, setStatesByJob] = useState<
    Record<string, ProgressStreamState>
  >({});

  useEffect(() => {
    if (!jobId) return;

    const url = fileConverterService.buildProgressStreamUrl(jobId);
    const source = new EventSource(url);

    source.onopen = () =>
      setStatesByJob((prev) => ({
        ...prev,
        [jobId]: { ...(prev[jobId] ?? INITIAL_STATE), isConnected: true },
      }));

    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as ConversionProgressEvent;
        const finalized =
          parsed.status === 'COMPLETED' || parsed.status === 'FAILED';

        setStatesByJob((prev) => {
          const current = prev[jobId] ?? INITIAL_STATE;
          return {
            ...prev,
            [jobId]: {
              ...current,
              event: parsed,
              isComplete: finalized || current.isComplete,
            },
          };
        });

        if (finalized) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.fileConversionJob(jobId),
          });
          source.close();
        }
      } catch {
        // Ignore malformed events — the polling fallback will reconcile state
        // from the database.
      }
    };

    source.onerror = () =>
      setStatesByJob((prev) => ({
        ...prev,
        [jobId]: { ...(prev[jobId] ?? INITIAL_STATE), isConnected: false },
      }));

    return () => {
      source.close();
    };
  }, [jobId, queryClient]);

  return jobId ? (statesByJob[jobId] ?? INITIAL_STATE) : INITIAL_STATE;
}
