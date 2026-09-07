import { expect, test } from 'bun:test';
import { normalizeBeads } from '../bd/parser';
import { computeVisibleIds, withAncestors, DEFAULT_STATUS_VISIBILITY } from './visibility';

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

test('ancestor context skips a disallowed parent but keeps the grandparent', () => {
  const data = normalizeBeads([
    { id: 'top', title: 'Grandparent', status: 'open', issue_type: 'epic', priority: 1 },
    { id: 'top.mid', title: 'Parent', status: 'closed', issue_type: 'epic', priority: 2,
      dependencies: [{ issue_id: 'top.mid', depends_on_id: 'top', type: 'parent-child' }] },
    { id: 'top.mid.leaf', title: 'Match', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'top.mid.leaf', depends_on_id: 'top.mid', type: 'parent-child' }] },
  ]);

  const allowed = new Set(['top', 'top.mid.leaf']);
  const visible = withAncestors(data, new Set(['top.mid.leaf']), allowed);

  expect([...visible].sort()).toEqual(['top', 'top.mid.leaf']);
});

test('ancestor context terminates on a parent cycle', () => {
  const data = normalizeBeads([
    { id: 'a', title: 'A', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'a', depends_on_id: 'b', type: 'parent-child' }] },
    { id: 'b', title: 'B', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'b', depends_on_id: 'a', type: 'parent-child' }] },
  ]);

  const visible = withAncestors(data, new Set(['a']), new Set(['a', 'b']));

  expect([...visible].sort()).toEqual(['a', 'b']);
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
