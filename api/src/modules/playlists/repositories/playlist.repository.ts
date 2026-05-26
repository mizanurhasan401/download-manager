import { Injectable } from '@nestjs/common';
import {
  Playlist,
  PlaylistItem,
  PlaylistStatus,
  Prisma,
  VideoProvider,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashUrl } from '../../../common/utils';

export interface UpsertPlaylistInput {
  sourceUrl: string;
  provider: VideoProvider;
  title?: string;
  uploader?: string;
  totalItems: number;
  metadata?: Prisma.InputJsonValue;
}

export interface CreatePlaylistItemInput {
  position: number;
  videoUrl: string;
  title?: string;
  duration?: number;
  thumbnailUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

export type PlaylistWithItems = Prisma.PlaylistGetPayload<{
  include: { items: true };
}>;

@Injectable()
export class PlaylistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Playlist | null> {
    return this.prisma.playlist.findUnique({ where: { id } });
  }

  async findByIdWithItems(id: string): Promise<PlaylistWithItems | null> {
    return this.prisma.playlist.findUnique({
      where: { id },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  async upsertWithItems(
    input: UpsertPlaylistInput,
    items: CreatePlaylistItemInput[],
  ): Promise<PlaylistWithItems> {
    const sourceUrlHash = hashUrl(input.sourceUrl);

    return this.prisma.$transaction(async (tx) => {
      const playlist = await tx.playlist.upsert({
        where: { sourceUrlHash },
        create: {
          sourceUrl: input.sourceUrl,
          sourceUrlHash,
          provider: input.provider,
          title: input.title,
          uploader: input.uploader,
          totalItems: input.totalItems,
          status: PlaylistStatus.READY,
          metadata: input.metadata,
        },
        update: {
          title: input.title,
          uploader: input.uploader,
          totalItems: input.totalItems,
          status: PlaylistStatus.READY,
          metadata: input.metadata,
          errorMessage: null,
          completedAt: null,
        },
      });

      await tx.playlistItem.deleteMany({ where: { playlistId: playlist.id } });

      if (items.length > 0) {
        await tx.playlistItem.createMany({
          data: items.map((item) => ({
            playlistId: playlist.id,
            position: item.position,
            videoUrl: item.videoUrl,
            title: item.title,
            duration: item.duration,
            thumbnailUrl: item.thumbnailUrl,
            selected: true,
            metadata: item.metadata,
          })),
        });
      }

      return tx.playlist.findUniqueOrThrow({
        where: { id: playlist.id },
        include: { items: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async updateStatus(
    id: string,
    status: PlaylistStatus,
    data?: { selectedItems?: number; errorMessage?: string | null },
  ): Promise<Playlist> {
    return this.prisma.playlist.update({
      where: { id },
      data: {
        status,
        selectedItems: data?.selectedItems,
        errorMessage: data?.errorMessage,
        completedAt:
          status === PlaylistStatus.COMPLETED ||
          status === PlaylistStatus.PARTIALLY_COMPLETED ||
          status === PlaylistStatus.FAILED ||
          status === PlaylistStatus.CANCELLED
            ? new Date()
            : null,
      },
    });
  }

  async findItemsByIds(
    playlistId: string,
    itemIds: string[],
  ): Promise<PlaylistItem[]> {
    return this.prisma.playlistItem.findMany({
      where: { playlistId, id: { in: itemIds } },
      orderBy: { position: 'asc' },
    });
  }
}
