import { expect, test } from 'bun:test';
import { access, chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import { closeIssue, createIssue, getAssignees, getLabels, updateIssue } from './commands';
import { readBdJson } from './client';
import { loadBeads } from './parser';

const run = (command: string[], cwd: string, env: Record<string, string>) => {
  const result = Bun.spawnSync(command, { cwd, env: { ...process.env, ...env } });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
};

async function fakeListBoundary(mode: 'failure' | 'malformed') {
  const root = await mkdtemp(join(tmpdir(), 'bdui-list-boundary-'));
  const executable = join(root, 'bd');
  await writeFile(executable, `#!/usr/bin/env bun
if (process.env.FAKE_MODE === 'failure') {
  process.stderr.write('fixture list failure');
  process.exit(7);
}
process.stdout.write('{not-json');
`);
  await chmod(executable, 0o755);
  const env = {
    PATH: `${root}${delimiter}${process.env.PATH ?? ''}`,
    FAKE_MODE: mode,
  };
  return {
    root,
    readJson: (args: readonly string[], cwd: string) => readBdJson(args, cwd, { env }),
  };
}

test('mutations pass user values as argv and use current create, update, and close commands', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bdui-commands-'));
  const repo = join(root, 'repo');
  const home = join(root, 'home');
  const marker = join(root, 'shell-was-used');
  const originalCwd = process.cwd();
  const env = {
    HOME: home,
    XDG_CONFIG_HOME: join(home, '.config'),
    BD_NON_INTERACTIVE: '1',
  };

  try {
    await mkdir(repo);
    await mkdir(home);
    run(['git', 'init', '--quiet'], repo, env);
    run(['bd', 'init', '--non-interactive', '--stealth', '--skip-agents', '--prefix', 'argv'], repo, env);
    process.chdir(repo);

    const title = `Literal title; touch ${marker}`;
    const id = await createIssue({
      title,
      description: 'spaces and $(commands) stay literal',
      priority: 1,
      issueType: 'task',
      labels: ['adapter-test'],
    });
    await updateIssue({ id, title: 'Updated | still literal', description: 'new value; echo nope', priority: 2 });

    const openData = await loadBeads(join(repo, '.beads'));
    expect(openData.byId.get(id)).toEqual(expect.objectContaining({
      title: 'Updated | still literal',
      description: 'new value; echo nope',
      priority: 2,
      status: 'open',
    }));
    await expect(access(marker)).rejects.toThrow();

    await closeIssue(id, 'adapter test complete');
    expect((await loadBeads(join(repo, '.beads'))).byId.get(id)?.status).toBe('closed');
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('getAssignees propagates an actionable bd list command failure', async () => {
  const fake = await fakeListBoundary('failure');
  try {
    await expect(getAssignees({ readJson: fake.readJson })).rejects.toThrow(
      'bd list failed: fixture list failure',
    );
  } finally {
    await rm(fake.root, { recursive: true, force: true });
  }
});

test('getLabels propagates malformed bd list JSON', async () => {
  const fake = await fakeListBoundary('malformed');
  try {
    await expect(getLabels({ readJson: fake.readJson })).rejects.toThrow(
      'bd list returned invalid JSON',
    );
  } finally {
    await rm(fake.root, { recursive: true, force: true });
  }
});
