import packageJson from '../package.json';

export const HELP_TEXT = `bdui - terminal UI for the Beads issue tracker

Usage:
  bdui
  bdui --help
  bdui --version

Run bdui inside a project with an active Beads workspace. bdui discovers the
workspace through "bd where" and reads and writes issues through the bd CLI.`;

export function handleCliArgs(
  args: readonly string[],
  write: (message: string) => void = console.log,
): boolean {
  if (args.includes('--help') || args.includes('-h')) {
    write(HELP_TEXT);
    return true;
  }

  if (args.includes('--version') || args.includes('-v')) {
    write(`bdui ${packageJson.version}`);
    return true;
  }

  return false;
}
