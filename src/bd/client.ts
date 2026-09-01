import { basename, dirname, resolve } from 'node:path';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_STDOUT_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_STDERR_BYTES = 1024 * 1024;
const DEFAULT_KILL_GRACE_MS = 250;
const DEFAULT_CLEANUP_TIMEOUT_MS = 2_000;

export interface BdRunOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
  killGraceMs?: number;
  cleanupTimeoutMs?: number;
}

export interface BdResult {
  stdout: string;
  stderr: string;
}

async function readBounded(
  stream: ReadableStream<Uint8Array>,
  maximumBytes: number,
  streamName: 'stdout' | 'stderr',
  fail: (error: Error) => void,
  operation: string,
  cancellation: AbortSignal,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const cancel = () => void reader.cancel().catch(() => undefined);
  cancellation.addEventListener('abort', cancel, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        fail(new Error(`${operation} ${streamName} exceeded ${maximumBytes} bytes`));
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  } catch (error) {
    if (!cancellation.aborted) {
      fail(new Error(`${operation} failed while reading ${streamName}`, { cause: error }));
    }
  } finally {
    cancellation.removeEventListener('abort', cancel);
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString('utf8');
}

/** Run bd without involving a shell, with bounded time, output, and cleanup. */
export async function runBd(args: readonly string[], options: BdRunOptions = {}): Promise<BdResult> {
  const operation = `bd ${args[0] ?? ''}`.trimEnd();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxStdoutBytes = options.maxStdoutBytes ?? DEFAULT_MAX_STDOUT_BYTES;
  const maxStderrBytes = options.maxStderrBytes ?? DEFAULT_MAX_STDERR_BYTES;
  const killGraceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const cleanupTimeoutMs = options.cleanupTimeoutMs ?? DEFAULT_CLEANUP_TIMEOUT_MS;

  const processHandle = Bun.spawn(['bd', ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const captureCancellation = new AbortController();
  let boundaryError: Error | null = null;
  let forceKillTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  let releaseCleanup!: () => void;
  const cleanupDeadline = new Promise<void>((resolve) => {
    releaseCleanup = resolve;
  });

  const kill = (signal?: number) => {
    try {
      signal === undefined ? processHandle.kill() : processHandle.kill(signal);
    } catch {
      // The process may have exited between the boundary failure and cleanup.
    }
  };
  const fail = (error: Error) => {
    if (boundaryError) return;
    boundaryError = error;
    kill();
    forceKillTimer = setTimeout(() => {
      kill(9);
      captureCancellation.abort();
    }, killGraceMs);
    cleanupTimer = setTimeout(() => {
      captureCancellation.abort();
      releaseCleanup();
    }, cleanupTimeoutMs);
  };
  const timeoutTimer = setTimeout(() => {
    fail(new Error(`${operation} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const completion = Promise.allSettled([
    readBounded(processHandle.stdout, maxStdoutBytes, 'stdout', fail, operation, captureCancellation.signal),
    readBounded(processHandle.stderr, maxStderrBytes, 'stderr', fail, operation, captureCancellation.signal),
    processHandle.exited,
  ]);
  const completed = await Promise.race([
    completion.then((results) => ({ results })),
    cleanupDeadline.then(() => ({ results: null })),
  ]);

  clearTimeout(timeoutTimer);
  if (forceKillTimer) clearTimeout(forceKillTimer);
  if (cleanupTimer) clearTimeout(cleanupTimer);
  captureCancellation.abort();

  if (boundaryError) throw boundaryError;
  if (!completed.results) throw new Error(`${operation} cleanup timed out after ${cleanupTimeoutMs}ms`);

  const [stdoutResult, stderrResult, exitResult] = completed.results;
  if (stdoutResult.status === 'rejected') throw stdoutResult.reason;
  if (stderrResult.status === 'rejected') throw stderrResult.reason;
  if (exitResult.status === 'rejected') throw exitResult.reason;

  const stdout = stdoutResult.value;
  const stderr = stderrResult.value;
  if (exitResult.value !== 0) {
    const detail = stderr.trim() || stdout.trim() || `exit code ${exitResult.value}`;
    throw new Error(`${operation} failed: ${detail}`);
  }

  return { stdout, stderr };
}

export function workspaceForBeadsPath(beadsPath: string): string {
  const absolutePath = resolve(beadsPath);
  return basename(absolutePath) === '.beads' ? dirname(absolutePath) : absolutePath;
}

export async function readBdJson(
  args: readonly string[],
  cwd: string,
  options: Omit<BdRunOptions, 'cwd'> = {},
): Promise<unknown> {
  const { stdout } = await runBd(args, { ...options, cwd });
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`bd ${args[0] ?? ''} returned invalid JSON`, { cause: error });
  }
}
