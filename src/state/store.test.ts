import { beforeEach, expect, test } from 'bun:test';
import { normalizeBeads } from '../bd/parser';
import { useBeadsStore } from './store';

function data() {
  return normalizeBeads([
    { id: 'issue-hidden', title: 'Hidden card', status: 'open', issue_type: 'task', priority: 2 },
    { id: 'issue-visible', title: 'Visible target', status: 'open', issue_type: 'bug', priority: 1 },
    { id: 'issue-third', title: 'Third card', status: 'open', issue_type: 'task', priority: 3 },
  ]);
}

beforeEach(() => {
  useBeadsStore.setState({
    data: normalizeBeads([]),
    previousIssues: new Map(),
    selectedColumn: 0,
    columnStates: {
      open: { selectedIndex: 0, scrollOffset: 0 },
      in_progress: { selectedIndex: 0, scrollOffset: 0 },
      blocked: { selectedIndex: 0, scrollOffset: 0 },
      closed: { selectedIndex: 0, scrollOffset: 0 },
    },
    itemsPerPage: 1,
    searchQuery: '',
    filter: {},
    viewMode: 'kanban',
    previousView: 'kanban',
    showExportDialog: false,
    notificationsEnabled: false,
  });
});

test('the filtered visible card is the selected edit and export target', () => {
  let store = useBeadsStore.getState();
  store.setData(data());
  store.moveDown();
  expect(useBeadsStore.getState().columnStates.open).toEqual({ selectedIndex: 1, scrollOffset: 1 });

  useBeadsStore.getState().setSearchQuery('visible target');
  store = useBeadsStore.getState();

  expect(store.getVisibleColumns().open.map(issue => issue.id)).toEqual(['issue-visible']);
  expect(store.columnStates.open).toEqual({ selectedIndex: 0, scrollOffset: 0 });
  expect(store.getSelectedIssue()?.id).toBe('issue-visible');

  store.navigateToEditIssue();
  expect(useBeadsStore.getState().getSelectedIssue()?.id).toBe('issue-visible');
  useBeadsStore.getState().toggleExportDialog();
  expect(useBeadsStore.getState().getSelectedIssue()?.id).toBe('issue-visible');
});

test('navigation and pagination cannot exceed the filtered column', () => {
  let store = useBeadsStore.getState();
  store.setData(data());
  store.setFilter({ priority: 1 });

  store = useBeadsStore.getState();
  store.moveDown();
  store.moveDown();
  store.jumpToLast();
  store.jumpToPage(99);

  const current = useBeadsStore.getState();
  expect(current.getVisibleColumns().open).toHaveLength(1);
  expect(current.columnStates.open).toEqual({ selectedIndex: 0, scrollOffset: 0 });
  expect(current.getSelectedIssue()?.id).toBe('issue-visible');
  expect(current.getTotalPages()).toBe(1);
});

test('global ID selection clears filters so the selected issue remains visible', () => {
  const store = useBeadsStore.getState();
  store.setData(data());
  store.setSearchQuery('visible target');

  expect(useBeadsStore.getState().selectIssueById('issue-third')).toBe(true);
  const selected = useBeadsStore.getState();
  expect(selected.searchQuery).toBe('');
  expect(selected.filter).toEqual({});
  expect(selected.getSelectedIssue()?.id).toBe('issue-third');
});
