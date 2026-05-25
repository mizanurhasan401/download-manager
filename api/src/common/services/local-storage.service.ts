import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { STORAGE_DIRS } from '../constants';
import { StorageException } from '../exceptions/business.exception';
import { StorageFileInfo } from '../interfaces';
import { sanitizeFileName } from '../utils';

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = path.resolve(
      this.configService.get<string>('storage.path', './storage'),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.ensureStorageStructure();
  }

  async ensureStorageStructure(): Promise<void> {
    const directories = Object.values(STORAGE_DIRS).map((dir) =>
      path.join(this.basePath, dir),
    );

    await Promise.all(
      directories.map((dir) => fs.mkdir(dir, { recursive: true })),
    );

    this.logger.log(`Storage initialized at ${this.basePath}`);
  }

  getBasePath(): string {
    return this.basePath;
  }

  getDirectory(type: keyof typeof STORAGE_DIRS): string {
    return path.join(this.basePath, STORAGE_DIRS[type]);
  }

  buildFilePath(
    type: keyof typeof STORAGE_DIRS,
    fileName: string,
  ): string {
    return path.join(this.getDirectory(type), sanitizeFileName(fileName));
  }

  async saveFile(
    type: keyof typeof STORAGE_DIRS,
    fileName: string,
    sourcePath: string,
  ): Promise<StorageFileInfo> {
    const destination = this.buildFilePath(type, fileName);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(sourcePath, destination);

    const stats = await fs.stat(destination);
    const mimeType = this.resolveMimeType(destination);

    return {
      path: destination,
      fileName: path.basename(destination),
      size: stats.size,
      mimeType,
    };
  }

  async moveFile(
    sourcePath: string,
    type: keyof typeof STORAGE_DIRS,
    fileName: string,
  ): Promise<StorageFileInfo> {
    const sourceExists = await this.fileExists(sourcePath);
    if (!sourceExists) {
      throw new StorageException(`Source file not found: ${sourcePath}`);
    }

    const destination = this.buildFilePath(type, fileName);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    try {
      await fs.rename(sourcePath, destination);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EXDEV') {
        await fs.copyFile(sourcePath, destination);
        await fs.unlink(sourcePath);
      } else {
        throw new StorageException(
          `Failed to move file to storage: ${err.message}`,
        );
      }
    }

    const stats = await fs.stat(destination);

    return {
      path: destination,
      fileName: path.basename(destination),
      size: stats.size,
      mimeType: this.resolveMimeType(destination),
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.debug(`Deleted file: ${filePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new StorageException(`Failed to delete file: ${filePath}`);
      }
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<StorageFileInfo> {
    const exists = await this.fileExists(filePath);
    if (!exists) {
      throw new NotFoundException('File not found');
    }

    const stats = await fs.stat(filePath);

    return {
      path: filePath,
      fileName: path.basename(filePath),
      size: stats.size,
      mimeType: this.resolveMimeType(filePath),
    };
  }

  createReadStream(filePath: string): StreamableFile {
    const stream = createReadStream(filePath);
    return new StreamableFile(stream);
  }

  async isStorageAvailable(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicFileUrl(downloadJobId: string): string {
    return `/api/v1/downloads/file/${downloadJobId}`;
  }

  private resolveMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.opus': 'audio/opus',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    return mimeMap[ext] ?? 'application/octet-stream';
  }
}
