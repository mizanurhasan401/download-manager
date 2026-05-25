'use client';

import { useEffect, useMemo } from 'react';
import { Film, Music } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes } from '@/lib/utils';
import { useDownloadUiStore } from '@/store/download.store';
import type { MediaType, VideoFormat, VideoMetadata } from '@/types/api';

interface QualitySelectorProps {
  metadata: VideoMetadata;
}

function filterFormats(formats: VideoFormat[], mediaType: MediaType): VideoFormat[] {
  if (mediaType === 'VIDEO') {
    const withAudio = formats.filter((f) => f.hasVideo && f.hasAudio);
    if (withAudio.length > 0) return withAudio;
    return formats.filter((f) => f.hasVideo);
  }
  return formats.filter((f) => f.hasAudio);
}

function formatLabel(format: VideoFormat, mediaType: MediaType): string {
  const parts = [format.quality];
  if (format.resolution) parts.push(format.resolution);
  if (format.ext) parts.push(format.ext.toUpperCase());
  if (format.fileSize) parts.push(formatBytes(format.fileSize));
  if (mediaType === 'AUDIO' && format.acodec) parts.push(format.acodec);
  return parts.join(' · ');
}

export function QualitySelector({ metadata }: QualitySelectorProps) {
  const selection = useDownloadUiStore((s) => s.selection);
  const setSelection = useDownloadUiStore((s) => s.setSelection);

  const videoFormats = useMemo(
    () => filterFormats(metadata.formats, 'VIDEO'),
    [metadata.formats],
  );
  const audioFormats = useMemo(
    () => filterFormats(metadata.formats, 'AUDIO'),
    [metadata.formats],
  );

  const mediaType = selection?.mediaType ?? 'VIDEO';
  const activeFormats = mediaType === 'VIDEO' ? videoFormats : audioFormats;

  useEffect(() => {
    const formats = filterFormats(metadata.formats, mediaType);
    if (formats.length === 0) return;

    const currentValid = selection && formats.some((f) => f.formatId === selection.formatId);
    if (!currentValid) {
      const first = formats[0];
      setSelection({
        formatId: first.formatId,
        quality: first.quality,
        mediaType,
      });
    }
  }, [metadata.formats, mediaType, selection, setSelection]);

  const handleTabChange = (value: string) => {
    const nextType = value as MediaType;
    const formats = filterFormats(metadata.formats, nextType);
    if (formats.length === 0) return;

    const first = formats[0];
    setSelection({
      formatId: first.formatId,
      quality: first.quality,
      mediaType: nextType,
    });
  };

  const handleFormatChange = (formatId: string) => {
    const format = activeFormats.find((f) => f.formatId === formatId);
    if (!format) return;

    setSelection({
      formatId: format.formatId,
      quality: format.quality,
      mediaType,
    });
  };

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle>Choose format</CardTitle>
        <CardDescription>
          Select MP4 video or MP3 audio quality before starting your download.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mediaType} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="VIDEO" disabled={videoFormats.length === 0}>
              <Film className="h-4 w-4" />
              MP4
            </TabsTrigger>
            <TabsTrigger value="AUDIO" disabled={audioFormats.length === 0}>
              <Music className="h-4 w-4" />
              MP3
            </TabsTrigger>
          </TabsList>

          <TabsContent value="VIDEO">
            {videoFormats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No video formats available.</p>
            ) : (
              <FormatSelect
                formats={videoFormats}
                value={selection?.formatId}
                mediaType="VIDEO"
                onChange={handleFormatChange}
              />
            )}
          </TabsContent>

          <TabsContent value="AUDIO">
            {audioFormats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audio formats available.</p>
            ) : (
              <FormatSelect
                formats={audioFormats}
                value={selection?.formatId}
                mediaType="AUDIO"
                onChange={handleFormatChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function FormatSelect({
  formats,
  value,
  mediaType,
  onChange,
}: {
  formats: VideoFormat[];
  value?: string;
  mediaType: MediaType;
  onChange: (formatId: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select quality" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem key={format.formatId} value={format.formatId}>
            {formatLabel(format, mediaType)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
