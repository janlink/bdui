import React from 'react';
import { Text } from 'ink';
import stringWidth from 'string-width';
import { getTypeColor, getStatusColor, getPriorityColor } from '../utils/constants';
import type { Theme } from '../themes/themes';
import type { FlatNode } from '../utils/tree';
import type { Issue } from '../types';

// Ink tokenizes, wraps and slices every text node once per frame, so a row costs
// far less as a single text node with nested spans than as a Box of siblings.
// Rows are memoized on top of that: moving the cursor then redraws two rows
// instead of the whole window.

interface RowProps {
  node: FlatNode;
  isSelected: boolean;
  theme: Theme;
  width: number;
}

// bd list-style status glyphs. Blocked is a presentation status, so it wins
// over the raw status; everything else maps from the raw value.
export function statusGlyph(issue: Issue): string {
  if (issue.displayStatus === 'blocked') return '●';
  switch (issue.status) {
    case 'open': return '○';
    case 'in_progress': return '◐';
    case 'closed': return '✓';
    case 'deferred': return '❄';
    default: return '◇';
  }
}

// Truncate on display width, not code-unit length, so wide characters cannot
// push a row past the terminal edge.
function fitToWidth(text: string, width: number): string {
  if (width <= 0) return '';
  if (stringWidth(text) <= width) return text;

  let fitted = '';
  let used = 0;
  for (const character of text) {
    const characterWidth = stringWidth(character);
    if (used + characterWidth > width - 1) break;
    fitted += character;
    used += characterWidth;
  }
  return `${fitted}…`;
}

function ListRowImpl({ node, isSelected, theme, width }: RowProps) {
  const { issue } = node;
  const glyph = statusGlyph(issue);
  const type = issue.issue_type;
  const showType = Boolean(type) && type !== 'task';

  const marker = isSelected ? '▸ ' : '  ';
  const branch = node.depth > 0
    ? `${node.prefix}${node.isLast ? '└─' : '├─'} `
    : node.prefix;
  const caret = node.hasChildren ? (node.collapsed ? '▸ ' : '▾ ') : '  ';
  const typeBadge = showType ? `[${type}] ` : '';
  const left = `${marker}${branch}${caret}${glyph} ${issue.id}  ● P${issue.priority} ${typeBadge}`;
  const title = fitToWidth(issue.title || issue.id, Math.max(4, width - stringWidth(left) - 3));

  return (
    <Text wrap="truncate-end">
      <Text color={theme.colors.primary}>{marker}</Text>
      <Text color={theme.colors.textDim}>{branch}{caret}</Text>
      <Text color={getStatusColor(issue.displayStatus, theme)}>{glyph}</Text>
      <Text color={theme.colors.textDim}> {issue.id}  </Text>
      <Text color={getPriorityColor(issue.priority, theme)}>● P{issue.priority} </Text>
      {showType && <Text color={getTypeColor(type, theme)}>{typeBadge}</Text>}
      <Text bold={isSelected} color={isSelected ? theme.colors.primary : theme.colors.text}>
        {title}
      </Text>
    </Text>
  );
}

export const ListRow = React.memo(ListRowImpl);
