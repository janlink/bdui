import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { getTypeColor, getStatusColor, getPriorityColor } from '../utils/constants';
import { buildVisibleTree, flattenList } from '../utils/tree';
import { computeVisibleIds } from '../utils/visibility';
import { DetailPanel } from './DetailPanel';
import { Footer, getFooterHeight } from './Footer';
import type { Issue, BeadsData } from '../types';

interface ListViewProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

// bd list-style status glyphs. Blocked is a presentation status, so it wins
// over the raw status; everything else maps from the raw value.
function statusGlyph(issue: Issue): string {
  if (issue.displayStatus === 'blocked') return '●';
  switch (issue.status) {
    case 'open': return '○';
    case 'in_progress': return '◐';
    case 'closed': return '✓';
    case 'deferred': return '❄';
    default: return '◇';
  }
}

export function ListView({ data, terminalWidth, terminalHeight }: ListViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const showDetails = useBeadsStore(state => state.showDetails);
  const selectIssueById = useBeadsStore(state => state.selectIssueById);
  const navigateToEditIssue = useBeadsStore(state => state.navigateToEditIssue);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);
  const statusVisibility = useBeadsStore(state => state.statusVisibility);
  const showVisibilityPanel = useBeadsStore(state => state.showVisibilityPanel);

  const visibleIds = useMemo(() => computeVisibleIds(data, statusVisibility), [data, statusVisibility]);
  const tree = useMemo(() => buildVisibleTree(data, visibleIds), [data, visibleIds]);
  const flatNodes = useMemo(() => flattenList(tree), [tree]);

  const itemsPerPage = Math.max(terminalHeight - 6 - getFooterHeight(), 5);

  useEffect(() => {
    if (selectedIndex > flatNodes.length - 1) {
      setSelectedIndex(Math.max(0, flatNodes.length - 1));
      setScrollOffset(0);
    }
  }, [flatNodes.length]);

  useInput((input, key) => {
    if (showVisibilityPanel) return;
    if ((!showDetails && key.upArrow) || input === 'k') {
      if (selectedIndex > 0) {
        const newIndex = selectedIndex - 1;
        setSelectedIndex(newIndex);
        if (newIndex < scrollOffset) setScrollOffset(newIndex);
      }
    }

    if ((!showDetails && key.downArrow) || input === 'j') {
      if (selectedIndex < flatNodes.length - 1) {
        const newIndex = selectedIndex + 1;
        setSelectedIndex(newIndex);
        if (newIndex >= scrollOffset + itemsPerPage) {
          setScrollOffset(newIndex - itemsPerPage + 1);
        }
      }
    }

    if (input === 'e') {
      const issue = flatNodes[selectedIndex]?.issue;
      if (issue && selectIssueById(issue.id)) navigateToEditIssue();
    }
  });

  if (flatNodes.length === 0) {
    return (
      <Box padding={1}>
        <Text color={theme.colors.textDim}>No issues to display</Text>
      </Box>
    );
  }

  const selectedIssue = flatNodes[selectedIndex]?.issue;
  const visibleNodes = flatNodes.slice(scrollOffset, scrollOffset + itemsPerPage);

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color={theme.colors.primary}>
          BD TUI - List View
        </Text>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>Total: <Text color={theme.colors.text}>{data.stats.total}</Text></Text>
          <Text color={theme.colors.textDim}>Selected: <Text color={theme.colors.primary}>{selectedIndex + 1}/{flatNodes.length}</Text></Text>
        </Box>
      </Box>

      <Box flexGrow={1} overflow="hidden">
        {showDetails && selectedIssue ? (
          <Box flexGrow={1} overflow="hidden">
            <DetailPanel
              issue={selectedIssue}
              maxHeight={terminalHeight - 3 - getFooterHeight()}
              availableWidth={terminalWidth}
            />
          </Box>
        ) : (
          <Box flexDirection="column" width={terminalWidth}>
            {visibleNodes.map((node, idx) => {
              const globalIndex = scrollOffset + idx;
              const isSelected = globalIndex === selectedIndex;
              const glyph = statusGlyph(node.issue);
              const statusColor = getStatusColor(node.issue.displayStatus, theme);
              const priorityColor = getPriorityColor(node.issue.priority, theme);
              const type = node.issue.issue_type;
              const showType = type && type !== 'task';
              const typeBadge = showType ? `[${type}] ` : '';

              const marker = isSelected ? '▸ ' : '  ';
              const branch = node.depth > 0
                ? `${node.prefix}${node.isLast ? '└─' : '├─'} `
                : `${node.prefix}`;
              const left = `${marker}${branch}${glyph} ${node.issue.id}  ● P${node.issue.priority} ${typeBadge}`;
              const titleWidth = Math.max(4, terminalWidth - left.length - 3);
              const rawTitle = node.issue.title || node.issue.id;
              const title = rawTitle.length > titleWidth
                ? `${rawTitle.slice(0, titleWidth - 1)}…`
                : rawTitle;

              return (
                <Box key={node.issue.id}>
                  <Text color={theme.colors.primary}>{marker}</Text>
                  <Text color={theme.colors.textDim}>{branch}</Text>
                  <Text color={statusColor}>{glyph}</Text>
                  <Text color={theme.colors.textDim}> {node.issue.id}  </Text>
                  <Text color={priorityColor}>● P{node.issue.priority} </Text>
                  {showType && <Text color={getTypeColor(type, theme)}>[{type}] </Text>}
                  <Text bold={isSelected} color={isSelected ? theme.colors.primary : theme.colors.text}>
                    {title}
                  </Text>
                </Box>
              );
            })}

            <Box marginTop={1} justifyContent="space-between">
              <Text color={theme.colors.warning}>{scrollOffset > 0 ? `↑ ${scrollOffset} above` : ''}</Text>
              <Text color={theme.colors.warning}>
                {scrollOffset + itemsPerPage < flatNodes.length
                  ? `↓ ${flatNodes.length - (scrollOffset + itemsPerPage)} below`
                  : ''}
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Status legend */}
      <Box paddingX={1} gap={2}>
        <Text color={theme.colors.statusOpen}>○ open</Text>
        <Text color={theme.colors.statusInProgress}>◐ in progress</Text>
        <Text color={theme.colors.statusBlocked}>● blocked</Text>
        <Text color={theme.colors.statusClosed}>✓ closed</Text>
        <Text color={theme.colors.textDim}>❄ deferred</Text>
      </Box>

      {/* Footer */}
      <Footer currentView="list" />
    </Box>
  );
}
