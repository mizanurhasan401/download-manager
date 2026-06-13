import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Public-facing target format enum exposed via Swagger.
 *
 * Mirrors `ConversionFileFormat` from Prisma so the DTO does not depend on the
 * generated client at request-validation time — a deliberate decoupling to keep
 * DTOs portable across services.
 */
export enum TargetFormatDto {
  PDF = 'PDF',
  DOCX = 'DOCX',
  PNG = 'PNG',
  JPG = 'JPG',
  WEBP = 'WEBP',
  HEIC = 'HEIC',
  GIF = 'GIF',
  TIFF = 'TIFF',
}

const toInt = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : Math.trunc(parsed);
};

export class ConvertFileDto {
  @ApiProperty({
    enum: TargetFormatDto,
    description: 'Target format. Source is auto-detected from the uploaded file.',
  })
  @IsEnum(TargetFormatDto)
  targetFormat!: TargetFormatDto;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 100,
    description: 'Optional image quality (1-100). Applies to lossy image targets.',
  })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;
}
