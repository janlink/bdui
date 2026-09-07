import { expect, test } from 'bun:test';
import { normalizeBeads } from '../bd/parser';
import { buildVisibleTree, flattenList, flattenTree } from './tree';
import { computeVisibleIds, DEFAULT_STATUS_VISIBILITY } from './visibility';
import type { FlatNode } from './tree';

// epic ─┬─ epic.a ── epic.a1
//       └─ epic.b
function sampleTree() {
  const data = normalizeBeads([
    { id: 'epic', title: 'Epic', status: 'open', issue_type: 'epic', priority: 1 },
    { id: 'epic.a', title: 'A', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'epic.a', depends_on_id: 'epic', type: 'parent-child' }] },
    { id: 'epic.a1', title: 'A1', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'epic.a1', depends_on_id: 'epic.a', type: 'parent-child' }] },
    { id: 'epic.b', title: 'B', status: 'open', issue_type: 'task', priority: 2,
      dependencies: [{ issue_id: 'epic.b', depends_on_id: 'epic', type: 'parent-child' }] },
  ]);
  const visibleIds = computeVisibleIds(data, DEFAULT_STATUS_VISIBILITY);
  return buildVisibleTree(data, visibleIds);
}

const ids = (nodes: FlatNode[]) => nodes.map(n => n.issue.id);
const byId = (nodes: FlatNode[], id: string) => nodes.find(n => n.issue.id === id)!;

test('flattenList marks parents, leaves, and parent ids', () => {
  const flat = flattenList(sampleTree());

  expect(new Set(ids(flat))).toEqual(new Set(['epic', 'epic.a', 'epic.a1', 'epic.b']));
  expect(byId(flat, 'epic').hasChildren).toBe(true);
  expect(byId(flat, 'epic.a').hasChildren).toBe(true);
  expect(byId(flat, 'epic.a1').hasChildren).toBe(false);

  expect(byId(flat, 'epic').parentId).toBe(null);
  expect(byId(flat, 'epic.a').parentId).toBe('epic');
  expect(byId(flat, 'epic.a1').parentId).toBe('epic.a');
  expect(byId(flat, 'epic.b').parentId).toBe('epic');

  // Parents precede their children.
  expect(ids(flat).indexOf('epic')).toBeLessThan(ids(flat).indexOf('epic.a'));
  expect(ids(flat).indexOf('epic.a')).toBeLessThan(ids(flat).indexOf('epic.a1'));
});

test('collapsing the root hides every descendant but keeps the root', () => {
  const flat = flattenList(sampleTree(), new Set(['epic']));

  expect(ids(flat)).toEqual(['epic']);
  expect(byId(flat, 'epic').collapsed).toBe(true);
  expect(byId(flat, 'epic').hasChildren).toBe(true);
});

test('collapsing an inner node hides only its subtree', () => {
  const flat = flattenList(sampleTree(), new Set(['epic.a']));

  expect(new Set(ids(flat))).toEqual(new Set(['epic', 'epic.a', 'epic.b']));
  expect(ids(flat)).not.toContain('epic.a1');
  expect(byId(flat, 'epic.a').collapsed).toBe(true);
  expect(byId(flat, 'epic.b').collapsed).toBe(false);
});

test('flattenTree honours the collapsed set the same way', () => {
  const full = flattenTree(sampleTree());
  expect(new Set(ids(full))).toEqual(new Set(['epic', 'epic.a', 'epic.a1', 'epic.b']));

  const collapsed = flattenTree(sampleTree(), new Set(['epic.a']));
  expect(ids(collapsed)).not.toContain('epic.a1');
  expect(byId(collapsed, 'epic.a').hasChildren).toBe(true);
  expect(byId(collapsed, 'epic.a').collapsed).toBe(true);
});
