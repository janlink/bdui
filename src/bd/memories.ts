import type { Memory } from '../types';
import { readBdJson, runBd, workspaceForBeadsPath } from './client';

type ReadJson = typeof readBdJson;

export interface MemoriesOptions {
  cwd?: string;
  readJson?: ReadJson;
}

// bd memories --json returns a flat { key: value, ..., schema_version } object.
// Meta keys and non-string values are dropped so only real memories remain.
const META_KEYS = new Set(['schema_version', 'error', 'hint', 'message']);

export function normalizeMemories(value: unknown): Memory[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('bd memories returned JSON that is not an object');
  }

  const entries = value as Record<string, unknown>;
  if (typeof entries.error === 'string') {
    throw new Error(typeof entries.message === 'string' ? entries.message : entries.error);
  }

  return Object.entries(entries)
    .filter(([key, item]) => !META_KEYS.has(key) && typeof item === 'string')
    .map(([key, item]) => ({ key, value: item as string }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

/** Read every persistent memory through the supported bd JSON interface. */
export async function loadMemories(beadsPath = '.beads', options: MemoriesOptions = {}): Promise<Memory[]> {
  const readJson = options.readJson ?? readBdJson;
  const cwd = options.cwd ?? workspaceForBeadsPath(beadsPath);
  const value = await readJson(['memories', '--json'], cwd);
  return normalizeMemories(value);
}

/** Remove a persistent memory by key. Propagates a nonzero exit as an error. */
export async function forgetMemory(key: string, beadsPath = '.beads', options: Pick<MemoriesOptions, 'cwd'> = {}): Promise<void> {
  const cwd = options.cwd ?? workspaceForBeadsPath(beadsPath);
  await runBd(['forget', key], { cwd });
}
