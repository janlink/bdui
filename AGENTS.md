## Work Tracking

Public bug reports and feature requests belong in this repository's GitHub
Issues. Maintainers and coding agents may also use a local **bd (Beads)**
workspace for implementation tracking when `bd where --json` succeeds.

For a configured local workspace, run `bd prime` for the current workflow
contract. Quick reference:

- `bd ready` — find unblocked work
- `bd create "Title" --type task --priority 2` — create a local work item
- `bd update <id> --claim` — claim work atomically
- `bd close <id> --reason "Completed"` — complete work
- `bd dolt push` — sync only when the workspace has an authorized Dolt remote

Use `--json` for programmatic output. Do not use `bd edit` in automated or
non-interactive workflows because it opens an editor. Do not initialize or
commit a local `.beads/` workspace as part of an unrelated contribution.
