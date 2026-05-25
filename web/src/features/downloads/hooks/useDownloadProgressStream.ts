'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getDownloadProgressStreamUrl } from '@/lib/utils';
import type { DownloadProgressEvent } from '@/types/api';

interface ProgressStreamState {
  event: DownloadProgressEvent | null;
  isConnected: boolean;
  isComplete: boolean;
}

const EMPTY_STATE: ProgressStreamState = {
  event: null,
  isConnected: false,
  isComplete: false,
};

export function useDownloadProgressStream(
  jobId?: string | null,
): ProgressStreamState {
  const [state, setState] = useState<ProgressStreamState>(EMPTY_STATE);
  const [trackedJobId, setTrackedJobId] = useState<string | null | undefined>(jobId);
  const queryClient = useQueryClient();

  if (trackedJobId !== jobId) {
    setTrackedJobId(jobId);
    setState(EMPTY_STATE);
  }

  useEffect(() => {
    if (!jobId) return;

    const url = getDownloadProgressStreamUrl(jobId);
    const source = new EventSource(url);

    source.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as DownloadProgressEvent;
        const finalized =
          parsed.status === 'completed' || parsed.status === 'failed';

        setState((prev) => ({
          ...prev,
          event: parsed,
          isComplete: finalized || prev.isComplete,
        }));

        if (finalized) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.downloadStatus(jobId),
          });
          source.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    return () => {
      source.close();
    };
  }, [jobId, queryClient]);

  return state;
}
