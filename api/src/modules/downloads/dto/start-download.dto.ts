import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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
}
