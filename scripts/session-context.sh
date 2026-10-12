#!/bin/sh
# SessionStart context for repositories that use SpecsGraph. Prints a few lines, which Claude Code adds to the
# session, only when the repository opted in: its AGENTS.md carries the marker that /specsgraph:setup writes, or
# SPECSGRAPH_PROJECT is set. Silent everywhere else. No network, no writes.

dir=${CLAUDE_PROJECT_DIR:-.}
marker='<!-- specsgraph:begin -->'

opted_in=
if [ -n "${SPECSGRAPH_PROJECT:-}" ]; then
  opted_in=1
elif [ -f "$dir/AGENTS.md" ] && grep -qF "$marker" "$dir/AGENTS.md" 2>/dev/null; then
  opted_in=1
fi
[ -n "$opted_in" ] || exit 0

if [ -n "${SPECSGRAPH_PROJECT:-}" ]; then
  project="the SpecsGraph project \"$SPECSGRAPH_PROJECT\""
else
  project="SpecsGraph (the project is named in AGENTS.md)"
fi

printf '%s\n' \
  "This repository's spec lives in $project, reached through the specsgraph MCP server." \
  "Before changing behaviour, read the affected artefacts with spec_get (scope main) and check workstream_list for work in flight." \
  "Stage spec changes with spec_apply into a workstream; a person accepts them (or you, where the project has Agent autonomy on)." \
  "Main moves when a task publishes: by a person, or by an agent where the project allows it." \
  "To implement agreed work, take a work item with work_item_claimNext, reuse the claimant it returns, and cite the item (T-12.1) in the pull request title; the merge marks it done." \
  "Cite artefact names and display ids such as WS-3 and T-4 in commit messages and pull request descriptions."
