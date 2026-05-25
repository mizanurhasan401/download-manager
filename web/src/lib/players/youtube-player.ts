import type { PlayerAdapter, PlayerEvent } from './types';

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YTPlayerEventTarget {
  target: YTPlayerInstance;
}

interface YTStateChangeEvent extends YTPlayerEventTarget {
  data: number;
}

interface YTPlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YTPlayerEventTarget) => void;
    onStateChange?: (event: YTStateChangeEvent) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (
    elementOrId: HTMLElement | string,
    options: YTPlayerOptions,
  ) => YTPlayerInstance;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_ID = 'youtube-iframe-api';
let apiLoadPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube IFrame API requires a browser'));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube IFrame API failed to initialise'));
      }
    };

    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'));
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

export interface CreateYouTubePlayerOptions {
  videoId: string;
  container: HTMLElement;
  onReady?: () => void;
}

export async function createYouTubePlayer(
  options: CreateYouTubePlayerOptions,
): Promise<PlayerAdapter> {
  const YT = await loadYouTubeApi();

  const handlers: Record<PlayerEvent, Set<(payload?: number) => void>> = {
    ready: new Set(),
    play: new Set(),
    pause: new Set(),
    ended: new Set(),
    timeupdate: new Set(),
  };

  let player: YTPlayerInstance | null = null;
  let pollHandle: number | null = null;
  let isPlaying = false;

  const emit = (event: PlayerEvent, payload?: number) => {
    handlers[event].forEach((fn) => fn(payload));
  };

  const startPoll = () => {
    if (pollHandle !== null) return;
    pollHandle = window.setInterval(() => {
      if (!player) return;
      try {
        emit('timeupdate', player.getCurrentTime());
      } catch {
        // player not ready yet
      }
    }, 250);
  };

  const stopPoll = () => {
    if (pollHandle !== null) {
      window.clearInterval(pollHandle);
      pollHandle = null;
    }
  };

  await new Promise<void>((resolve, reject) => {
    try {
      player = new YT.Player(options.container, {
        videoId: options.videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin:
            typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            options.onReady?.();
            emit('ready');
            resolve();
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              isPlaying = true;
              emit('play');
              startPoll();
            } else if (event.data === YT.PlayerState.PAUSED) {
              isPlaying = false;
              emit('pause');
              stopPoll();
            } else if (event.data === YT.PlayerState.ENDED) {
              isPlaying = false;
              emit('ended');
              stopPoll();
            }
          },
          onError: () => {
            stopPoll();
            reject(new Error('YouTube player failed to load this video'));
          },
        },
      });
    } catch (error) {
      reject(error);
    }
  });

  const adapter: PlayerAdapter = {
    play: () => {
      player?.playVideo();
    },
    pause: () => {
      player?.pauseVideo();
    },
    seek: (seconds) => {
      player?.seekTo(seconds, true);
      try {
        if (player) emit('timeupdate', player.getCurrentTime());
      } catch {
        // ignore
      }
    },
    getCurrentTime: () => player?.getCurrentTime() ?? 0,
    getDuration: () => player?.getDuration() ?? 0,
    on: (event, handler) => {
      handlers[event].add(handler);
      return () => handlers[event].delete(handler);
    },
    destroy: () => {
      stopPoll();
      isPlaying = false;
      try {
        player?.destroy();
      } catch {
        // ignore
      }
      player = null;
      Object.values(handlers).forEach((set) => set.clear());
    },
  };

  void isPlaying;
  return adapter;
}
