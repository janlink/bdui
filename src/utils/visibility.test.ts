import { expect, test } from 'bun:test';
import { normalizeBeads } from '../bd/parser';
import { computeVisibleIds, DEFAULT_STATUS_VISIBILITY } from './visibility';

test('default visibility keeps a closed child of an open epic but hides closed top-level work', () => {
  const data = normalizeBeads([
    { id: 'epic', title: 'Open epic', status: 'open', issue_type: 'epic', priority: 1 },
    { id: 'epic.done', title: 'Closed child', status: 'closed', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'epic.done', depends_on_id: 'epic', type: 'parent-child' }] },
    { id: 'epic.todo', title: 'Open child', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'epic.todo', depends_on_id: 'epic', type: 'parent-child' }] },
    { id: 'lone', title: 'Closed standalone', status: 'closed', issue_type: 'task', priority: 2 },
  ]);

  const visible = computeVisibleIds(data, DEFAULT_STATUS_VISIBILITY);

  expect(visible.has('epic')).toBe(true);
  expect(visible.has('epic.done')).toBe(true);
  expect(visible.has('epic.todo')).toBe(true);
  expect(visible.has('lone')).toBe(false);
});

test('a closed epic and its closed children are hidden entirely', () => {
  const data = normalizeBeads([
    { id: 'epic', title: 'Closed epic', status: 'closed', issue_type: 'epic', priority: 1 },
    { id: 'epic.child', title: 'Closed child', status: 'closed', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'epic.child', depends_on_id: 'epic', type: 'parent-child' }] },
  ]);

  const visible = computeVisibleIds(data, DEFAULT_STATUS_VISIBILITY);

  expect(visible.size).toBe(0);
});

test('toggling closed on reveals everything', () => {
  const data = normalizeBeads([
    { id: 'a', title: 'Closed', status: 'closed', issue_type: 'task', priority: 2 },
    { id: 'b', title: 'Open', status: 'open', issue_type: 'task', priority: 2 },
  ]);

  const visible = computeVisibleIds(data, { ...DEFAULT_STATUS_VISIBILITY, closed: true });

  expect(visible.has('a')).toBe(true);
  expect(visible.has('b')).toBe(true);
});
