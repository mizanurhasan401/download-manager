import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  error?: unknown;
}
