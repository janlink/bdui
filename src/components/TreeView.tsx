import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { getTypeColor, getStatusColor, getPriorityColor } from '../utils/constants';
import { buildVisibleTree, flattenTree } from '../utils/tree';
import { computeVisibleIds } from '../utils/visibility';
import { DetailPanel } from './DetailPanel';
import { Footer, getFooterHeight } from './Footer';
import type { BeadsData } from '../types';

interface TreeViewProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

export function TreeView({ data, terminalWidth, terminalHeight }: TreeViewProps) {
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
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);

  const itemsPerPage = Math.max(terminalHeight - 5 - getFooterHeight(), 5);

  useEffect(() => {
    if (selectedIndex > flatNodes.length - 1) {
      setSelectedIndex(Math.max(0, flatNodes.length - 1));
      setScrollOffset(0);
    }
  }, [flatNodes.length]);

  useInput((input, key) => {
    if (showVisibilityPanel) return;
    // Navigation
    if ((!showDetails && key.upArrow) || input === 'k') {
      if (selectedIndex > 0) {
        const newIndex = selectedIndex - 1;
        setSelectedIndex(newIndex);

        // Scroll up if needed
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
      }
    }

    if ((!showDetails && key.downArrow) || input === 'j') {
      if (selectedIndex < flatNodes.length - 1) {
        const newIndex = selectedIndex + 1;
        setSelectedIndex(newIndex);

        // Scroll down if needed
        if (newIndex >= scrollOffset + itemsPerPage) {
          setScrollOffset(newIndex - itemsPerPage + 1);
        }
      }
    }

    // Edit selected issue
    if (input === 'e') {
      const issue = flatNodes[selectedIndex]?.issue;
      if (issue && selectIssueById(issue.id)) navigateToEditIssue();
    }
  });

  if (flatNodes.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No issues to display</Text>
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
          BD TUI - Tree View (Hierarchical)
        </Text>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>Total: <Text color={theme.colors.text}>{data.stats.total}</Text></Text>
          <Text color={theme.colors.textDim}>Roots: <Text color={theme.colors.text}>{tree.length}</Text></Text>
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
              const connector = node.isLast ? '└─' : '├─';
              const typeColor = getTypeColor(node.issue.issue_type, theme);
              const statusColor = getStatusColor(node.issue.displayStatus, theme);
              const priorityColor = getPriorityColor(node.issue.priority, theme);
              const isBlocked = !!(node.issue.blockedBy && node.issue.blockedBy.length > 0);

              const gutter = isSelected ? '▸ ' : '  ';
              const branch = `${node.prefix}${connector} `;
              const meta = ` ${node.issue.id} ${node.issue.issue_type} ${node.issue.displayStatus} P${node.issue.priority}${isBlocked ? ' [!]' : '    '}`;
              const titleWidth = Math.max(4, terminalWidth - gutter.length - branch.length - meta.length - 2);
              const rawTitle = node.issue.title || node.issue.id;
              const title = rawTitle.length > titleWidth ? `${rawTitle.slice(0, titleWidth - 1)}…` : rawTitle;

              return (
                <Box key={node.issue.id}>
                  <Text color={theme.colors.primary}>{gutter}</Text>
                  <Text color={theme.colors.textDim}>{branch}</Text>
                  <Text bold={isSelected} color={isSelected ? theme.colors.primary : theme.colors.text}>
                    {title}
                  </Text>
                  <Box flexGrow={1} />
                  <Text color={theme.colors.textDim}>{node.issue.id} </Text>
                  <Text color={typeColor}>{node.issue.issue_type} </Text>
                  <Text color={statusColor}>{node.issue.displayStatus} </Text>
                  <Text color={priorityColor}>P{node.issue.priority}</Text>
                  <Text color={theme.colors.statusBlocked} bold>{isBlocked ? ' [!]' : '    '}</Text>
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

      {/* Footer */}
      <Footer currentView="tree" />
    </Box>
  );
}
