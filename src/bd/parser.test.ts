import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findBeadsDir, loadBeads, normalizeBeads } from './parser';

const run = (command: string[], cwd: string, env: Record<string, string>) => {
  const result = Bun.spawnSync(command, { cwd, env: { ...process.env, ...env } });
  if (result.exitCode !== 0) {
    throw new Error(`${command.join(' ')} failed:\n${result.stderr.toString()}`);
  }
};

test('loadBeads loads an issue from a current embedded-Dolt workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bdui-current-beads-'));
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
    run(['bd', 'init', '--non-interactive', '--stealth', '--skip-agents', '--prefix', 'regression'], repo, env);
    run([
      'bd', 'create', 'Embedded Dolt regression sentinel',
      '--priority', '1', '--labels', 'loader-regression', '--json',
    ], repo, env);

    expect(await realpath((await findBeadsDir(repo))!)).toBe(await realpath(join(repo, '.beads')));
    const data = await loadBeads(join(repo, '.beads'));

    expect(data.issues).toContainEqual(expect.objectContaining({
      title: 'Embedded Dolt regression sentinel',
      priority: 1,
      labels: expect.arrayContaining(['loader-regression']),
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('normalizeBeads preserves future values and derives dependency relationships in a second pass', () => {
  const data = normalizeBeads([
    {
      id: 'child', title: 'Child', status: 'hooked', issue_type: 'decision', priority: '3',
      dependencies: [
        { issue_id: 'child', depends_on_id: 'parent', type: 'parent-child', metadata: '{"raw":true}' },
        { issue_id: 'child', depends_on_id: 'blocker', type: 'blocks' },
        { issue_id: 'child', depends_on_id: 'other', type: 'future-edge' },
      ],
    },
    { id: 'parent', title: 'Parent', status: 'open', issue_type: 'epic', priority: 1 },
    { id: 'blocker', title: 'Blocker', status: 'open', issue_type: 'bug', priority: 0 },
    {
      id: 'blocked-child', title: 'Blocked child', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'blocked-child', depends_on_id: 'blocker', type: 'blocks' }],
    },
  ]);

  const child = data.byId.get('child')!;
  expect(child.status).toBe('hooked');
  expect(child.issue_type).toBe('decision');
  expect(child.dependencies[0]).toEqual(expect.objectContaining({
    type: 'parent-child',
    metadata: '{"raw":true}',
  }));
  expect(child.parent).toBe('parent');
  expect(child.blockedBy).toEqual(['blocker']);
  expect(data.byId.get('parent')?.children).toEqual(['child']);
  expect(data.byId.get('blocker')?.blocks).toEqual(['child', 'blocked-child']);
  expect(data.byStatus.hooked).toEqual([child]);
  expect(data.byId.get('blocked-child')).toEqual(expect.objectContaining({
    status: 'open',
    displayStatus: 'blocked',
  }));
  expect(data.byStatus.blocked.map((issue) => issue.id)).toContain('blocked-child');
});
