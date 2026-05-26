import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  SUPPORTED_AUDIO_BITRATES,
  SupportedAudioBitrate,
} from '../../downloads/dto/start-download.dto';

export enum PlaylistQualityPreference {
  BEST = 'BEST',
  Q_2160P = 'Q_2160P',
  Q_1440P = 'Q_1440P',
  Q_1080P = 'Q_1080P',
  Q_720P = 'Q_720P',
  Q_480P = 'Q_480P',
  AUDIO_MP3 = 'AUDIO_MP3',
}

export class StartPlaylistDownloadDto {
  @ApiProperty({
    description: 'Playlist UUID returned by /playlists/metadata',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  playlistId!: string;

  @ApiProperty({
    description: 'PlaylistItem UUIDs to download',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  itemIds!: string[];

  @ApiProperty({
    enum: PlaylistQualityPreference,
    description: 'Single quality preference applied to every selected item',
    example: PlaylistQualityPreference.Q_1080P,
  })
  @IsEnum(PlaylistQualityPreference)
  qualityPreference!: PlaylistQualityPreference;

  @ApiPropertyOptional({
    description:
      'MP3 bitrate (kbps) when qualityPreference is AUDIO_MP3',
    enum: SUPPORTED_AUDIO_BITRATES,
    example: 192,
    default: 192,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([...SUPPORTED_AUDIO_BITRATES])
  audioBitrate?: SupportedAudioBitrate;
}
