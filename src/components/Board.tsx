import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { StatusColumn } from './StatusColumn';
import { DetailPanel } from './DetailPanel';
import { HelpOverlay } from './HelpOverlay';
import { TreeView } from './TreeView';
import { DependencyGraph } from './DependencyGraph';
import { SearchInput } from './SearchInput';
import { FilterPanel } from './FilterPanel';
import { CreateIssueForm } from './CreateIssueForm';
import { EditIssueForm } from './EditIssueForm';
import { ExportDialog } from './ExportDialog';
import { ThemeSelector } from './ThemeSelector';
import { StatsView } from './StatsView';
import { Toast } from './Toast';
import { FiltersBanner } from './FiltersBanner';
import { ConfirmDialog } from './ConfirmDialog';
import { CommandBar } from './CommandBar';
import { LAYOUT } from '../utils/constants';
import { Footer } from './Footer';

function KanbanView() {
  const data = useBeadsStore(state => state.data);
  const selectedColumn = useBeadsStore(state => state.selectedColumn);
  const columnStates = useBeadsStore(state => state.columnStates);
  const itemsPerPage = useBeadsStore(state => state.itemsPerPage);
  const showDetails = useBeadsStore(state => state.showDetails);
  const showSearch = useBeadsStore(state => state.showSearch);
  const showFilter = useBeadsStore(state => state.showFilter);
  const showExportDialog = useBeadsStore(state => state.showExportDialog);
  const showThemeSelector = useBeadsStore(state => state.showThemeSelector);
  const showJumpToPage = useBeadsStore(state => state.showJumpToPage);
  const toggleExportDialog = useBeadsStore(state => state.toggleExportDialog);
  const toggleThemeSelector = useBeadsStore(state => state.toggleThemeSelector);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const getVisibleColumns = useBeadsStore(state => state.getVisibleColumns);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const selectedIssue = getSelectedIssue();
  const visibleColumnsByStatus = useMemo(
    () => getVisibleColumns(),
    [data, searchQuery, filter, getVisibleColumns],
  );
  const filteredStats = {
    total: Object.values(visibleColumnsByStatus).reduce((total, issues) => total + issues.length, 0),
    open: visibleColumnsByStatus.open.length,
    closed: visibleColumnsByStatus.closed.length,
    blocked: visibleColumnsByStatus.blocked.length,
  };

  // Responsive layout calculations
  const COLUMN_WIDTH = LAYOUT.columnWidth;
  const MIN_WIDTH_FOR_ALL_COLUMNS = COLUMN_WIDTH * 5 + 10;

  // Determine how many columns to show
  const visibleColumns = terminalWidth < MIN_WIDTH_FOR_ALL_COLUMNS && terminalWidth >= COLUMN_WIDTH * 2
    ? 2
    : terminalWidth < COLUMN_WIDTH * 2
    ? 1
    : 5;
  const shouldShowDetailsAlongside = showDetails && terminalWidth >= (
    visibleColumns * COLUMN_WIDTH + LAYOUT.detailPanelWidth + 2
  );

  const statusConfig = [
    { key: 'open', title: 'Open' },
    { key: 'in_progress', title: 'In Progress' },
    { key: 'blocked', title: 'Blocked' },
    { key: 'closed', title: 'Closed' },
    { key: 'other', title: 'Other' },
  ] as const;

  // Keep the selected column in the responsive window.
  const firstVisibleColumn = Math.min(
    Math.max(0, selectedColumn - visibleColumns + 1),
    statusConfig.length - visibleColumns,
  );
  const columnsToShow = statusConfig.slice(firstVisibleColumn, firstVisibleColumn + visibleColumns);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Toast message */}
      <Toast />

      {/* Header */}
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold color={theme.colors.primary}>
            BD TUI - Kanban Board
          </Text>
          <Text color={theme.colors.textDim}>
            {terminalWidth}x{terminalHeight} | Press ? for help
          </Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>Total: <Text color={theme.colors.text}>{filteredStats.total}</Text></Text>
          <Text color={theme.colors.textDim}>Open: <Text color={theme.colors.statusOpen}>{filteredStats.open}</Text></Text>
          <Text color={theme.colors.textDim}>Blocked: <Text color={theme.colors.statusBlocked}>{filteredStats.blocked}</Text></Text>
          <Text color={theme.colors.textDim}>Closed: <Text color={theme.colors.statusClosed}>{filteredStats.closed}</Text></Text>
          <Text color={theme.colors.textDim}>Other: <Text color={theme.colors.text}>{visibleColumnsByStatus.other.length}</Text></Text>
          {visibleColumns < 5 && (
            <Text color={theme.colors.warning}>[{5 - visibleColumns} hidden]</Text>
          )}
        </Box>
      </Box>

      {/* Filters banner */}
      <FiltersBanner />

      {/* Search Input */}
      {showSearch && <SearchInput />}

      {/* Filter Panel */}
      {showFilter && <FilterPanel />}

      {/* Main content */}
      <Box flexGrow={1} overflow="hidden">
        {showDetails && !shouldShowDetailsAlongside ? (
          <Box flexGrow={1} overflow="hidden">
            <DetailPanel issue={selectedIssue} maxHeight={terminalHeight - 10} />
          </Box>
        ) : (
          <>
            <Box flexShrink={0}>
              {columnsToShow.map(({ key, title }, idx) => {
                const columnState = columnStates[key];
                return (
                  <StatusColumn
                    key={key}
                    title={title}
                    issues={visibleColumnsByStatus[key]}
                    isActive={selectedColumn === firstVisibleColumn + idx}
                    selectedIndex={columnState.selectedIndex}
                    scrollOffset={columnState.scrollOffset}
                    itemsPerPage={itemsPerPage}
                    statusKey={key}
                  />
                );
              })}
            </Box>
            {shouldShowDetailsAlongside && (
              <Box marginLeft={2} flexGrow={1} overflow="hidden">
                <DetailPanel issue={selectedIssue} maxHeight={terminalHeight - 10} />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Command Bar (vim-style) */}
      {showJumpToPage && <CommandBar />}

      {/* Footer */}
      <Footer currentView="kanban" />

      {/* Export Dialog */}
      {showExportDialog && selectedIssue && (
        <Box
          position="absolute"
          marginTop={Math.floor(terminalHeight / 2) - 10}
          marginLeft={Math.floor(terminalWidth / 2) - 35}
        >
          <ExportDialog
            issue={selectedIssue}
            onClose={toggleExportDialog}
          />
        </Box>
      )}

      {/* Theme Selector */}
      {showThemeSelector && (
        <Box
          position="absolute"
          marginTop={Math.floor(terminalHeight / 2) - 10}
          marginLeft={Math.floor(terminalWidth / 2) - 30}
        >
          <ThemeSelector onClose={toggleThemeSelector} />
        </Box>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </Box>
  );
}

export function Board() {
  const viewMode = useBeadsStore(state => state.viewMode);
  const showHelp = useBeadsStore(state => state.showHelp);
  const data = useBeadsStore(state => state.data);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const returnToPreviousView = useBeadsStore(state => state.returnToPreviousView);
  const reloadCallback = useBeadsStore(state => state.reloadCallback);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const selectedIssue = getSelectedIssue();

  const filteredIssues = useMemo(
    () => getFilteredIssues(),
    [data, searchQuery, filter, getFilteredIssues],
  );

  // Check minimum terminal width
  if (terminalWidth < LAYOUT.minTerminalWidth) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.colors.error} bold>Terminal Too Narrow</Text>
        <Text color={theme.colors.text}>
          BD TUI requires at least {LAYOUT.minTerminalWidth} columns.
        </Text>
        <Text color={theme.colors.textDim}>
          Current width: {terminalWidth} columns
        </Text>
        <Box marginTop={1}>
          <Text color={theme.colors.textDim}>
            Please resize your terminal window.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Render view based on mode */}
      {viewMode === 'kanban' && <KanbanView />}
      {viewMode === 'tree' && <TreeView data={data} terminalHeight={terminalHeight} />}
      {viewMode === 'graph' && (
        <DependencyGraph
          data={data}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
        />
      )}
      {viewMode === 'stats' && (
        <StatsView
          issues={filteredIssues}
          totalIssues={data.issues.length}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
        />
      )}
      {viewMode === 'create-issue' && (
        <CreateIssueForm
          onClose={returnToPreviousView}
          onSuccess={() => {
            if (reloadCallback) reloadCallback();
          }}
        />
      )}
      {viewMode === 'edit-issue' && selectedIssue && (
        <EditIssueForm
          issue={selectedIssue}
          onClose={returnToPreviousView}
          onSuccess={() => {
            if (reloadCallback) reloadCallback();
          }}
        />
      )}

      {/* Help overlay - shared across all views */}
      {showHelp && <HelpOverlay />}

      {/* Confirm dialog - shared across all views */}
      <ConfirmDialog />
    </Box>
  );
}
