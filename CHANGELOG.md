# Changelog

All notable changes to the SpecsGraph skills are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning: [SemVer](https://semver.org). The version lives in `.claude-plugin/plugin.json` and is bumped on every release, because Claude Code only offers an update when it changes.

## 0.8.0 (2026-10-12)

SpecsGraph lets agents take a project from spec to built code (AGENT-FLOW-PLAN). The MCP server now has 59 tools (18 read, 41 write). The new tools are `build_clusters`, `build_plan`, `roadmap_manage`, `build_markImplemented`, `work_item_claimNext`, `work_item_claims` and `task_publish`. `spec_apply` takes `route`; `task_route` takes `addUnrouted`, `ready`, `items` and `publish`; `work_item_claim` takes `claimant`; `work_item_update` takes `claimant` and `done`. A new project setting, Agents may publish (Admin, needs Agent autonomy), lets agents publish; a person publishes otherwise.

### Added
- `specsgraph-build`: the end-to-end loop and the multi-agent playbook. Check (`project_list` flags, `build_status`, `completion` from `build_clusters`); a fast spec pass (`spec_apply` up to 500 documents per call, then `task_route` with `addUnrouted`, `ready` and `publish`, or `route` on the last call when small, items left to `build_plan`); a baseline for existing code (`build_markImplemented` with a note and `codeRef`); the plan, in one planner session (`build_clusters`, `build_plan` with `milestones`, repeated while `remaining`, `roadmap_manage`); the work loop per agent (`work_item_claimNext` with the server-given claimant, `previous`, a branch and pull request citing T-n.s, `work_item_update` with `codeRef`, heartbeats, `done` when no repository is watched, the `reason` of an empty answer); the multi-agent rules (`work_item_claims`, one item per claimant, never another session's item); and a table of refusals and what they mean.

### Changed
- Engineer: no separate `proposal_open` step (`spec_apply` opens the Proposal). Agent autonomy covers `task_route` with `addUnrouted` and agent publish (`task_publish`). "Build status and the roadmap" covers `build_markImplemented`, `roadmap_manage`, the empty-roadmap path and the hand-over to `specsgraph-build`. "Implementing agreed work" takes items with `work_item_claimNext` and a claimant, cites T-n.s, continues from `previous`, and completes with `done` only when no repository is watched.
- Ingest: under Agent autonomy, direct writes in batches of up to 500 documents (no `stage: true`), 25 to 50 when staged for review, and a final phase that routes, readies and publishes with `task_route` (`addUnrouted`) or `spec_apply` `route`. `proposal_get` before each phase only when staging.
- Director: routes "build the app end to end" to `specsgraph-build`, and describes the multi-agent fan-out (one planner session, N worker sessions, server-given claimants).
- Product and brownfield: a person publishes unless the project lets agents publish (`task_publish`). Brownfield records existing code with `build_markImplemented` under Agent autonomy; both offer `specsgraph-build`.
- `/specsgraph:setup` writes the autonomy line, the agent publish line, `work_item_claimNext` with a claimant, T-n.s in pull request titles, `work_item_claims` and the end-to-end loop line. The session reminder says Main moves when a task publishes, by a person or by an agent where the project allows it.
- README: six skills, the Build step of the loop, Agents may publish in the loop, principles and FAQ.
- `scripts/tools.json` regenerated from the 59-tool registry.

## 0.7.0 (2026-10-11)

SpecsGraph adds work items, a derived build status, a roadmap and two new kinds. The MCP server now has 52 tools (16 read, 36 write). The new tools are `work_item_next`, `work_item_claim`, `work_item_update`, `build_status` and `roadmap_get`. `proposal_plan` takes `workItems`. `thread_open`, `thread_ask` and `thread_list` take `item` and `workstream: main`, and `thread_ask` takes `askUser`.

### Added
- Engineer: "Implementing agreed work", which takes a work item with `work_item_next` and `work_item_claim`, reads the spec at the item's `read.scope`, names the item in the pull request, records it with `work_item_update` (`codeRef`), heartbeats and asks with `thread_ask` (`item`, `blocking`) when stuck. The merge, not the agent, marks the item done.
- Engineer: "Build status and the roadmap", which reads `build_status` and `roadmap_get` before answering what is built or what comes next.
- Engineer: the Architecture kinds, `decision` (status, background, resolution, consequences, alternatives, `applies-to`) and `constraint` (category, statement, measure, `applies-to`).

### Changed
- Engineer: bounded contexts carry the context map (`upstreams` with a pattern); use cases carry `preconditions`; a new integration event needs a `bounded-context-id`; roles carry `actor-kind`; threads and questions may be on Main.
- Product: features and scenarios link the use cases that realise them (`use-cases`); roles may be external systems.
- Brownfield: build status replaces "SpecsGraph has no implemented flag": a person marks mapped code as implemented on the Build page. The code-to-kind table adds context map, external systems, decisions and constraints.
- Ingest: sixteen kinds, the context map, decisions and constraints in the foundation, use cases on features, and a closing note on marking existing code as implemented.
- Director: sixteen kinds in six groups, and build or roadmap questions answered read only.
- `/specsgraph:setup` writes the work-item section the web app's Connect an agent panel shows. The session reminder mentions work items.
- README: the loop adds a Build step, the kind table has 16 kinds, and the FAQ says an agent cannot mark code done.
- `scripts/tools.json` regenerated from the 52-tool registry.

## 0.6.0 (2026-10-10)

SpecsGraph adds Agent autonomy, a per-project setting an Admin controls (on for new projects, off for existing ones). The MCP server now has 47 tools (13 read, 34 write). The new tools are `member_list`, `proposal_accept`, `task_route`, `task_assign`, `task_submitReady`, `task_markDone`, `thread_resolve`, `thread_answer`, `workstream_discardChange`, `workstream_resolveConflict`, `workstream_complete` and `workstream_abandon`. `task_open` takes `artefactIds` and `assignee`, and `spec_apply` takes `stage`.

### Changed
- Product, engineer and brownfield: with Agent autonomy on, `spec_apply` writes agreed documents straight into the workstream (`stage: true` keeps a review), and the skill may accept, route, assign and submit Ready for what the user agreed, in one `proposal_accept` when it can. Without it, those acts stay a person's, as before. Publishing stays a person's act either way.
- Ingest: under Agent autonomy, an import still stages for review (`stage: true`) unless the user asks for direct writes.
- `/specsgraph:setup` and the session reminder mention Agent autonomy.
- README: the loop, design principles and FAQ cover Agent autonomy.
- `scripts/tools.json` regenerated from the 47-tool registry.

## 0.5.0 (2026-10-09)

### Changed
- `specsgraph-ingest` reads every source a project lives in, not only the tracker. Phase 1 starts with a source inventory (tracker, code, Figma and other designs, Confluence or Notion, Drive or SharePoint, Slack or Teams, API and data specs, meeting notes). Each source records how it is reached and its read status, and an unreachable source becomes a gap and a question, never a silent skip. A table says what to take from each kind of source and which artefacts it yields. Every fact carries a short source reference. The blueprint reconciles sources with an agreed precedence and turns contradictions (ticket against design against code against chat) into questions. It also keeps a coverage matrix per source. Reading never writes to a source.
- Director routes whole-project capture from code, designs, docs or chat to `specsgraph-ingest`.
- README: what the skills read for an ingest, and that they only use connectors and credentials the user already has.

## 0.4.0 (2026-10-09)

### Added
- `specsgraph-ingest`: captures an existing project from its tracker backlog, documents and attachments (optionally its code) into one workstream, in phases. The phases are snapshot, blueprint, foundation, model per context, behaviour per context, questions, and an optional verify. Every kind's fields are filled, and every unconfirmed point is staged as a default and asked with `thread_ask` (options, current default, source keys, deduplicated against `thread_list`). A ledger and per-context briefs on disk make the import resumable and cheap to continue. It follows the MCP contracts closely: cheap reads (`fields`, `kind`, `context`, `state`, `cursor`, `maxBytes`), `idempotencyKey` on every write, `dryRun` for a new kind, optional plans per context, the `thread_ask` refusals, and `answeredSince` taken from the server's own timestamps. It also covers what real imports hit: Proposals accepted mid-run, YAML quoting, read-model key and mapping, handler triggers that need the other contexts' events first, twins across contexts.

### Changed
- Director routes backlog and document imports to `specsgraph-ingest`.
- Brownfield hands a whole-project capture over to `specsgraph-ingest`.
- README: five skills, and the version badge now follows `plugin.json`.

## 0.3.0 (2026-10-08)

SpecsGraph SDLC P1 is live: the MCP server has 35 tools (12 read, 23 write). `task_submitReady` is gone; `thread_ask`, `proposal_plan` and `proposal_assign` are new, and `spec_apply` takes `plan`.

### Changed
- `/specsgraph:setup` writes the section the web app's Connect an agent panel shows: read `workstream:WS-n` while the spec is in flight, ask with `thread_ask` instead of guessing, people mark a task Ready and publish it and the landing marks it done, cite tracker keys such as KAN-43. It no longer names `task_submitReady`.
- Product, engineer and brownfield: stage work for a task into a plan (`spec_apply` with `plan`, `proposal_plan`, `proposal_assign`); ask the team with `thread_ask` (options, `blocking`, `askTeam`) and collect answers with `thread_list` (`kind`, `answeredSince`); change requests hold an accept until the artefact is staged again; only a person reopens a question or a change request, and a conflict thread never reopens. Closing steps say Ready is a person's act and the task moves to Done when its publication lands.
- Director: orientation checks a workstream for questions still waiting on people.
- README: plans, and no tool marks a Task Ready or answers a question.
- `scripts/tools.json` regenerated from the P1 tool registry.

## 0.2.7 (2026-09-29)

### Fixed
- `.mcp.json` names the server URL plainly. Claude Code filled in its shell-style default, but claude.ai and Claude Desktop showed it as a placeholder to replace when the plugin added its connector. The URL can no longer be overridden: SpecsGraph is cloud only.

## 0.2.6 (2026-09-29)

### Fixed
- `plugin.json` sets `icon` again: the directory listing reads the icon from that key and showed a letter without it.

## 0.2.5 (2026-09-29)

### Changed
- CHANGELOG wording only, for the directory scan.

## 0.2.4 (2026-09-29)

### Changed
- The SessionStart hook falls back to `.` for the project directory, so the directory scan no longer holds it.
- `plugin.json` drops `icon` and `privacyPolicyUrl` (the directory flagged them as unknown keys; it reads `.claude-plugin/icon.svg` and the README's privacy link on its own), and the unused `assets/specsgraph-og.png` is gone.

## 0.2.3 (2026-09-29)

### Changed
- `scripts/check-skills.mjs` (a maintainer check run in CI, never by the plugin) rewords its messages, so the directory scan no longer holds it.

## 0.2.2 (2026-09-29)

### Changed
- The README sends clients that cannot use OAuth sign-in to the agents documentation.
- The SessionStart hook prints its lines with `printf` instead of a here-document.
- `plugin.json` sets `icon` (`.claude-plugin/icon.svg`) and `privacyPolicyUrl`.

## [0.2.1] — 2026-09-28

### Fixed
- `spec_apply` has no proposal argument: the product, engineer and brownfield skills no longer pass `proposalId`. They pass `workstream` and `yaml`, and read `results[]` (`staged`, `unchanged` or `failed`, with the new `revision`) and the Proposal `revision` from the answer.
- `proposal_open` answers `proposal-already-open` when the workstream has one; the skills read it with `proposal_get` instead of expecting the open Proposal back. Its answer is `proposal` with `id`, `displayId` and `revision`.
- `spec_get` reads a workstream with `scope: workstream:WS-n` and staged revisions with `scope: proposal:<id>`; `proposal_ready` and `proposal_withdraw` name their `proposal`, `revision` and `expectedRevision`; `thread_open` takes the `workstream` and a `body`, and `anchor` is a JSON pointer; threads are read with `thread_list`.
- `proposal_finish` is open to an agent once every revision is accepted or withdrawn; the skills no longer call it a person's act.
- Event handler triggers use `aggregate-id`, `domain-event-id` and `integration-event-id`; a Map key is a primitive type node.
- The director explains the OAuth sign-in through `/mcp` first, the personal access token second, as `/specsgraph:setup` does.

### Added
- `scripts/tools.json`, a snapshot of the 33 MCP tools and their arguments, generated from the SpecsGraph monorepo by `scripts/gen-tools.mjs`.
- `scripts/check-skills.mjs`: fails when a skill, the command, the hook or the README names a tool that does not exist or pairs a tool with an argument it does not take. No dependencies.
- CI (`.github/workflows/validate.yml`): `claude plugin validate --strict .` and the check script on every push and pull request.

## [0.2.0] — 2026-09-28

### Added
- The plugin declares the SpecsGraph MCP server (`.mcp.json`): server `specsgraph`, streamable HTTP at `https://mcp.specsgraph.io/mcp`, overridable with `SPECSGRAPH_MCP_URL`. No token in the config: Claude Code signs in with OAuth through `/mcp`.
- `/specsgraph:setup`: checks the connection with `project_list`, picks the project, and proposes the "Specs live in SpecsGraph" section for `AGENTS.md` and an `@AGENTS.md` line for `CLAUDE.md`; shows the diff and writes only after approval. Marker comments make a second run update the section in place.
- SessionStart hook: four lines of context in repositories whose `AGENTS.md` carries the marker, or when `SPECSGRAPH_PROJECT` is set; silent elsewhere. POSIX sh, no network, no writes.
- `displayName` "SpecsGraph" in the plugin manifest.

### Changed
- README: install brings the MCP server; connect by OAuth, personal access token for clients without OAuth; new "Set up a repository" section.

## [0.1.1] — 2026-09-27

### Fixed
- Marketplace manifest: the plugin `source` is the path string `./`, and skills are discovered from `skills/` instead of being listed twice. With 0.1.0 the plugin installed but failed to load.
- Marketplace description added; `claude plugin validate` passes with no warning.

## [0.1.0] — 2026-09-26

First release, built for the SpecsGraph model v2 MCP surface: the document loop `spec_get` → edit YAML → `spec_apply` into the workstream's open Proposal, 14 artefact kinds, person-only accept, scope and publish.

### Added
- `specsgraph-director`: reads project state and conversation, routes to a specialist; read-only.
- `specsgraph-engineer`: six-stage modelling interview (Language, People, Boundaries, Model, Behaviour, Contracts) covering subdomains, bounded contexts, aggregates, value objects, enums, use cases, event handlers, scheduled jobs, data contracts, read models, integration events, terms and roles; boundary tests; examples-before-rules; stage on agreement.
- `specsgraph-product`: why → who → what → prove feature authoring, value tests, Gherkin scenario rules, roles and terms in plain language.
- `specsgraph-brownfield`: question-led slice ingest, code-to-kind mapping for all 14 kinds, evidence and confidence on every proposal, agreed intent over build status.
- Plugin and marketplace manifests for Claude Code; portable `SKILL.md` layout for `npx skills`, Codex, Cursor and GitHub Copilot.
- Brand assets: logo, banner, skill icons and the loop diagram under `assets/`.
