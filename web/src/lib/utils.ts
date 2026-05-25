import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getDownloadFileUrl(jobId: string, inline = false): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  const query = inline ? '?inline=true' : '';
  return `${base}/downloads/file/${jobId}${query}`;
}

export function getDownloadPreviewUrl(jobId: string): string {
  return getDownloadFileUrl(jobId, true);
}

export function getDownloadProgressStreamUrl(jobId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  return `${base}/downloads/progress/${jobId}`;
}

export function formatBytesPerSec(bytesPerSec?: number | null): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '—';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '—';
  if (seconds === 0) return 'done';
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;

  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
