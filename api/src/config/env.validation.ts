import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  POSTGRES_PORT!: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER!: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB!: string;

  @IsOptional()
  @IsString()
  POSTGRES_SCHEMA?: string;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT!: number;

  @IsString()
  @IsNotEmpty()
  STORAGE_PATH!: string;

  @IsString()
  @IsNotEmpty()
  YTDLP_PATH!: string;

  @IsString()
  @IsNotEmpty()
  FFMPEG_PATH!: string;

  @IsInt()
  @Min(1)
  MAX_DOWNLOAD_SIZE_MB!: number;

  @IsInt()
  @Min(1)
  @Max(50)
  MAX_CONCURRENT_DOWNLOADS!: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  THROTTLE_TTL?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT?: number;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;
}
