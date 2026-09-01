import { expect, test } from 'bun:test';
import { getTheme } from '../themes/themes';
import { getPriorityColor, PRIORITY_LABELS } from './constants';

test('Beads priority labels and colors run from P0 Critical through P4 Backlog', () => {
  expect([0, 1, 2, 3, 4].map(priority => `P${priority} ${PRIORITY_LABELS[priority]}`)).toEqual([
    'P0 Critical',
    'P1 High',
    'P2 Medium',
    'P3 Low',
    'P4 Backlog',
  ]);

  const theme = getTheme('default');
  expect([0, 1, 2, 3, 4].map(priority => getPriorityColor(priority, theme))).toEqual([
    theme.colors.priorityCritical,
    theme.colors.priorityHigh,
    theme.colors.priorityMedium,
    theme.colors.priorityLow,
    theme.colors.priorityLowest,
  ]);
});
