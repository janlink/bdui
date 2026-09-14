import { expect, test } from 'bun:test';
import type { Issue } from '../types';
import {
  parseSearchQuery,
  issueMatchesParsedQuery,
  hasQueryTerms,
} from './search-query';

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: 'bd-1',
    title: 'Title',
    description: '',
    status: 'open',
    displayStatus: 'open',
    priority: 2,
    issue_type: 'task',
    created_at: '',
    updated_at: '',
    dependencies: [],
    ...overrides,
  };
}

test('structured tokens are split from the free-text words', () => {
  const parsed = parseSearchQuery('type:Bug label:MARDI-gras p1 render hot');
  expect(parsed.types).toEqual(['bug']);
  expect(parsed.labels).toEqual(['mardi-gras']);
  expect(parsed.priorities).toEqual([1]);
  expect(parsed.terms).toEqual(['render', 'hot']);
});

test('priority accepts both p0-p4 shorthand and priority: form', () => {
  expect(parseSearchQuery('p0').priorities).toEqual([0]);
  expect(parseSearchQuery('priority:4').priorities).toEqual([4]);
  expect(parseSearchQuery('priority:9').priorities).toEqual([]); // out of range ignored
  expect(parseSearchQuery('p5').terms).toEqual(['p5']); // not a valid shorthand -> free text
});

test('dangling structured keys contribute nothing', () => {
  const parsed = parseSearchQuery('type: label:');
  expect(parsed.types).toEqual([]);
  expect(parsed.labels).toEqual([]);
  expect(hasQueryTerms(parsed)).toBe(false);
});

test('free-text words match as substrings, not subsequences', () => {
  const t = issue({ id: 'kap-3k8', title: 'AANA-1075-Regression messen' });
  expect(issueMatchesParsedQuery(t, parseSearchQuery('aana-1075'))).toBe(true);
  // a scattered subsequence must NOT match (the over-permissive old behavior)
  const noise = issue({ id: 'kap-qi0', title: 'A5: merged 1007 rows' });
  expect(issueMatchesParsedQuery(noise, parseSearchQuery('aana-1075'))).toBe(false);
});

test('structured facets are ANDed across categories, ORed within one', () => {
  const bug = issue({ issue_type: 'bug', priority: 1, labels: ['ui'] });
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:bug p1'))).toBe(true);
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:bug p2'))).toBe(false);
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:task type:bug'))).toBe(true);
});

test('type matching is exact and case-insensitive, not substring', () => {
  const bug = issue({ issue_type: 'bug' });
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:BUG'))).toBe(true);
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:bu'))).toBe(false);
});

test('free-text searches across id, title, assignee, notes and labels', () => {
  const target = issue({
    id: 'bd-42',
    title: 'Wire up the widget',
    assignee: 'janlink',
    notes: 'depends on the loader',
    labels: ['backend'],
  });
  expect(issueMatchesParsedQuery(target, parseSearchQuery('widget'))).toBe(true);
  expect(issueMatchesParsedQuery(target, parseSearchQuery('janlink'))).toBe(true);
  expect(issueMatchesParsedQuery(target, parseSearchQuery('loader'))).toBe(true);
  expect(issueMatchesParsedQuery(target, parseSearchQuery('backend'))).toBe(true);
  expect(issueMatchesParsedQuery(target, parseSearchQuery('zzq'))).toBe(false);
});

test('multiple free-text words are ANDed', () => {
  const bug = issue({ title: 'broken login flow' });
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('broken login'))).toBe(true);
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('broken missing'))).toBe(false);
});

test('tokens and free-text combine with AND', () => {
  const bug = issue({ issue_type: 'bug', title: 'broken login' });
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:bug login'))).toBe(true);
  expect(issueMatchesParsedQuery(bug, parseSearchQuery('type:task login'))).toBe(false);
});
