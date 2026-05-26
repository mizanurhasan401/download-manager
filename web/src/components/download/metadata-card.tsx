'use client';

import { motion } from 'framer-motion';
import { Clock, User } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDuration } from '@/lib/utils';
import type { VideoMetadata } from '@/types/api';

interface MetadataCardProps {
  metadata: VideoMetadata;
  action?: ReactNode;
}

export function MetadataCard({ metadata, action }: MetadataCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-4 p-0 sm:flex-row">
          {metadata.thumbnailUrl && (
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted sm:w-56">
              <Image
                src={metadata.thumbnailUrl}
                alt={metadata.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col justify-center gap-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{metadata.provider}</Badge>
                {metadata.duration != null && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(metadata.duration)}
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-semibold leading-tight tracking-tight">
                {metadata.title}
              </h2>
            <div className="flex items-center gap-2 justify-between">
            {metadata.uploader && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {metadata.uploader}
                </p>
              )}
                {action && <div className="shrink-0">{action}</div>}
            </div>
            </div>
          
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
