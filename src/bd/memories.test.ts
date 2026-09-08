import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeMemories, loadMemories, forgetMemory } from './memories';

const run = (command: string[], cwd: string, env: Record<string, string>) => {
  const result = Bun.spawnSync(command, { cwd, env: { ...process.env, ...env } });
  if (result.exitCode !== 0) {
    throw new Error(`${command.join(' ')} failed:\n${result.stderr.toString()}`);
  }
};

test('normalizeMemories drops the schema_version meta key and sorts by key', () => {
  const memories = normalizeMemories({
    'race-flag': 'always run tests with -race flag',
    'dolt-phantoms': 'phantom DBs hide in three places',
    schema_version: 1,
  });

  expect(memories).toEqual([
    { key: 'dolt-phantoms', value: 'phantom DBs hide in three places' },
    { key: 'race-flag', value: 'always run tests with -race flag' },
  ]);
});

test('normalizeMemories returns an empty list for an empty workspace payload', () => {
  expect(normalizeMemories({ schema_version: 1 })).toEqual([]);
});

test('normalizeMemories ignores non-string values instead of surfacing them as memories', () => {
  expect(normalizeMemories({ good: 'text', bogus: 42, schema_version: 1 })).toEqual([
    { key: 'good', value: 'text' },
  ]);
});

test('normalizeMemories throws on an error payload and on non-object JSON', () => {
  expect(() => normalizeMemories({ error: 'no_beads_directory', message: 'no workspace', schema_version: 1 }))
    .toThrow('no workspace');
  expect(() => normalizeMemories(['not', 'an', 'object'])).toThrow(/not an object/);
});

test('loadMemories requests the memories command as argv and normalizes the result', async () => {
  const calls: Array<{ args: readonly string[]; cwd: string }> = [];
  const readJson = async (args: readonly string[], cwd: string) => {
    calls.push({ args, cwd });
    return { alpha: 'a', beta: 'b', schema_version: 1 };
  };

  const memories = await loadMemories('/tmp/ws/.beads', { cwd: '/tmp/ws', readJson });

  expect(calls).toEqual([{ args: ['memories', '--json'], cwd: '/tmp/ws' }]);
  expect(memories).toEqual([
    { key: 'alpha', value: 'a' },
    { key: 'beta', value: 'b' },
  ]);
});

test('loadMemories and forgetMemory round-trip against a current embedded-Dolt workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bdui-memories-'));
  const repo = join(root, 'repo');
  const home = join(root, 'home');
  const env = {
    HOME: home,
    XDG_CONFIG_HOME: join(home, '.config'),
    BD_NON_INTERACTIVE: '1',
  };

  try {
    await mkdir(repo);
    await mkdir(home);
    run(['git', 'init', '--quiet'], repo, env);
    run(['bd', 'init', '--non-interactive', '--stealth', '--skip-agents', '--prefix', 'mem'], repo, env);
    run(['bd', 'remember', 'always run tests with -race flag', '--key', 'race-flag'], repo, env);
    run(['bd', 'remember', 'auth module uses JWT not sessions', '--key', 'auth-jwt'], repo, env);

    const beadsPath = join(repo, '.beads');
    const loaded = await loadMemories(beadsPath);
    expect(loaded).toEqual([
      { key: 'auth-jwt', value: 'auth module uses JWT not sessions' },
      { key: 'race-flag', value: 'always run tests with -race flag' },
    ]);

    await forgetMemory('race-flag', beadsPath);
    const afterForget = await loadMemories(beadsPath);
    expect(afterForget).toEqual([
      { key: 'auth-jwt', value: 'auth module uses JWT not sessions' },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
