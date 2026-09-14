# Upstream Status

Tracked baseline for the `upstream-scout` skill. Watches
[`gastownhall/beads`](https://github.com/gastownhall/beads) — the `bd --json`
CLI contract that bdui integrates against.

| Field                       | Value                                   |
|-----------------------------|-----------------------------------------|
| Last check                  | 2026-09-14                              |
| Baseline `bd` version       | 1.2.2 (Homebrew)                        |
| bdui version                | 0.3.0                                   |
| Newest reviewed upstream sha | `f56632ad` (2026-09-12)                |
| Upstream latest release     | v1.3.0-rc.2 (pre) · v1.2.2 (stable)     |
| Open actions                | 5                                       |
| Latest research doc         | [upstream-check-2026-09-14](./upstream-check-2026-09-14.md) |

## bd commands bdui currently invokes

`list --all --limit 0 --json` · `where --json` · `create … --json` ·
`update … --json` · `close … --json` · `forget` (memories)

Everything else `bd` exposes is Feature-Radar territory for the scout.
