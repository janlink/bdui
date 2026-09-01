#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { App } from './components/App';
import { handleCliArgs } from './cli';

if (handleCliArgs(process.argv.slice(2))) process.exit(0);

// Render the app
const { unmount, waitUntilExit } = render(<App />);

// Handle process termination
process.on('SIGINT', () => {
  unmount();
  process.exit(0);
});

process.on('SIGTERM', () => {
  unmount();
  process.exit(0);
});

// Wait for the app to exit
await waitUntilExit();
