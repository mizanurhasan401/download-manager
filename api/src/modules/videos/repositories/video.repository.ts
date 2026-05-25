import { Injectable } from '@nestjs/common';
import { VideoProvider, Video, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashUrl } from '../../../common/utils';

export interface CreateVideoInput {
  url: string;
  provider: VideoProvider;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  uploader?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class VideoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUrlHash(urlHash: string): Promise<Video | null> {
    return this.prisma.video.findUnique({ where: { urlHash } });
  }

  async findById(id: string): Promise<Video | null> {
    return this.prisma.video.findUnique({ where: { id } });
  }

  async upsertByUrl(input: CreateVideoInput): Promise<Video> {
    const urlHash = hashUrl(input.url);

    return this.prisma.video.upsert({
      where: { urlHash },
      create: {
        url: input.url,
        urlHash,
        provider: input.provider,
        title: input.title,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl,
        duration: input.duration,
        uploader: input.uploader,
        metadata: input.metadata,
      },
      update: {
        title: input.title,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl,
        duration: input.duration,
        uploader: input.uploader,
        metadata: input.metadata,
      },
    });
  }
}
