# CLAUDE.md

This file provides development guidance for BD TUI.

## Project workflow

Public bug reports and feature requests use GitHub Issues. When a maintainer or
coding agent has a configured local [bd (Beads)](https://github.com/gastownhall/beads)
workspace, run `bd prime` and use it for local implementation tracking instead
of markdown task lists. Do not initialize or commit `.beads/` as part of an
unrelated contribution; see `AGENTS.md` for the local-workspace entry point.

## Project overview

BD TUI is an Ink/React terminal UI for current Beads workspaces. It displays a
five-column Kanban board, tree and dependency views, statistics, filters,
notifications, and issue forms.

The application treats the public `bd --json` CLI as its integration boundary.
It does not query SQLite, Dolt SQL, or Beads' internal files.

- **Runtime:** Bun
- **UI:** Ink 6 and React 19
- **State:** Zustand
- **Targets:** compiled macOS, Linux, and Windows binaries

## Development commands

```bash
bun install
bun run dev          # Run against the Beads workspace discovered from cwd
bun run test         # Automated tests, including temporary Dolt workspaces
bun run typecheck    # Strict TypeScript validation
bun run build        # Compile the current-platform binary
bun run check        # Test, typecheck, and build

bun run build:macos
bun run build:linux
bun run build:windows
bun run build:all
```

The release workflow must pass `bun run check` before building platform
artifacts.

## Architecture

### Beads process boundary (`src/bd/client.ts`)

`runBd()` starts `bd` with an argv array and never constructs a shell command.
It applies time and output bounds, escalates termination when needed, and
reports stderr on nonzero exits. Keep all future Beads subprocess calls behind
this boundary.

### Workspace discovery and reads (`src/bd/parser.ts`)

- Discover the active workspace with `bd where --json`.
- Read every issue with `bd list --all --limit 0 --json`.
- Normalize only fields consumed by the UI.
- Preserve raw status, type, and dependency values for forward compatibility.
- Build parent/child and blocking relationships in a second pass.
- Keep raw `status` separate from presentation `displayStatus`.

Open issues with active blockers use the Blocked presentation column. Deferred,
pinned, hooked, custom, and unknown statuses use Other while retaining their
raw status on the issue.

### Mutations (`src/bd/commands.ts`)

- Create with `bd create ... --json`.
- Update fields with `bd update ... --json`.
- Close with `bd close ... --json`; do not model closure as a generic edit.
- Pass every user value as one argv item.
- Propagate command and malformed-JSON failures instead of returning empty data.

Forms call these helpers and request an immediate refresh after successful
mutations.

### Refresh (`src/bd/watcher.ts`)

`BeadsWatcher` polls through the public CLI. Reloads are serialized, unchanged
snapshots are suppressed with a canonical fingerprint, and transient failures
retain the last successful data. Cleanup must prevent in-flight or stale
callbacks from publishing after disposal.

### State (`src/state/store.ts`)

Zustand is the single source of truth for data, filtering, navigation, modal
state, terminal size, and notifications.

The five presentation columns are:

1. Open
2. In Progress
3. Blocked
4. Closed
5. Other

`getVisibleColumns()` is the shared filtered/grouped view. Rendering, selection,
navigation, pagination, editing, and exporting must all use this same view.
When filters change, clamp or reset column selection and scroll state.

### UI (`src/components/`)

`App.tsx` owns workspace initialization, watcher lifetime, global input, and
terminal resize handling. `Board.tsx` routes views and renders the responsive
Kanban window. Tree and graph views keep local selection, so they must sync the
exact selected issue ID into the store before opening edit/export actions.

Input is modal. Normal navigation must not process keystrokes while search,
filter, forms, dialogs, theme selection, help, or the command bar owns input.

Ink 6 layout props belong on `Box`; do not place Box-only margin/layout props on
`Text`, and do not use unsupported absolute `top`/`left`/`right` props.

## Domain semantics

Beads priorities are ordered by urgency:

- P0 Critical
- P1 High
- P2 Medium
- P3 Low
- P4 Backlog

Keep labels, colors, sort order, statistics, filters, and arrow-key behavior
consistent with this ordering. Current creatable built-in types include task,
epic, bug, feature, chore, and decision. Read paths must preserve future or
custom types rather than rejecting them.

## Testing

The automated suite covers:

- current embedded-Dolt workspace loading
- safe argv mutation behavior
- command timeout and output limits
- tolerant status/type/dependency normalization
- serialized polling and cleanup
- filtered selection and navigation
- Other-column visibility
- priority labels and colors
- informational CLI flags

For interaction changes, also run the compiled TUI in a real terminal against a
representative current Beads workspace. Exercise each changed key path once;
builds and unit tests are not a substitute for rendered interaction checks.

## Release and documentation

Keep `README.md`, package scripts, and GitHub Actions aligned with the actual
CLI contract and supported views. Do not document `.beads/beads.db`, direct SQL,
`bd edit`, or file watching. Release binaries must support `--help` and
`--version` without entering raw terminal mode.
