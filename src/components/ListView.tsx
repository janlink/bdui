import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { buildVisibleTree, flattenList } from '../utils/tree';
import { useTreeNavigation } from './useTreeNavigation';
import { ListRow } from './IssueRow';
import { DetailPanel } from './DetailPanel';
import { Footer, getFooterHeight } from './Footer';
import type { BeadsData } from '../types';

interface ListViewProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

export function ListView({ data, terminalWidth, terminalHeight }: ListViewProps) {
  const showDetails = useBeadsStore(state => state.showDetails);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);
  const statusVisibility = useBeadsStore(state => state.statusVisibility);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);
  const getRowVisibleIds = useBeadsStore(state => state.getRowVisibleIds);

  const visibleIds = useMemo(
    () => getRowVisibleIds(),
    [data, statusVisibility, searchQuery, filter, getRowVisibleIds],
  );
  const tree = useMemo(() => buildVisibleTree(data, visibleIds), [data, visibleIds]);

  const itemsPerPage = Math.max(terminalHeight - 6 - getFooterHeight(), 5);
  const { flatNodes, selectedIndex, scrollOffset, selectedIssue } = useTreeNavigation(tree, flattenList, itemsPerPage);

  if (flatNodes.length === 0) {
    return (
      <Box padding={1}>
        <Text color={theme.colors.textDim}>No issues to display</Text>
      </Box>
    );
  }

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
            {visibleNodes.map((node, idx) => (
              <ListRow
                key={node.issue.id}
                node={node}
                isSelected={scrollOffset + idx === selectedIndex}
                theme={theme}
                width={terminalWidth}
              />
            ))}

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
