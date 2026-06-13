export type YtDlpErrorCode =
  | 'YOUTUBE_BOT_CHECK'
  | 'PRIVATE_VIDEO'
  | 'VIDEO_UNAVAILABLE'
  | 'AGE_RESTRICTED'
  | 'UNKNOWN';

export interface NormalizedYtDlpError {
  code: YtDlpErrorCode;
  message: string;
}

const MAX_MESSAGE_LENGTH = 200;

export function normalizeYtDlpError(stderr: string): NormalizedYtDlpError {
  const text = stderr.trim();

  if (/unsupported version of Python|Only Python versions 3\.10/i.test(text)) {
    return {
      code: 'UNKNOWN',
      message:
        'yt-dlp needs a standalone binary on this machine. Run `cd api && pnpm run setup:tools`, then restart the API.',
    };
  }

  if (/Sign in to confirm you're not a bot/i.test(text)) {
    return {
      code: 'YOUTUBE_BOT_CHECK',
      message:
        'YouTube requires login cookies — ask your administrator to configure cookies on the server.',
    };
  }

  if (/Private video/i.test(text)) {
    return {
      code: 'PRIVATE_VIDEO',
      message: 'This video is private.',
    };
  }

  if (/Video unavailable/i.test(text)) {
    return {
      code: 'VIDEO_UNAVAILABLE',
      message: 'This video is unavailable or has been removed.',
    };
  }

  if (/age-restricted|Sign in to confirm your age/i.test(text)) {
    return {
      code: 'AGE_RESTRICTED',
      message:
        'This video is age-restricted — login cookies may be required on the server.',
    };
  }

  return {
    code: 'UNKNOWN',
    message: shorten(text, MAX_MESSAGE_LENGTH) || 'Download failed',
  };
}

function shorten(text: string, maxLength: number): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }

  return `${singleLine.slice(0, maxLength - 1)}…`;
}
