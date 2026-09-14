# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-09-14

First standalone release of `bdui-next`, continuing the no-longer-maintained
[assimelha/bdui](https://github.com/assimelha/bdui).

### Added
- Memories view showing `bd remember` entries, with delete and refresh.
- Statistics dashboard with project-wide metrics and progress bars.
- Search and filter now apply across every view.
- Collapsible rows in the tree view via the arrow keys.

### Changed
- The tree view is now the default and first view; view keys are renumbered
  (`1` Tree, `2` Kanban, `3` Graph, `4` Stats, `5` Memories).
- Faster keyboard navigation: native `Bun.stringWidth` measurement and no
  duplicate full-board render per keystroke.
- Background polling relaxed to a 5s interval, configurable via `BDUI_POLL_MS`.

### Removed
- The List view, superseded by the tree view.
