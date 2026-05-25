export type PlayerEvent = 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate';

export interface PlayerAdapter {
  play(): Promise<void> | void;
  pause(): Promise<void> | void;
  seek(seconds: number): Promise<void> | void;
  getCurrentTime(): Promise<number> | number;
  getDuration(): Promise<number> | number;
  on(event: PlayerEvent, handler: (payload?: number) => void): () => void;
  destroy(): void;
}

export interface PlayerKindResult {
  kind: 'youtube' | 'vimeo';
  externalId: string;
}
