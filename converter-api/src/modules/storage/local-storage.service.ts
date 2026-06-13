import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { STORAGE_DIRS } from '../../common/constants';
import { StorageException } from '../../common/exceptions/business.exception';
import { StoredFileInfo } from '../../common/interfaces';

export type StorageDir = keyof typeof STORAGE_DIRS;

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    const configured = this.configService.get<string>(
      'storage.path',
      './storage',
    );
    this.basePath = path.resolve(configured);
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDirectories();
    this.logger.log(`Storage initialized at ${this.basePath}`);
  }

  getDirectory(kind: StorageDir): string {
    return path.join(this.basePath, STORAGE_DIRS[kind]);
  }

  buildFilePath(kind: StorageDir, fileName: string): string {
    return path.join(this.getDirectory(kind), fileName);
  }

  async writeBuffer(
    kind: StorageDir,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileInfo> {
    const dir = this.getDirectory(kind);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, fileName);

    try {
      await fs.writeFile(fullPath, buffer);
    } catch (error) {
      throw new StorageException(
        `Failed to write file: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return {
      path: fullPath,
      fileName,
      mimeType,
      size: buffer.length,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      this.logger.warn(`Failed to delete file: ${filePath}`);
    }
  }

  async getFileInfo(filePath: string): Promise<{
    path: string;
    fileName: string;
    mimeType: string;
    size: number;
  }> {
    try {
      const stat = await fs.stat(filePath);
      return {
        path: filePath,
        fileName: path.basename(filePath),
        mimeType: 'application/octet-stream',
        size: stat.size,
      };
    } catch {
      throw new StorageException(`File not found: ${filePath}`);
    }
  }

  createReadStream(filePath: string): Readable {
    return createReadStream(filePath);
  }

  private async ensureDirectories(): Promise<void> {
    for (const dir of Object.values(STORAGE_DIRS)) {
      await fs.mkdir(path.join(this.basePath, dir), { recursive: true });
    }
  }
}
