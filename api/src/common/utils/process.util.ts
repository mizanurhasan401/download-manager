import { spawn } from 'child_process';
import { ProcessExecutionResult } from '../interfaces';

export class ProcessNotFoundError extends Error {
  constructor(
    readonly command: string,
    readonly cause?: NodeJS.ErrnoException,
  ) {
    super(`Command not found: ${command}`);
    this.name = 'ProcessNotFoundError';
  }
}

export interface SpawnProcessOptions {
  args: string[];
  cwd?: string;
  timeoutMs?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export async function spawnProcessSafe(
  command: string,
  options: SpawnProcessOptions,
): Promise<ProcessExecutionResult> {
  const { args, cwd, timeoutMs = 300_000, onStdout, onStderr } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        reject(new Error(`Process timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      onStdout?.(chunk);
    });

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      onStderr?.(chunk);
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);

        if (error.code === 'ENOENT') {
          reject(new ProcessNotFoundError(command, error));
          return;
        }

        reject(error);
      }
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      }
    });
  });
}
