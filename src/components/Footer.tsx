import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { VIEW_NAMES } from '../utils/constants';
import { STATUS_KEYS, STATUS_LABELS } from '../utils/visibility';

interface FooterProps {
  currentView: 'kanban' | 'tree' | 'graph' | 'stats' | 'memories';
}

export const FOOTER_PRIMARY_SHORTCUTS = '/ search | f filter | v show | Enter/Space details | : cmd';

/** Border plus three fixed shortcut rows. */
export function getFooterHeight(): number {
  return 5;
}

export function Footer({ currentView }: FooterProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const notificationsEnabled = useBeadsStore(state => state.notificationsEnabled);
  const statusVisibility = useBeadsStore(state => state.statusVisibility);
  const theme = getTheme(currentTheme);

  const hiddenLabels = STATUS_KEYS.filter(key => !statusVisibility[key]).map(key => STATUS_LABELS[key]);

  const views = [
    { key: 'tree', num: '1', name: VIEW_NAMES.tree },
    { key: 'kanban', num: '2', name: VIEW_NAMES.kanban },
    { key: 'graph', num: '3', name: VIEW_NAMES.graph },
    { key: 'stats', num: '4', name: VIEW_NAMES.stats },
    { key: 'memories', num: '5', name: VIEW_NAMES.memories },
  ];

  return (
    <Box
      borderStyle="single"
      borderColor={theme.colors.border}
      paddingX={1}
      flexDirection="column"
      height={getFooterHeight()}
      overflow="hidden"
    >
      <Text color={theme.colors.textDim}>
        {FOOTER_PRIMARY_SHORTCUTS}
        {currentView === 'tree' ? ' | ←/→ fold' : ''}
      </Text>
      <Box gap={1}>
        {views.map(v => (
          <Text
            key={v.key}
            color={currentView === v.key ? theme.colors.primary : theme.colors.textDim}
            bold={currentView === v.key}
          >
            {currentView === v.key ? `[${v.num}]` : v.num} {v.name}
          </Text>
        ))}
      </Box>
      <Box justifyContent="space-between" width="100%">
        <Text color={theme.colors.textDim}>? help | q quit</Text>
        {hiddenLabels.length > 0 && (
          <Text color={theme.colors.warning}>⚑ hidden: {hiddenLabels.join(', ')}</Text>
        )}
        <Text color={notificationsEnabled ? theme.colors.success : theme.colors.textDim}>
          n:{notificationsEnabled ? 'ON' : 'off'}
        </Text>
      </Box>
    </Box>
  );
}
