import { existsSync } from 'fs';
import { isAbsolute, resolve } from 'path';

export function resolveExecutablePath(configuredPath: string): string {
  if (isAbsolute(configuredPath)) {
    return configuredPath;
  }

  const fromProjectRoot = resolve(process.cwd(), configuredPath);

  if (existsSync(fromProjectRoot)) {
    return fromProjectRoot;
  }

  return configuredPath;
}
