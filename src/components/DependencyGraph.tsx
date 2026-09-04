import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { getTypeColor, getStatusColor, getPriorityColor } from '../utils/constants';
import { isStatusVisible, type StatusVisibility } from '../utils/visibility';
import { DetailPanel } from './DetailPanel';
import { Footer, getFooterHeight } from './Footer';
import type { Issue, BeadsData } from '../types';

interface DependencyGraphProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

interface GraphNode {
  issue: Issue;
  level: number;
  column: number;
}

function buildDependencyLevels(data: BeadsData, visibility: StatusVisibility): GraphNode[][] {
  const { byId } = data;
  const levels: GraphNode[][] = [];
  const processed = new Set<string>();
  const inProcess = new Set<string>();

  // Find issues with no dependencies (level 0)
  function getLevel(issue: Issue, visitedPath: Set<string> = new Set()): number {
    if (processed.has(issue.id)) {
      // Already computed
      const found = levels.findIndex(level =>
        level?.some(node => node.issue.id === issue.id)
      );
      return found >= 0 ? found : 0;
    }

    // Detect cycles
    if (visitedPath.has(issue.id)) {
      return 0;
    }

    visitedPath.add(issue.id);

    let maxDepLevel = 0;

    // Check blocked-by dependencies
    if (issue.blockedBy && issue.blockedBy.length > 0) {
      for (const depId of issue.blockedBy) {
        const dep = byId.get(depId);
        if (dep) {
          const depLevel = getLevel(dep, new Set(visitedPath));
          maxDepLevel = Math.max(maxDepLevel, depLevel + 1);
        }
      }
    }

    return maxDepLevel;
  }

  // Calculate levels for all visible issues with dependencies
  const issuesWithDeps = data.issues.filter(
    issue =>
      isStatusVisible(issue, visibility) &&
      ((issue.blockedBy && issue.blockedBy.length > 0) ||
      (issue.blocks && issue.blocks.length > 0) ||
      (issue.parent) ||
      (issue.children && issue.children.length > 0))
  );

  for (const issue of issuesWithDeps) {
    const level = getLevel(issue);
    if (!levels[level]) {
      levels[level] = [];
    }
    levels[level].push({ issue, level, column: levels[level].length });
    processed.add(issue.id);
  }

  return levels;
}

export function DependencyGraph({ data, terminalWidth, terminalHeight }: DependencyGraphProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const showDetails = useBeadsStore(state => state.showDetails);
  const selectIssueById = useBeadsStore(state => state.selectIssueById);
  const navigateToEditIssue = useBeadsStore(state => state.navigateToEditIssue);

  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);
  const statusVisibility = useBeadsStore(state => state.statusVisibility);
  const showVisibilityPanel = useBeadsStore(state => state.showVisibilityPanel);

  const levels = useMemo(() => buildDependencyLevels(data, statusVisibility), [data, statusVisibility]);
  const flatNodes = useMemo(() => levels.flat(), [levels]);

  // Dense one-line nodes; leave room for header, per-level labels, legend and footer.
  const itemsPerPage = Math.max(terminalHeight - 11 - getFooterHeight(), 5);

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

  if (levels.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">BD TUI - Dependency Graph</Text>
        <Box marginTop={1}>
          <Text dimColor>No dependencies to visualize</Text>
        </Box>
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>1 kanban | 2 tree | 3 graph | ? help | q quit</Text>
        </Box>
      </Box>
    );
  }

  const selectedIssue = flatNodes[selectedIndex]?.issue;
  const visibleNodes = flatNodes.slice(scrollOffset, scrollOffset + itemsPerPage);

  // Group visible nodes back into levels for rendering
  const visibleLevels = new Map<number, GraphNode[]>();
  for (const node of visibleNodes) {
    if (!visibleLevels.has(node.level)) {
      visibleLevels.set(node.level, []);
    }
    visibleLevels.get(node.level)!.push(node);
  }

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color={theme.colors.primary}>
          BD TUI - Dependency Graph
        </Text>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>With deps: <Text color={theme.colors.text}>{flatNodes.length}</Text></Text>
          <Text color={theme.colors.textDim}>Levels: <Text color={theme.colors.text}>{levels.length}</Text></Text>
          <Text color={theme.colors.textDim}>Selected: <Text color={theme.colors.primary}>{selectedIndex + 1}/{flatNodes.length}</Text></Text>
        </Box>
      </Box>

      <Box flexGrow={1} overflow="hidden">
        {showDetails && selectedIssue ? (
          <Box flexGrow={1} overflow="hidden">
            <DetailPanel
              issue={selectedIssue}
              maxHeight={terminalHeight - 4 - 4 - getFooterHeight()}
              availableWidth={terminalWidth}
            />
          </Box>
        ) : (
          <Box flexDirection="column" width={terminalWidth}>
            {Array.from(visibleLevels.entries()).map(([levelIdx, levelNodes]) => {
              const totalInLevel = levels[levelIdx]?.length || 0;

              return (
                <Box key={levelIdx} flexDirection="column">
                  <Text color={theme.colors.warning} bold>
                    Level {levelIdx} <Text color={theme.colors.textDim}>({totalInLevel})</Text>
                  </Text>

                  {levelNodes.map((node) => {
                    const typeColor = getTypeColor(node.issue.issue_type, theme);
                    const statusColor = getStatusColor(node.issue.displayStatus, theme);
                    const priorityColor = getPriorityColor(node.issue.priority, theme);
                    const globalIndex = flatNodes.findIndex(n => n.issue.id === node.issue.id);
                    const isSelected = globalIndex === selectedIndex;
                    const nBlockedBy = node.issue.blockedBy?.length ?? 0;
                    const nBlocks = node.issue.blocks?.length ?? 0;
                    const nChildren = node.issue.children?.length ?? 0;

                    const gutter = isSelected ? '▸ ' : '  ';
                    const idStr = `${node.issue.id}  `;
                    const badges = `${nBlockedBy ? ` x${nBlockedBy}` : ''}${nBlocks ? ` >${nBlocks}` : ''}${nChildren ? ` +${nChildren}` : ''}`;
                    const right = ` ${node.issue.issue_type} ${node.issue.displayStatus} P${node.issue.priority}${badges}`;
                    const titleWidth = Math.max(4, terminalWidth - 2 - gutter.length - idStr.length - right.length - 3);
                    const rawTitle = node.issue.title || node.issue.id;
                    const title = rawTitle.length > titleWidth ? `${rawTitle.slice(0, titleWidth - 1)}…` : rawTitle;

                    return (
                      <Box key={node.issue.id} marginLeft={2}>
                        <Text color={theme.colors.primary}>{gutter}</Text>
                        <Text color={theme.colors.textDim}>{idStr}</Text>
                        <Text bold={isSelected} color={isSelected ? theme.colors.primary : theme.colors.text}>
                          {title}
                        </Text>
                        <Box flexGrow={1} />
                        <Text color={typeColor}>{node.issue.issue_type} </Text>
                        <Text color={statusColor}>{node.issue.displayStatus} </Text>
                        <Text color={priorityColor}>P{node.issue.priority}</Text>
                        {nBlockedBy > 0 && <Text color={theme.colors.statusBlocked}> ⊘{nBlockedBy}</Text>}
                        {nBlocks > 0 && <Text color={theme.colors.warning}> →{nBlocks}</Text>}
                        {nChildren > 0 && <Text color={theme.colors.accent}> ↳{nChildren}</Text>}
                      </Box>
                    );
                  })}
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

      {/* Legend */}
      <Box paddingX={1} gap={2}>
        <Text color={theme.colors.primary}>▸ selected</Text>
        <Text color={theme.colors.statusBlocked}>⊘ blocked by</Text>
        <Text color={theme.colors.warning}>→ blocks</Text>
        <Text color={theme.colors.accent}>↳ children</Text>
      </Box>

      {/* Footer */}
      <Footer currentView="graph" />
    </Box>
  );
}
