# Changelog

All notable changes to the SpecsGraph skills are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning: [SemVer](https://semver.org). The version lives in `.claude-plugin/plugin.json` and is bumped on every release, because Claude Code only offers an update when it changes.

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
