---
description: Connect this repository to SpecsGraph and add the "Specs live in SpecsGraph" section to AGENTS.md
argument-hint: "[project name]"
---

# Set up SpecsGraph for this repository

Connect this repository to a SpecsGraph project and write the instructions agents read at the start of every session. Ask before every write; change nothing the user has not approved.

## 1. Check the connection

Call `project_list` on the SpecsGraph MCP server (match the tool name, whatever prefix the connection has).

- **Tool missing:** the server is not connected. Tell the user: the plugin declares a server named `specsgraph` at `https://mcp.specsgraph.io/mcp`; run `/mcp`, pick `specsgraph` and sign in in the browser. Stop here.
- **401 or sign-in error:** same instruction, `/mcp` and sign in again. Stop here.
- **Empty list:** the account has no project yet. Say so, point to the web app to create one, and stop.

## 2. Pick the project

If `$ARGUMENTS` names a project, match it against the list (case-insensitive, by name or key). Otherwise, with one project, propose it; with several, list them and ask which one this repository belongs to. Confirm the choice in one line before going on.

## 3. Propose the AGENTS.md section

The section sits between two marker comments so a second run finds and replaces it instead of adding a copy. Fill in the project name:

```markdown
<!-- specsgraph:begin -->
## Specs live in SpecsGraph

This repository's spec (bounded contexts, aggregates, use cases, features, glossary terms) is in
SpecsGraph, project "<project name>", available through the `specsgraph` MCP server. Main is the spec that shipped;
a workstream (WS-3) holds the spec in flight until one of its tasks publishes.

Before you change behaviour, read first:
1. `project_list` to find the project, then `spec_get` for the documents you touch (`selectors` such as `kind/Name`): `scope: workstream:WS-n` while the spec is in flight in that workstream, `scope: main` for what shipped.
2. `workstream_list` and `workstream_listChanges` to see what a workstream already changes.
3. `task_list` and `thread_list` for the task and the review threads (open questions) you are working on.

When behaviour changes:
- Stage the spec change with `spec_apply` into the workstream. It lands in a proposal that a person reviews: accepted into the workstream; Main after a task publishes.
- One small proposal per change. Do not treat an open proposal as final; read the workstream, not Main, for what was accepted.
- Ask instead of guessing: `thread_ask` on the artefact, with options when the choices are known.
- People mark a task Ready and publish it; publishing moves the task on and the landing marks it done.
- If the project has Agent autonomy on, `spec_apply` writes the workstream directly, and you may accept (`proposal_accept`), route (`task_route`) and submit Ready (`task_submitReady`) what the user agreed; a person still publishes.
- Cite display ids such as WS-3 and T-4 (or the task's tracker key, such as KAN-43) in commit messages and pull request descriptions.
<!-- specsgraph:end -->
```

Work out the change at the repository root:

- **No AGENTS.md:** the new file holds the section alone.
- **AGENTS.md without the markers:** append the section after a blank line.
- **AGENTS.md with the markers:** replace everything from `<!-- specsgraph:begin -->` to `<!-- specsgraph:end -->`. If the result is identical, say the section is already up to date and write nothing.
- **CLAUDE.md:** Claude Code reads CLAUDE.md, not AGENTS.md. If CLAUDE.md exists and has no line that is exactly `@AGENTS.md`, propose adding it at the end. If CLAUDE.md does not exist, propose creating it with that single line. If the line is already there, leave the file alone.

## 4. Show the diff, then write

Show the user a unified diff of every file you would create or change, and ask for approval. Write only after a clear yes, and only the changes shown. Then say what changed in one or two lines and suggest committing AGENTS.md and CLAUDE.md so the whole team's agents get the same instructions.

From the next session on, the plugin's SessionStart hook recognises the marker and reminds the agent that this repository's spec lives in SpecsGraph.
