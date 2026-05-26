'use client';

import { Film, ListVideo } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DownloadMode } from '@/store/download.store';

interface PlaylistModeChooserProps {
  mode: DownloadMode;
  onChange: (mode: DownloadMode) => void;
  playlistCount?: number;
  isLoading?: boolean;
}

export function PlaylistModeChooser({
  mode,
  onChange,
  playlistCount,
  isLoading,
}: PlaylistModeChooserProps) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListVideo className="h-4 w-4" />
          Playlist detected
        </CardTitle>
        <CardDescription>
          This link belongs to a playlist. Do you want to download just this
          video, or every video in the playlist?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={mode}
          onValueChange={(value) => onChange(value as DownloadMode)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="SINGLE">
              <Film className="h-4 w-4" />
              This video
            </TabsTrigger>
            <TabsTrigger value="PLAYLIST" disabled={isLoading}>
              <ListVideo className="h-4 w-4" />
              Entire playlist
              {typeof playlistCount === 'number' && playlistCount > 0
                ? ` (${playlistCount})`
                : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
