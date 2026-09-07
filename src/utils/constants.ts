// Shared constants for colors, labels, and layout values
// This centralizes all the color/label mappings to ensure consistency

import { getTheme, type Theme } from '../themes/themes';

// Layout constants
export const LAYOUT = {
  columnWidth: 37,
  detailPanelWidth: 55,
  uiOverhead: 17,
  issueCardHeight: 8,
  titleMaxLength: 32,
  descriptionMaxLength: 200,
  minTerminalWidth: 60,
  minTerminalHeight: 20,
} as const;

// Rows the shared chrome above a view occupies when open. Each value covers the
// component's own content plus its border and bottom margin, so a view can
// subtract them to size its scrollable body.
export const CHROME_HEIGHT = {
  filtersBanner: 4,
  searchInput: 5,
  filterPanel: 16,
  commandBar: 3,
} as const;

// Beads priorities (0 is most urgent, 4 is backlog)
export const PRIORITY_LABELS: Record<number, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Backlog',
};

// Status labels
export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  closed: 'Closed',
  other: 'Other',
};

// Issue type labels
export const TYPE_LABELS: Record<string, string> = {
  epic: 'Epic',
  feature: 'Feature',
  bug: 'Bug',
  task: 'Task',
  chore: 'Chore',
  decision: 'Decision',
};

// View names for footer display
export const VIEW_NAMES: Record<string, string> = {
  kanban: 'Kanban',
  tree: 'Tree',
  graph: 'Graph',
  stats: 'Stats',
  list: 'List',
};

// Helper function to get priority color from theme
export function getPriorityColor(priority: number, theme: Theme): string {
  const colors: Record<number, string> = {
    0: theme.colors.priorityCritical,
    1: theme.colors.priorityHigh,
    2: theme.colors.priorityMedium,
    3: theme.colors.priorityLow,
    4: theme.colors.priorityLowest,
  };
  return colors[priority] || theme.colors.textDim;
}

// Helper function to get status color from theme
export function getStatusColor(status: string, theme: Theme): string {
  const colors: Record<string, string> = {
    open: theme.colors.statusOpen,
    in_progress: theme.colors.statusInProgress,
    blocked: theme.colors.statusBlocked,
    closed: theme.colors.statusClosed,
    other: theme.colors.textDim,
  };
  return colors[status] || theme.colors.text;
}

// Helper function to get type color from theme
export function getTypeColor(type: string, theme: Theme): string {
  const colors: Record<string, string> = {
    epic: theme.colors.typeEpic,
    feature: theme.colors.typeFeature,
    bug: theme.colors.typeBug,
    task: theme.colors.typeTask,
    chore: theme.colors.typeChore,
    decision: theme.colors.accent,
  };
  return colors[type] || theme.colors.text;
}

// Truncate text with ellipsis, optionally at word boundary
export function truncateText(
  text: string,
  maxLength: number,
  atWordBoundary: boolean = false
): string {
  if (text.length <= maxLength) return text;

  let truncated = text.substring(0, maxLength);

  if (atWordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.5) {
      truncated = truncated.substring(0, lastSpace);
    }
  }

  return truncated.trimEnd() + '...';
}

// Check if filters are active
export function hasActiveFilters(filter: {
  assignee?: string;
  tags?: string[];
  status?: string;
  priority?: number;
}, searchQuery: string): boolean {
  return !!(
    searchQuery.trim() ||
    filter.assignee ||
    filter.status ||
    filter.priority !== undefined ||
    (filter.tags && filter.tags.length > 0)
  );
}

// Count active filters
export function countActiveFilters(filter: {
  assignee?: string;
  tags?: string[];
  status?: string;
  priority?: number;
}, searchQuery: string): number {
  let count = 0;
  if (searchQuery.trim()) count++;
  if (filter.assignee) count++;
  if (filter.status) count++;
  if (filter.priority !== undefined) count++;
  if (filter.tags && filter.tags.length > 0) count++;
  return count;
}

// Form validation rules
export const VALIDATION = {
  title: {
    minLength: 1,
    maxLength: 200,
    required: true,
  },
  description: {
    maxLength: 5000,
    required: false,
  },
  assignee: {
    maxLength: 100,
    required: false,
  },
  labels: {
    maxLength: 500,
    required: false,
  },
} as const;

// Validate title
export function validateTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: false, error: 'Title is required' };
  }
  if (trimmed.length > VALIDATION.title.maxLength) {
    return { valid: false, error: `Title must be under ${VALIDATION.title.maxLength} characters` };
  }
  return { valid: true };
}
