# Changelog

All notable changes to the SpecsGraph skills are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning: [SemVer](https://semver.org). The version lives in `.claude-plugin/plugin.json` and is bumped on every release, because Claude Code only offers an update when it changes.

## 0.2.4 (2026-09-29)

### Changed
- The SessionStart hook falls back to the current directory as `.` instead of `$PWD`, which the directory scanner read as a password.

## 0.2.3 (2026-09-29)

### Changed
- `scripts/check-skills.mjs` (a maintainer check run in CI, never by the plugin) words its messages without "pass", which the directory scanner read as a password beside the MCP URL.

## 0.2.2 (2026-09-29)

### Changed
- The README no longer shows a token read from the environment: clients that cannot use OAuth follow the agents documentation. The plugin itself never reads a credential.
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
