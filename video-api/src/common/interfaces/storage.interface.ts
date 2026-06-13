import { StreamableFile } from '@nestjs/common';
import { StorageFileInfo } from '../interfaces';

export interface IStorageService {
  ensureStorageStructure(): Promise<void>;
  getBasePath(): string;
  buildFilePath(type: string, fileName: string): string;
  saveFile(
    type: string,
    fileName: string,
    sourcePath: string,
  ): Promise<StorageFileInfo>;
  moveFile(
    sourcePath: string,
    type: string,
    fileName: string,
  ): Promise<StorageFileInfo>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  getFileInfo(filePath: string): Promise<StorageFileInfo>;
  createReadStream(filePath: string): StreamableFile;
  isStorageAvailable(): Promise<boolean>;
  getPublicFileUrl(downloadJobId: string): string;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
