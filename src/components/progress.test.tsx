import { afterEach, beforeEach, expect, test } from 'bun:test';
import React from 'react';
import { Readable, Writable } from 'node:stream';
import { render } from 'ink';
import { normalizeBeads } from '../bd/parser';
import { useBeadsStore } from '../state/store';
import { Board } from './Board';
import { DetailPanel } from './DetailPanel';
import { IssueCard } from './IssueCard';

async function renderText(node: React.ReactNode, columns = 120, rows = 30): Promise<string> {
  let output = '';
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  }) as NodeJS.WriteStream;
  Object.assign(stdout, { columns, rows, isTTY: true });
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
  return output;
}

const issues = normalizeBeads([
  { id: 'parent', title: 'Parent work', status: 'open', issue_type: 'epic', priority: 1 },
  { id: 'closed-child', title: 'Done', status: 'closed', issue_type: 'task', priority: 2,
    dependencies: [{ issue_id: 'closed-child', depends_on_id: 'parent', type: 'parent-child' }] },
  { id: 'open-child', title: 'Not done', status: 'open', issue_type: 'task', priority: 2,
    dependencies: [{ issue_id: 'open-child', depends_on_id: 'parent', type: 'parent-child' }] },
  { id: 'blocked-child', title: 'Also not done', status: 'blocked', issue_type: 'task', priority: 2,
    dependencies: [{ issue_id: 'blocked-child', depends_on_id: 'parent', type: 'parent-child' }] },
]);

beforeEach(() => {
  useBeadsStore.setState({
    data: issues,
    previousIssues: new Map(issues.byId),
    selectedColumn: 0,
    columnStates: {
      open: { selectedIndex: 0, scrollOffset: 0 },
      in_progress: { selectedIndex: 0, scrollOffset: 0 },
      blocked: { selectedIndex: 0, scrollOffset: 0 },
      closed: { selectedIndex: 0, scrollOffset: 0 },
      other: { selectedIndex: 0, scrollOffset: 0 },
    },
    itemsPerPage: 1,
    viewMode: 'kanban',
    showDetails: false,
    showHelp: false,
    searchQuery: '',
    filter: {},
    notificationsEnabled: false,
  });
});

afterEach(() => useBeadsStore.setState({ showDetails: false }));

test('parent card progress counts only closed direct children', async () => {
  const output = await renderText(<IssueCard issue={issues.byId.get('parent')!} />);
  expect(output).toMatch(/1\s*\/\s*3/);
});

test('leaf card has no numeric progress', async () => {
  const output = await renderText(<IssueCard issue={issues.byId.get('open-child')!} />);
  expect(output).not.toMatch(/\d+\s*\/\s*\d+/);
});

test('single-child progress uses singular copy in details', async () => {
  const singleChildData = normalizeBeads([
    { id: 'single-parent', title: 'Single parent', status: 'open', issue_type: 'epic', priority: 1 },
    { id: 'single-child', title: 'Done', status: 'closed', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'single-child', depends_on_id: 'single-parent', type: 'parent-child' }] },
  ]);

  const output = await renderText(<DetailPanel issue={singleChildData.byId.get('single-parent')!} />);
  expect(output).toContain('1/1 child closed (100%)');
  expect(output).not.toContain('1/1 children closed');
});

test('details replace the board at the minimum supported width', async () => {
  useBeadsStore.setState({ terminalWidth: 60, terminalHeight: 30, showDetails: true });
  const output = await renderText(<Board />, 60, 30);

  expect(output).toMatch(/parent work/i);
  expect(output).toContain('Type:');
  expect(output).not.toContain('Terminal too narrow for detail panel');
});

test('details preserve board context when both fit', async () => {
  useBeadsStore.setState({ terminalWidth: 250, terminalHeight: 30, showDetails: true });
  const output = await renderText(<Board />, 250, 30);

  expect(output).toMatch(/Open \(2\)/);
  expect(output).toContain('Type:');
});

test('minimum-height details show one complete line and paging control', async () => {
  const data = normalizeBeads([{
    id: 'short-panel', title: 'Short panel', status: 'open', issue_type: 'bug', priority: 1,
    description: `${'A'.repeat(47)}\nSECOND PAGE LINE`,
  }]);

  const output = await renderText(<DetailPanel issue={data.byId.get('short-panel')!} maxHeight={10} />, 60, 10);
  expect(output).toContain('A'.repeat(46));
  expect(output).not.toContain('A'.repeat(47));
  expect(output).not.toContain('SECOND PAGE LINE');
  expect(output).toContain('↓ more');
});

test('long wide title stays on one row without reducing the description page', async () => {
  const data = normalizeBeads([{
    id: 'long-title', title: '界'.repeat(40), status: 'open', issue_type: 'bug', priority: 1,
    description: 'FIRST VISIBLE ROW\nSECOND VISIBLE ROW',
  }]);

  const output = await renderText(<DetailPanel issue={data.byId.get('long-title')!} maxHeight={11} />, 60, 11);
  expect(output).toContain('FIRST VISIBLE ROW');
  expect(output).toContain('SECOND VISIBLE ROW');
  expect(output).toContain('…');
  expect(output).not.toContain('界'.repeat(40));
});

test('description stays visible before variable-height metadata', async () => {
  const data = normalizeBeads([{
    id: 'verbose', title: 'Verbose issue', status: 'blocked', issue_type: 'bug', priority: 1,
    description: 'DESCRIPTION MARKER ' + 'readable words '.repeat(20),
    labels: Array.from({ length: 20 }, (_, index) => `label-${index}`),
    dependencies: Array.from({ length: 12 }, (_, index) => ({
      issue_id: 'verbose', depends_on_id: `blocker-${index}`, type: 'blocks',
    })),
  }]);

  const output = await renderText(<DetailPanel issue={data.byId.get('verbose')!} maxHeight={20} />, 60, 20);
  expect(output).toContain('DESCRIPTION MARKER');
});

