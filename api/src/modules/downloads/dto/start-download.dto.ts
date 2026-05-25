import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SUPPORTED_AUDIO_BITRATES = [128, 192, 256, 320] as const;
export type SupportedAudioBitrate = (typeof SUPPORTED_AUDIO_BITRATES)[number];

export class StartDownloadDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Video ID from metadata response',
  })
  @IsUUID()
  @IsNotEmpty()
  videoId!: string;

  @ApiProperty({
    example: '137',
    description: 'Selected format ID from available formats',
  })
  @IsString()
  @IsNotEmpty()
  formatId!: string;

  @ApiPropertyOptional({
    example: '1080p',
    description: 'Quality label for reference',
  })
  @IsOptional()
  @IsString()
  quality?: string;

  @ApiPropertyOptional({
    enum: MediaType,
    example: MediaType.VIDEO,
    default: MediaType.VIDEO,
  })
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @ApiPropertyOptional({
    description: 'MP3 bitrate (kbps) when mediaType is AUDIO',
    enum: SUPPORTED_AUDIO_BITRATES,
    example: 192,
    default: 192,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([...SUPPORTED_AUDIO_BITRATES])
  audioBitrate?: SupportedAudioBitrate;

  @ApiPropertyOptional({
    description: 'Optional clip start time in seconds (Feature: Clip Download)',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  clipStartSeconds?: number;

  @ApiPropertyOptional({
    description: 'Optional clip end time in seconds',
    example: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(36000)
  clipEndSeconds?: number;
}
