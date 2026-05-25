'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getDownloadPreviewUrl } from '@/lib/utils';
import type { MediaType } from '@/types/api';

interface MediaPlayerProps {
  jobId: string;
  mediaType: MediaType;
  title?: string;
  className?: string;
}

export function MediaPlayer({
  jobId,
  mediaType,
  title,
  className,
}: MediaPlayerProps) {
  const [error, setError] = useState(false);
  const src = getDownloadPreviewUrl(jobId);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Unable to play this file in the browser. Use the download button instead.
      </div>
    );
  }

  if (mediaType === 'AUDIO') {
    return (
      <audio
        controls
        preload="metadata"
        crossOrigin="anonymous"
        className={className ?? 'w-full'}
        onError={() => setError(true)}
      >
        <source src={src} />
        Your browser does not support audio playback.
      </audio>
    );
  }

  return (
    <video
      controls
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
      className={className ?? 'aspect-video w-full rounded-xl bg-black'}
      title={title}
      onError={() => setError(true)}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support video playback.
    </video>
  );
}
