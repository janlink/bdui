import { beforeEach, expect, test } from 'bun:test';
import React from 'react';
import { Readable, Writable } from 'node:stream';
import { render } from 'ink';
import { normalizeBeads } from '../bd/parser';
import { DEFAULT_STATUS_VISIBILITY } from '../utils/visibility';
import { useBeadsStore } from '../state/store';
import { SearchInput } from './SearchInput';

// Drive the mounted search box through real stdin bytes: the reported bug was
// keystrokes reaching a component that was never mounted, so the guarantee
// worth testing is that typed characters land in the query and nothing else.
async function typeIntoSearch(keys: string[]): Promise<string> {
  const stdout = new Writable({
    write(_chunk, _encoding, callback) { callback(); },
  }) as NodeJS.WriteStream;
  Object.assign(stdout, { columns: 80, rows: 10, isTTY: true });
  const stdin = new Readable({ read() {} }) as NodeJS.ReadStream;
  Object.assign(stdin, {
    isTTY: true,
    isRaw: false,
    setRawMode(mode: boolean) { this.isRaw = mode; return this; },
    ref() { return this; },
    unref() { return this; },
  });

  const instance = render(<SearchInput />, {
    stdout,
    stdin,
    debug: true,
    patchConsole: false,
  });

  for (const key of keys) {
    stdin.push(key);
    await new Promise<void>(resolve => setTimeout(resolve, 5));
  }

  instance.unmount();
  return useBeadsStore.getState().searchQuery;
}

const data = normalizeBeads([
  { id: 'query', title: 'Queue work', status: 'open', issue_type: 'task', priority: 2 },
]);

beforeEach(() => {
  useBeadsStore.setState({
    data,
    previousIssues: new Map(data.byId),
    searchQuery: '',
    filter: {},
    showSearch: true,
    statusVisibility: { ...DEFAULT_STATUS_VISIBILITY },
    notificationsEnabled: false,
  });
});

test('typing builds up the query', async () => {
  expect(await typeIntoSearch(['q', 'u', 'e'])).toBe('que');
});

test('shortcut characters are accepted as query text', async () => {
  expect(await typeIntoSearch(['q', '?', 'f', '/'])).toBe('q?f/');
});

test('backspace removes the last character', async () => {
  expect(await typeIntoSearch(['a', 'b', ''])).toBe('a');
});

test('escape closes the search box', async () => {
  await typeIntoSearch(['a', '']);
  expect(useBeadsStore.getState().showSearch).toBe(false);
});
