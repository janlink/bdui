import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { VIEW_NAMES } from '../utils/constants';

interface FooterProps {
  currentView: 'kanban' | 'tree' | 'graph' | 'stats' | 'list';
}

export const FOOTER_PRIMARY_SHORTCUTS = '/ search | f filter | Enter/Space details | : cmd';

/** Border plus three fixed shortcut rows. */
export function getFooterHeight(): number {
  return 5;
}

export function Footer({ currentView }: FooterProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const notificationsEnabled = useBeadsStore(state => state.notificationsEnabled);
  const theme = getTheme(currentTheme);

  const views = [
    { key: 'kanban', num: '1', name: VIEW_NAMES.kanban },
    { key: 'tree', num: '2', name: VIEW_NAMES.tree },
    { key: 'graph', num: '3', name: VIEW_NAMES.graph },
    { key: 'stats', num: '4', name: VIEW_NAMES.stats },
    { key: 'list', num: '5', name: VIEW_NAMES.list },
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
      <Text color={theme.colors.textDim}>{FOOTER_PRIMARY_SHORTCUTS}</Text>
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
        <Text color={notificationsEnabled ? theme.colors.success : theme.colors.textDim}>
          n:{notificationsEnabled ? 'ON' : 'off'}
        </Text>
      </Box>
    </Box>
  );
}
