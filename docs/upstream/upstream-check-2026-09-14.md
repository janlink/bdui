# Upstream check — 2026-09-14

**Baseline:** bd 1.2.2 (unchanged locally) · bdui 0.3.0
**Upstream range:** v1.2.2 (2026-08-15) … HEAD `f56632ad` (2026-09-12), plus pre-releases v1.3.0-rc.1/rc.2 (gastownhall/beads)
**Method:** first run — full inventory, not a diff. `gh api` for commits/releases/PRs; local `bd 1.2.2` probed in a throwaway workspace for the live JSON contract, statuses, and types.

## TL;DR

No confirmed breaking change against bd 1.2.2 — bdui's flat-array `bd list --json` parsing still matches the live contract. The headline is **v1.3.0-rc.2 is already out** (2026-09-10) and carries a whole due-date/recurrence/handoff subsystem; bdui should be exercised against 1.3.0 before it goes stable. One real correctness gap exists today: custom **active-category** statuses land in bdui's *Other* column instead of *Open*. The bigger story is opportunity — bd exposes far more surface (due dates, rich label filters, `query`/`search`, `statuses`/`types` discovery, `history`, comments) than bdui currently surfaces.

## Breaking changes / correctness risks

| Change | Impact in bdui | Remediation | Ref |
|--------|----------------|-------------|-----|
| Custom statuses in the **active** category are treated like `open` by `bd ready`/`bd list` | `src/bd/parser.ts` `KNOWN_STATUSES` is hardcoded to 4 values; a custom active status (e.g. `triaged`) falls through to *Other* instead of *Open*, mis-columning real open work | Map by status **category** (active/wip/done/frozen), ideally read from `bd statuses`, instead of a fixed 4-value allowlist | beads #5831 |
| **v1.3.0-rc.2** shipping (due/recurrence/handoff/notify) | Unknown until tested; additive schema is likely non-breaking but adds contract fields bdui ignores | Install 1.3.0-rc.2, run bdui's suite + a rendered TUI check against a 1.3.0 workspace; capture new `bd list --json` keys | v1.3.0-rc.2; #6524, #6528–#6534 |
| `fix(flags)`: remove silent "last-value-wins" from filter flags | bdui only sends `--all --limit 0` today → low risk, but any future multi-flag filtering must not rely on last-wins | Note when adding server-side filters | beads #6548 (open) |
| Additive schema for **versioned beads** (Phase 1) | New fields in the contract; bdui preserves raw and ignores them (safe) — but may hide useful data | Re-probe `bd list --json` keys after upgrading; adopt if relevant | beads #6134 |

## Feature opportunities

| Capability (already in bd's contract) | bdui surface | Effort | Ref |
|---------------------------------------|--------------|--------|-----|
| **Due dates / overdue / defer** — `bd list --overdue/--due-before/--deferred`; first-class in 1.3.0 (MCP exposes due+recurrence) | Overdue badge/warning (cf. mardi-gras); due/defer in detail view; `due_at`/`defer_until` fields | M | #6534, #6528–#6532 |
| **Dynamic status/type discovery** — `bd statuses`, `bd types` (built-in list incl. categories) | Replace hardcoded `KNOWN_STATUSES` and creatable-types list; robust against custom + built-in `spike/story/milestone`; fixes the active-category gap above | M | bd 1.2.2 CLI |
| **New built-in types** `spike`, `story`, `milestone` | Add to the create/edit form type picker (parser already preserves them on read) | S | bd 1.2.2 `bd types` |
| **Rich label filters** — `--label-any`, `--label-pattern`, `--label-regex`, `--exclude-label` | Extend bdui filter syntax / push filtering server-side | S–M | bd 1.2.2 `bd list` |
| **`bd query` / `bd search`** — query language + full-text search | Optional server-side search for large workspaces (bdui filters client-side) | M | bd 1.2.2 CLI |
| **Comments & activity** — `bd comments` (+ delete, count as activity) | Comments/timeline in detail view | M | #6529 |
| **`bd history`** — per-issue version history | History panel in detail view | M | bd 1.2.2 CLI |
| **`--format dot/digraph`** — dependency graph export | Export from the existing dependency view | S | bd 1.2.2 `bd list` |
| **Metadata** — `--metadata-field`, `--has-metadata-key`, create `--metadata` | Surface/filter metadata | M | #6024 |
| **Richer create fields** — `--due --defer --estimate --acceptance --design --deps --external-ref` | Expand the create form beyond title/type | S–M | bd 1.2.2 `bd create` |

## Informational (no bdui impact)

Bulk of the range is below the `bd --json` boundary: storage/Dolt/MySQL perf (#6122, #6444), metrics reaping (#5933/#5937), import/wisp edge conformance, migration-corpus tests, CI deadlines, nix vendoring, doctor/test-container cleanup. These do not reach bdui.

## Recommended actions (priority order)

1. **Test bdui against v1.3.0-rc.2** in a real workspace (suite + rendered TUI); record any new `bd list --json` keys. Gate before bumping the supported version.
2. **Category-aware status mapping** (`src/bd/parser.ts`) — fixes custom active-status mis-columning (#5831); pairs naturally with dynamic `bd statuses` discovery.
3. **Add `spike`/`story`/`milestone`** to the creatable-types list (low effort, already read-safe).
4. **Scope a due-date/overdue feature** for the parade/board (overdue badge + detail field) — the highest-value net-new capability.
5. Backlog: rich label filters, `bd query`/`search`, comments, history, graph export.

## Caveats

- JSON-key probe reads keys from the first issue only, and only non-null fields showed (`description`, `labels`, `dependencies`, `assignee` were empty in the probe) — this is **not** a full field audit. Re-probe with populated issues.
- Local probe ran against bd **1.2.2**; all 1.3.0 contract claims are inferred from PR titles, not verified against a running 1.3.0 build.
- Commit triage was by subject line, not full-diff review, for the ~40 commits in range.
