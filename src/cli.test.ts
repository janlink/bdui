import { expect, test } from 'bun:test';
import packageJson from '../package.json';
import { handleCliArgs } from './cli';

test('help exits before starting the interactive UI', () => {
  const output: string[] = [];
  expect(handleCliArgs(['--help'], (message) => output.push(message))).toBe(true);
  expect(output.join('\n')).toContain('Usage:');
  expect(output.join('\n')).toContain('bd where');
});

test('version comes from package metadata', () => {
  const output: string[] = [];
  expect(handleCliArgs(['--version'], (message) => output.push(message))).toBe(true);
  expect(output).toEqual([`bdui ${packageJson.version}`]);
});

test('interactive startup continues when no informational flag is present', () => {
  expect(handleCliArgs([])).toBe(false);
});
