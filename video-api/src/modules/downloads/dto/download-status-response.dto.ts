import { ApiProperty } from '@nestjs/swagger';

export class DownloadStatusResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'PROCESSING' })
  status!: string;

  @ApiProperty({ example: 45.5 })
  progress!: number;

  @ApiProperty({ example: '/api/v1/downloads/file/550e8400-e29b-41d4-a716-446655440000', nullable: true })
  downloadUrl!: string | null;
}
