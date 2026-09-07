import { expect, test } from 'bun:test';
import React from 'react';
import { Readable, Writable } from 'node:stream';
import { Box, render } from 'ink';
import stringWidth from 'string-width';
import { normalizeBeads } from '../bd/parser';
import { getTheme } from '../themes/themes';
import { buildVisibleTree, flattenList, flattenTree } from '../utils/tree';
import { ListRow, TreeRow } from './IssueRow';
import type { TreeNode } from '../utils/tree';

const ANSI = /\u001B\[[0-9;?]*[A-Za-z]/g;

// Ink writes cursor escapes and the frame as separate chunks, and unmounting
// emits a second frame. Only the first chunk carrying text is one full frame.
async function renderLines(node: React.ReactNode, columns: number): Promise<string[]> {
  const chunks: string[] = [];
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  }) as NodeJS.WriteStream;
  Object.assign(stdout, { columns, rows: 30, isTTY: true });
  const stdin = new Readable({ read() {} }) as NodeJS.ReadStream;
  Object.assign(stdin, {
    isTTY: true,
    isRaw: false,
    setRawMode(mode: boolean) { this.isRaw = mode; return this; },
    ref() { return this; },
    unref() { return this; },
  });

  await new Promise<void>((resolve) => {
    let instance: ReturnType<typeof render>;
    instance = render(node, {
      stdout,
      stdin,
      debug: true,
      patchConsole: false,
      onRender: () => queueMicrotask(() => {
        instance.unmount();
        resolve();
      }),
    });
  });

  const frame = chunks.map(chunk => chunk.replace(ANSI, '')).find(chunk => chunk.trim().length > 0);
  if (frame === undefined) throw new Error('render produced no frame');
  return frame.split('\n').filter(line => line.length > 0);
}

const data = normalizeBeads([
  { id: 'bd-0001', title: 'Root epic whose title is far too long to fit into a narrow terminal window', status: 'open', issue_type: 'epic', priority: 1 },
  { id: 'bd-0002', title: '日本語のタイトルは全角文字なので表示幅が二倍になる', status: 'in_progress', issue_type: 'task', priority: 2,
    dependencies: [{ issue_id: 'bd-0002', depends_on_id: 'bd-0001', type: 'parent-child' }] },
  { id: 'bd-0003', title: 'Short one 🚀', status: 'open', issue_type: 'bug', priority: 3,
    dependencies: [
      { issue_id: 'bd-0003', depends_on_id: 'bd-0001', type: 'parent-child' },
      { issue_id: 'bd-0003', depends_on_id: 'bd-0004', type: 'blocks' },
    ] },
  { id: 'bd-0004', title: 'Blocker', status: 'open', issue_type: 'task', priority: 0 },
]);

const tree: TreeNode[] = buildVisibleTree(data, new Set(data.issues.map(issue => issue.id)));
const theme = getTheme('default');

for (const width of [40, 60, 120]) {
  test(`list rows stay inside a ${width}-column terminal`, async () => {
    const nodes = flattenList(tree);
    const lines = await renderLines(
      <Box flexDirection="column" width={width}>
        {nodes.map((node, idx) => (
          <ListRow key={node.issue.id} node={node} isSelected={idx === 1} theme={theme} width={width} />
        ))}
      </Box>,
      width,
    );

    expect(lines).toHaveLength(nodes.length);
    for (const line of lines) expect(stringWidth(line)).toBeLessThanOrEqual(width);
  });

  test(`tree rows stay inside a ${width}-column terminal`, async () => {
    const nodes = flattenTree(tree);
    const lines = await renderLines(
      <Box flexDirection="column" width={width}>
        {nodes.map((node, idx) => (
          <TreeRow key={node.issue.id} node={node} isSelected={idx === 1} theme={theme} width={width} />
        ))}
      </Box>,
      width,
    );

    expect(lines).toHaveLength(nodes.length);
    for (const line of lines) expect(stringWidth(line)).toBeLessThanOrEqual(width);
  });
}

test('list row truncates an oversized title with an ellipsis', async () => {
  const nodes = flattenList(tree);
  const lines = await renderLines(
    <Box flexDirection="column" width={60}>
      {nodes.map(node => (
        <ListRow key={node.issue.id} node={node} isSelected={false} theme={theme} width={60} />
      ))}
    </Box>,
    60,
  );

  expect(lines[0]).toContain('Root epic whose title');
  expect(lines[0]!.endsWith('…')).toBe(true);
  expect(lines[0]).not.toContain('narrow terminal window');
});

test('wide-character title is truncated on display width, not code units', async () => {
  const cjk = flattenList(tree).find(node => node.issue.id === 'bd-0002')!;
  const lines = await renderLines(
    <Box flexDirection="column" width={44}>
      <ListRow node={cjk} isSelected={false} theme={theme} width={44} />
    </Box>,
    44,
  );

  expect(lines[0]).toContain('日本語');
  expect(lines[0]!.endsWith('…')).toBe(true);
  expect(stringWidth(lines[0]!)).toBeLessThanOrEqual(44);
});

test('tree row keeps the meta column flush right', async () => {
  const width = 110;
  const nodes = flattenTree(tree);
  const lines = await renderLines(
    <Box flexDirection="column" width={width}>
      {nodes.map(node => (
        <TreeRow key={node.issue.id} node={node} isSelected={false} theme={theme} width={width} />
      ))}
    </Box>,
    width,
  );

  for (const [idx, node] of nodes.entries()) {
    const line = lines[idx]!;
    expect(line).toContain(node.issue.id);
    // The blocked marker occupies four cells at the right edge; unblocked rows
    // pad it with spaces, which Ink trims off the end of every frame line.
    const trimmedMarker = node.issue.blockedBy?.length ? 0 : 4;
    expect(stringWidth(line) + trimmedMarker).toBe(width);
  }

  const blocked = nodes.findIndex(node => node.issue.blockedBy?.length);
  expect(blocked).toBeGreaterThanOrEqual(0);
  expect(lines[blocked]!.endsWith('[!]')).toBe(true);
});
