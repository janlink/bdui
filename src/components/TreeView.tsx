import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { buildVisibleTree, flattenTree } from '../utils/tree';
import { computeVisibleIds } from '../utils/visibility';
import { useTreeNavigation } from './useTreeNavigation';
import { TreeRow } from './IssueRow';
import { DetailPanel } from './DetailPanel';
import { Footer, getFooterHeight } from './Footer';
import type { BeadsData } from '../types';

interface TreeViewProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

export function TreeView({ data, terminalWidth, terminalHeight }: TreeViewProps) {
  const showDetails = useBeadsStore(state => state.showDetails);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);
  const statusVisibility = useBeadsStore(state => state.statusVisibility);

  const visibleIds = useMemo(() => computeVisibleIds(data, statusVisibility), [data, statusVisibility]);
  const tree = useMemo(() => buildVisibleTree(data, visibleIds), [data, visibleIds]);

  const itemsPerPage = Math.max(terminalHeight - 5 - getFooterHeight(), 5);
  const { flatNodes, selectedIndex, scrollOffset, selectedIssue } = useTreeNavigation(tree, flattenTree, itemsPerPage);

  if (flatNodes.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No issues to display</Text>
      </Box>
    );
  }

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
            {visibleNodes.map((node, idx) => (
              <TreeRow
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

      {/* Footer */}
      <Footer currentView="tree" />
    </Box>
  );
}
