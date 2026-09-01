import { expect, test } from 'bun:test';
import type { BeadsData } from '../types';
import { normalizeBeads } from './parser';
import { BeadsWatcher } from './watcher';

function data(title: string): BeadsData {
  return normalizeBeads([{ id: 'issue-1', title, status: 'open', issue_type: 'task', priority: 2 }]);
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test('reloads serialize, retain last-good data on errors, and suppress unchanged snapshots', async () => {
  const first = data('first');
  const second = data('second');
  const outcomes: Array<BeadsData | Error> = [first, second, second, new Error('temporary failure')];
  let active = 0;
  let maxActive = 0;
  let calls = 0;
  const errors: unknown[] = [];

  const watcher = new BeadsWatcher('.beads', {
    load: async () => {
      calls++;
      active++;
      maxActive = Math.max(maxActive, active);
      await wait(5);
      active--;
      const outcome = outcomes.shift();
      if (outcome instanceof Error) throw outcome;
      if (!outcome) throw new Error('unexpected load');
      return outcome;
    },
    onError: (error) => errors.push(error),
  });
  const titles: string[] = [];
  watcher.subscribe((snapshot) => titles.push(snapshot.issues[0].title));

  const firstReload = watcher.reload();
  const queuedReload = watcher.reload();
  await Promise.all([firstReload, queuedReload]);
  expect(calls).toBe(2);
  expect(maxActive).toBe(1);
  expect(titles).toEqual(['first', 'second']);

  await watcher.reload();
  expect(titles).toEqual(['first', 'second']);

  await watcher.reload();
  expect(errors).toHaveLength(1);
  expect(watcher.getLastGoodData()).toBe(second);
  expect(titles).toEqual(['first', 'second']);
});

test('stop discards an in-flight result', async () => {
  const snapshot = data('late');
  let complete!: (data: BeadsData) => void;
  const watcher = new BeadsWatcher('.beads', {
    load: () => new Promise((resolve) => {
      complete = resolve;
    }),
  });
  const published: BeadsData[] = [];
  watcher.subscribe((data) => published.push(data));

  const reload = watcher.reload();
  watcher.stop();
  complete(snapshot);
  await reload;

  expect(published).toEqual([]);
  expect(watcher.getLastGoodData()).toBeNull();
});
