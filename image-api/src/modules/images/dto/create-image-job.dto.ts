import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum ImageOperationDto {
  CONVERT = 'CONVERT',
  RESIZE = 'RESIZE',
  REMOVE_BACKGROUND = 'REMOVE_BACKGROUND',
}

export enum OutputFormatDto {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
  HEIC = 'heic',
  GIF = 'gif',
  TIFF = 'tiff',
}

export enum ResizeFitDto {
  COVER = 'cover',
  CONTAIN = 'contain',
  FILL = 'fill',
  INSIDE = 'inside',
  OUTSIDE = 'outside',
}

const toInt = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : Math.trunc(parsed);
};

export class CreateImageJobDto {
  @IsEnum(ImageOperationDto)
  operation!: ImageOperationDto;

  @IsOptional()
  @IsEnum(OutputFormatDto)
  format?: OutputFormatDto;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(8192)
  width?: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(8192)
  height?: number;

  @IsOptional()
  @IsEnum(ResizeFitDto)
  fit?: ResizeFitDto;
}
