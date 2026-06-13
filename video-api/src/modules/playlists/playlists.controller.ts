import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VideoUrlValidationPipe } from '../../common/pipes/video-url-validation.pipe';
import { FetchPlaylistMetadataDto } from './dto/fetch-playlist-metadata.dto';
import { StartPlaylistDownloadDto } from './dto/start-playlist-download.dto';
import { PlaylistsService } from './playlists.service';

@ApiTags('Playlists')
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post('metadata')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract playlist metadata and list of items (flat extraction)',
  })
  @ApiResponse({ status: 200, description: 'Playlist metadata extracted' })
  @ApiResponse({ status: 400, description: 'Invalid URL or not a playlist' })
  async fetchMetadata(@Body() dto: FetchPlaylistMetadataDto) {
    const url = new VideoUrlValidationPipe().transform(dto.url);
    const playlist = await this.playlistsService.fetchAndStoreMetadata(
      url,
      dto.maxItems ?? 100,
    );

    return {
      success: true,
      message: 'Playlist metadata extracted successfully',
      data: this.serializePlaylist(playlist),
    };
  }

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue downloads for selected playlist items',
  })
  @ApiResponse({ status: 202, description: 'Playlist downloads queued' })
  async startDownloads(@Body() dto: StartPlaylistDownloadDto) {
    const result = await this.playlistsService.startDownloads(dto);

    return {
      success: true,
      message: 'Playlist downloads queued successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playlist status + items' })
  @ApiParam({ name: 'id', description: 'Playlist UUID' })
  @ApiResponse({ status: 200, description: 'Playlist retrieved' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async getPlaylist(@Param('id', ParseUUIDPipe) id: string) {
    const playlist = await this.playlistsService.getPlaylist(id);

    return {
      success: true,
      message: 'Playlist retrieved',
      data: this.serializePlaylist(playlist),
    };
  }

  private serializePlaylist(playlist: {
    id: string;
    sourceUrl: string;
    provider: string;
    title: string | null;
    uploader: string | null;
    totalItems: number;
    selectedItems: number;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    items: Array<{
      id: string;
      position: number;
      videoUrl: string;
      title: string | null;
      duration: number | null;
      thumbnailUrl: string | null;
      selected: boolean;
    }>;
  }) {
    return {
      id: playlist.id,
      sourceUrl: playlist.sourceUrl,
      provider: playlist.provider,
      title: playlist.title,
      uploader: playlist.uploader,
      totalItems: playlist.totalItems,
      selectedItems: playlist.selectedItems,
      status: playlist.status,
      errorMessage: playlist.errorMessage,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      completedAt: playlist.completedAt?.toISOString() ?? null,
      items: playlist.items.map((item) => ({
        id: item.id,
        position: item.position,
        videoUrl: item.videoUrl,
        title: item.title,
        duration: item.duration,
        thumbnailUrl: item.thumbnailUrl,
        selected: item.selected,
      })),
    };
  }
}
