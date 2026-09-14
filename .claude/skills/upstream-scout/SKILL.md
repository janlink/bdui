---
name: upstream-scout
description: >-
  Research recent changes in the upstream bd (Beads) CLI that bdui integrates
  against, and report what matters for this TUI. Detects breaking changes to the
  `bd --json` contract (fields, statuses, types, dependency semantics, command
  flags), surfaces new bd capabilities bdui could expose, then writes a dated
  research doc plus a journal entry and refreshes the tracked baseline. Use when
  checking for Beads updates, auditing bd compatibility, before bumping the
  supported bd version, when `bd` output looks unfamiliar, or when the user types
  /upstream-scout.
argument-hint: "[--since <ISO-date|git-ref>]  (default: last recorded baseline)"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch
---

# Upstream Scout

bdui is a presentation layer over the public `bd` (Beads) CLI. Its only
integration boundary is `bd <argv> --json` (see `src/bd/client.ts`). Therefore
"upstream" for bdui means exactly one repository: **`gastownhall/beads`**. This
skill watches that repo for changes that affect the `bd` contract bdui parses,
and for new `bd` surface bdui could adopt.

It is **read-only against the network**: it never posts issues, comments, or
PRs, and never writes to any `bd` workspace. Its only writes are Markdown files
under `docs/upstream/`.

## What counts as upstream (baseline model)

bdui does not vendor Beads as a dependency, so there is no `go.mod`/lockfile to
diff. The baseline is:

1. The **installed `bd` version** (`bd version`) that bdui is tested against.
2. The **JSON contract** bdui normalizes in `src/bd/parser.ts` (fields,
   `KNOWN_STATUSES`, dependency handling) and the argv it sends from
   `src/bd/commands.ts`.
3. The last recorded state in `docs/upstream/STATUS.md` and the newest entry in
   `docs/upstream/UPSTREAM_JOURNAL.md`.

## Integration touchpoints (where an upstream change lands)

Use this map to turn an upstream diff into concrete bdui impact.

| Upstream change in `gastownhall/beads`                              | Affected in bdui                                                                 | Class hint |
|--------------------------------------------------------------------|---------------------------------------------------------------------------------|------------|
| New / renamed field in `bd list --json` output                     | `src/bd/parser.ts` (`normalizeIssue`) — silently ignored today, may be adoptable | Feature/Breaking |
| New or renamed `status` value                                      | `src/bd/parser.ts` `KNOWN_STATUSES` + `displayStatus`; `src/state/store.ts` columns (Other catches unknowns) | Breaking |
| New issue `type`                                                   | `src/bd/parser.ts` (types preserved); create/edit forms; creatable-types list  | Feature |
| Changed dependency semantics / new dependency types                | `src/bd/parser.ts` blocking pass (`blocker.status !== 'closed'`, `blockedBy`)   | Breaking |
| Changed `bd where --json` shape (workspace discovery)              | `src/bd/parser.ts` (`where` read)                                                | Breaking |
| Changed flags/`--json` output of create / update / close           | `src/bd/commands.ts` argv                                                        | Breaking |
| Changed process / exit / stderr behavior                           | `src/bd/client.ts` (`runBd`)                                                     | Breaking |
| Priority scale change (P0–P4)                                      | `src/state/store.ts`; parser priority handling                                  | Breaking |
| New polling/stream/event surface (e.g. a watch command)            | `src/bd/watcher.ts` (`BeadsWatcher` polls today)                                | Feature |
| New top-level command enabling a view/filter (`query`, `search`, …)| new view/filter opportunity                                                      | Feature |

Commands bdui **already** invokes: `list`, `where`, `create`, `update`,
`close`, `forget`. Everything else `bd` offers is Feature-Radar territory.

## Workflow

Run stages in order. Prefer the copy-paste commands below; adjust the `--since`
window from the argument or the recorded baseline.

### Stage 1 — Gather upstream state

```bash
REPO=gastownhall/beads
# Recent commits (subject lines) — narrow with --since if a baseline date exists
gh api "repos/$REPO/commits?per_page=40" \
  --jq '.[] | "\(.sha[0:8])  \(.commit.author.date[0:10])  \(.commit.message | split("\n")[0])"'
# Releases and tags
gh release list -R "$REPO" -L 8 2>/dev/null || \
  gh api "repos/$REPO/tags?per_page=8" --jq '.[].name'
# Open PRs (upcoming changes)
gh pr list -R "$REPO" --state open -L 15 --json number,title,labels \
  --jq '.[] | "#\(.number)  \(.title)"'
# Upstream changelog / release notes, if present
gh api "repos/$REPO/contents/CHANGELOG.md" --jq '.download_url' 2>/dev/null \
  | xargs -r -I{} sh -c 'echo "CHANGELOG: {}"'
```

If a baseline commit/date exists, prefer the exact diff:

```bash
gh api "repos/$REPO/compare/<baseline-ref>...HEAD" \
  --jq '.commits[] | "\(.sha[0:8])  \(.commit.message | split("\n")[0])"'
```

### Stage 2 — Establish the local baseline

```bash
bd version                       # version bdui is currently tested against
# What the local bd surface looks like now (Feature-Radar):
bd --help                        # compare command list vs. the "already invokes" set above
bd list --help                   # compare flags vs. src/bd/parser.ts
bd create --help                 # compare flags vs. src/bd/commands.ts
```

**Probe the live contract whenever `bd` is on PATH.** This is the highest-value
step: it catches contract drift without reading upstream source. Prefer a
reachable workspace; otherwise build a throwaway one, since the bdui repo has no
`.beads/`:

```bash
if bd where --json >/dev/null 2>&1; then WS=.; TMP=; else
  WS=$(mktemp -d); TMP=1
  ( cd "$WS" && bd init --prefix probe >/dev/null 2>&1 \
      && bd create "probe" --type task >/dev/null 2>&1 )
fi
( cd "$WS"
  bd list --all --limit 0 --json | jq -r 'if type=="array" then .[0] else . end | keys[]' | sort  # contract fields
  bd list --all --limit 0 --json | jq -r 'type'   # confirm flat array, not tree-nested
  bd statuses                                     # valid statuses + categories vs. KNOWN_STATUSES
  bd types )                                       # valid types vs. the creatable-types list
[ -n "$TMP" ] && rm -rf "$WS"
```

Interpret the output against bdui:

- **New JSON key** → `src/bd/parser.ts` may be ignoring usable data.
- **Status whose category is `active`/`wip`/`done`/`frozen` but which bdui does
  not map** → wrong presentation column (Other-fallback hides real work).
- **Built-in type bdui can't create** (e.g. `spike`/`story`/`milestone`) → form gap.

Note: `jq keys` reflects only the first issue's **non-null** fields, so populate
the probe issue (labels, deps, assignee, due) for a fuller field list.

Then read the recorded baseline: `docs/upstream/STATUS.md` and the top entry of
`docs/upstream/UPSTREAM_JOURNAL.md`. On the **first run** (no prior baseline),
treat everything as new and take a full inventory instead of a diff.

Cross-check the parser's assumptions in the tree:

```bash
rg -n "KNOWN_STATUSES|normalizeIssue|stringValue|blockedBy|displayStatus" src/bd/parser.ts
rg -n "'create'|'update'|'close'|'list'|'where'" src/bd
```

### Stage 3 — Analyze and categorize

Sort every material change into exactly one class:

- **Breaking** — will make bdui parse wrong, crash, or mis-display. Anything in
  the touchpoint table's Breaking rows. Give a concrete remediation pointing at
  the file(s) above.
- **Feature opportunity** — new `bd` command, flag, field, type, or status bdui
  could surface. Give a rough effort estimate (S/M/L) and the view/module it
  would touch.
- **Informational** — real upstream activity with no bdui impact (docs, internal
  refactors, unrelated subsystems). Keep short; it explains the gaps.

Ignore churn that cannot reach bdui through the `bd --json` boundary.

### Stage 4 — Write the research document

Write `docs/upstream/upstream-check-<YYYY-MM-DD>.md` (use `date +%F`) with:

```markdown
# Upstream check — <date>

**Baseline:** bd <old-version> → <new-version-or-"unchanged"> · bdui <version>
**Upstream range:** <baseline-ref/date> … <HEAD sha> (gastownhall/beads)

## TL;DR
<2–4 sentences: is action needed, and how urgent.>

## Breaking changes
| Change | Impact in bdui | Remediation | Ref |
|--------|----------------|-------------|-----|
| …      | src/bd/…       | …           | <sha/PR> |

## Feature opportunities
| Capability | bdui surface | Effort | Ref |
|------------|--------------|--------|-----|
| …          | …            | S/M/L  | <sha/PR> |

## Informational
- <one line each>

## Recommended actions (priority order)
1. …
```

Leave any section empty rather than padding it. No fabricated shas.

### Stage 5 — Update the tracked baseline

- **Prepend** a dated entry (newest first) to
  `docs/upstream/UPSTREAM_JOURNAL.md`: date, checked range, one-line summary,
  and a link to the research doc.
- Rewrite `docs/upstream/STATUS.md` with: last check date, current baseline `bd`
  version, newest reviewed upstream sha, open action count, and the newest
  journal link.

## Guardrails

- Network access is **read-only**: only `gh api`, `gh pr list`, `gh release
  list`, and `WebFetch`. Never `gh issue`/`gh pr`/`gh api -X POST|PATCH|PUT`.
- Do **not** create, update, or close anything in a `bd` workspace, and do not
  post to GitHub. Findings become issues only when the maintainer acts on the
  doc.
- Writes are confined to `docs/upstream/`. Do not edit `src/`, `CLAUDE.md`, or
  `AGENTS.md` from this skill — the doc's action list is the handoff.
- Report faithfully: if the upstream range is empty or a step could not run
  (no `bd` workspace, no `gh` auth), say so in the doc instead of guessing.
