import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FetchPlaylistMetadataDto {
  @ApiProperty({
    example: 'https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx',
    description: 'Playlist URL from a supported provider',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({
    description: 'Maximum number of items to fetch from the playlist',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxItems?: number;
}
