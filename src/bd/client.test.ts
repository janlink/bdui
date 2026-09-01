import { expect, test } from 'bun:test';
import { access, chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBd } from './client';

async function fakeBd(): Promise<{ root: string; env: Record<string, string> }> {
  const root = await mkdtemp(join(tmpdir(), 'bdui-client-'));
  const executable = join(root, 'bd');
  await writeFile(executable, `#!/usr/bin/env bun
import { writeFileSync } from 'node:fs';
const mode = Bun.argv[2];
if (mode === 'wait') await Bun.sleep(10_000);
if (mode === 'resist') {
  process.on('SIGTERM', () => writeFileSync(process.env.SIGNAL_MARKER, 'ignored'));
  await Bun.sleep(10_000);
}
if (mode === 'stdout') process.stdout.write('x'.repeat(1024));
if (mode === 'stderr') process.stderr.write('x'.repeat(1024));
`);
  await chmod(executable, 0o755);
  return {
    root,
    env: { PATH: `${root}${delimiter}${process.env.PATH ?? ''}` },
  };
}

test('runBd terminates a command that exceeds its timeout', async () => {
  const fake = await fakeBd();
  try {
    await expect(runBd(['wait'], { env: fake.env, timeoutMs: 25 })).rejects.toThrow(
      'bd wait timed out after 25ms',
    );
  } finally {
    await rm(fake.root, { recursive: true, force: true });
  }
});

test('runBd force-kills a child that ignores graceful termination', async () => {
  const fake = await fakeBd();
  const marker = join(fake.root, 'ignored-sigterm');
  try {
    const startedAt = performance.now();
    await expect(runBd(['resist'], {
      env: { ...fake.env, SIGNAL_MARKER: marker },
      timeoutMs: 500,
      killGraceMs: 25,
      cleanupTimeoutMs: 1_500,
    })).rejects.toThrow('bd resist timed out after 500ms');

    expect(performance.now() - startedAt).toBeLessThan(1_500);
    await access(marker);
  } finally {
    await rm(fake.root, { recursive: true, force: true });
  }
});

for (const stream of ['stdout', 'stderr'] as const) {
  test(`runBd rejects oversized ${stream}`, async () => {
    const fake = await fakeBd();
    try {
      await expect(runBd([stream], {
        env: fake.env,
        maxStdoutBytes: stream === 'stdout' ? 32 : 2_048,
        maxStderrBytes: stream === 'stderr' ? 32 : 2_048,
      })).rejects.toThrow(`bd ${stream} ${stream} exceeded 32 bytes`);
    } finally {
      await rm(fake.root, { recursive: true, force: true });
    }
  });
}
