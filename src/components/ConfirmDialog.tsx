import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function ConfirmDialog() {
  const showConfirmDialog = useBeadsStore(state => state.showConfirmDialog);
  const confirmDialogData = useBeadsStore(state => state.confirmDialogData);
  const hideConfirm = useBeadsStore(state => state.hideConfirm);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  useInput((input, key) => {
    if (!showConfirmDialog) return;

    if (key.escape || input.toLowerCase() === 'n') {
      hideConfirm();
      return;
    }

    if (input.toLowerCase() === 'y' || key.return) {
      if (confirmDialogData?.onConfirm) {
        confirmDialogData.onConfirm();
      }
      hideConfirm();
    }
  });

  if (!showConfirmDialog || !confirmDialogData) return null;

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={theme.colors.warning}
        backgroundColor="black"
        padding={2}
        width={50}
      >
        <Text bold color={theme.colors.warning}>
          {confirmDialogData.title}
        </Text>

        <Box marginY={1}>
          <Text>{confirmDialogData.message}</Text>
        </Box>

        <Box gap={2} justifyContent="center">
          <Text>
            <Text color={theme.colors.success} bold>[Y]</Text>
            <Text> Yes</Text>
          </Text>
          <Text>
            <Text color={theme.colors.error} bold>[N]</Text>
            <Text> No</Text>
          </Text>
        </Box>

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Press Y to confirm, N or ESC to cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
