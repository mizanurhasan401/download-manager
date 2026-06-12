export type YtDlpErrorCode =
  | 'YOUTUBE_BOT_CHECK'
  | 'PRIVATE_VIDEO'
  | 'VIDEO_UNAVAILABLE'
  | 'AGE_RESTRICTED'
  | 'UNKNOWN';

const ERROR_MESSAGES: Record<YtDlpErrorCode, string> = {
  YOUTUBE_BOT_CHECK:
    'YouTube blocked this request. The server needs YouTube login cookies configured by an administrator.',
  PRIVATE_VIDEO: 'This video is private.',
  VIDEO_UNAVAILABLE: 'This video is unavailable or has been removed.',
  AGE_RESTRICTED:
    'This video is age-restricted. The server may need YouTube login cookies.',
  UNKNOWN: 'Could not fetch video information.',
};

const ERROR_PATTERNS: Array<{ pattern: RegExp; code: YtDlpErrorCode }> = [
  {
    pattern: /Sign in to confirm you're not a bot|login cookies/i,
    code: 'YOUTUBE_BOT_CHECK',
  },
  { pattern: /Private video/i, code: 'PRIVATE_VIDEO' },
  { pattern: /Video unavailable/i, code: 'VIDEO_UNAVAILABLE' },
  {
    pattern: /age-restricted|confirm your age/i,
    code: 'AGE_RESTRICTED',
  },
];

export function getYtDlpErrorMessage(message?: string | null): string {
  if (!message?.trim()) {
    return ERROR_MESSAGES.UNKNOWN;
  }

  for (const { pattern, code } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return ERROR_MESSAGES[code];
    }
  }

  return message.length > 200 ? `${message.slice(0, 199)}…` : message;
}
