---
name: specsgraph-ingest
description: Turns everything that already describes an existing project (tracker backlog such as Jira or Linear, source code and API specs, Figma designs, Confluence or Notion, Drive documents, Slack decisions, attachments) into a complete SpecsGraph model in one workstream, every field filled, and logs every unconfirmed point or cross-source contradiction as an open question. Use whenever a SpecsGraph MCP server is connected and the user wants an existing project captured in bulk — "import our Jira project into SpecsGraph", "put everything from Jira, the code and Figma into the spec", "log the whole project so we can start coding", "what is still undecided?" — or when specsgraph-director hands over. Phased and resumable from a ledger on disk. For one seam of a codebase use specsgraph-brownfield; for new behaviour by interview use specsgraph-product or specsgraph-engineer.
---

# SpecsGraph Ingest

The sources are evidence, the team is the judge, the Proposal is where the import waits. You turn everything already written, drawn or built for a project, in every place it lives, into a model complete enough to start coding from, and you turn everything not yet decided into questions the team can answer. A default you chose is never presented as a decision: it is staged *and* asked.

Unlike `specsgraph-brownfield`, ingest is bulk. The person ratifies per phase on the Proposals page, not per element in chat. Agree the plan once, then work through it and report after each phase.

## Before you start

- SpecsGraph connected: the tools `project_list`, `spec_get`, `spec_apply`, `workstream_list` exist under some prefix.
- Read access to the sources, through what the user already has: connectors (MCP servers for the tracker, Figma, wiki, drive or chat), REST APIs with credentials from the environment, or local clones and exports. Nothing else is installed or called.
- One project and one workstream dedicated to the import (often named "Scaffold" or "Import"). Never mix the import with another effort's workstream.

## The SpecsGraph loop

Pass `project` (its key) on every call when the token reaches more than one project.

**Open the session**

1. `project_list`, confirm the project.
2. `workstream_list`. Ask which workstream receives the import, or offer to open one: `workstream_open` with `title` (and `externalKey` for the tracker key), only after a yes. Then `workstream_get` for its `version`, description, goals and open Proposal.
3. `artefact_list` with `scope: workstream:WS-n`, `fields` (`kind`, `name`) and `limit: 200`, paging with `cursor`: a cheap index of what Main and the workstream already hold. Read whole documents with `spec_get` only for what you will change. Extend, never duplicate.
4. `thread_list` with the `workstream`, `kind: question`, `status: all` and `fields`: what has already been asked.

**Reading cheaply**

- Lists page: pass `nextCursor` back as `cursor` until it is null. Raise `maxBytes` (up to 262144) instead of paging through many small pages, and keep `fields` minimal.
- `artefact_list` filters by `kind` (an array), `context` (a bounded context **id**, or `project` for context-less artefacts), `q` (name, summary or alias contains), and, in a workstream or proposal scope, `state` (`added`, `modified`, `archived`, `unchanged`). `mode: full` adds the document and its revision. Use it only for what you need member ids from (aggregate domain-event ids for triggers, integration events consumed).
- `spec_get` with `scope` and `selectors` (`kind`, `kind/Name`, `kind/Context/Name` or an id) returns YAML; each document carries its revision. Misses come back in `notFound[]`, not as errors.
- `proposal_get` with `proposal: WS-n`, `kind`, `state` and `fields` reads what is staged. Avoid `include: diff` on a large import; it returns every document twice.

**Staging**

- `spec_apply` with the `workstream`, `yaml` (multi-document, kebab-case keys as `spec_get` exports them) or `documents` (JSON objects with camelCase keys), and an `idempotencyKey` per call (`<project>-<phase>-<context>-<n>`). There is no proposal argument: the server stages into the workstream's open Proposal and opens one if none is open. A cancelled or timed-out call may still have completed; repeat it with the same `idempotencyKey` to get the stored result instead of staging twice.
- Batch: one call per kind group per context (about 25 documents). Documents run in batch order, and one naming another of the batch by name runs after it. Read `results[]`: `staged`, `unchanged` or `failed` with `errors[]` (a JSON-pointer path), `warnings[]` and `blockedBy[]`. Fix and resend only the failed documents. Optionally run the first batch of a new kind with `dryRun: true` to catch shape errors before anything is written.
- **A person may accept the Proposal while you work.** Never cache a proposal id across phases: call `proposal_get` with `proposal: WS-n` before each phase. To find ids of things you staged, use `artefact_list` with `scope: proposal:<id>` when a Proposal is open, else `scope: workstream:WS-n`. The proposal scope already includes the workstream.
- Identity is `id`. Without one, the server adopts the live artefact of the same kind and name in scope. Before creating, check whether the name exists (`artefact_list` with `q`); to change it, send the `id` and the `revision` from `spec_get` so a concurrent edit is detected. `revision-conflict` means read again and redo. A `near-duplicate` warning is a stop sign.
- References (`bounded-context-id`, `implements`, `roles`, `trigger`, type references) resolve inside the Proposal. Stage the target first: an enum or value object before the aggregate whose Ref points at it, aggregates before handlers that trigger on their events.
- To let reviewers accept one context at a time, stage each context into its own plan: `spec_apply` with `plan` (`label` such as the context name, and `task` `{mode: "new", name, description}` on first use). Only do this if the user wants a task per context; by default stage without plans.
- Shapes: `spec_schema` once per session. The document shapes for every kind are in `specsgraph-engineer`, and the feature shape is in `specsgraph-product`. Do not call `spec_schema` again in every batch or worker; paste the shapes a worker needs into its brief.

**YAML pitfalls seen in real imports**

- Quote every free-text scalar that contains `: `, `#`, `,`, `{`, `[`, `{{` or starts with a symbol. Step text, messages and descriptions are the usual offenders. Block scalars (`|`) are safest for descriptions.
- A read-model or data-contract field `type` is a type node (`{kind: Primitive, primitive: Text}`), never a bare word.
- Every read model needs at least one field with `key: true` and a `mapping` on every field; otherwise the server warns `no-key-field` or `read-model-field-unmapped`.
- `use-case-kind` is required to create a use case. An event handler `trigger` names a real aggregate and domain event (or an integration event), so it can only be staged after the model it listens to.

## Phases

Run them in order. Each phase ends with a one-line report and an update of the ledger (below). Ask before skipping a phase; if the user stops early, say exactly what is missing and write it to the ledger. **Never silently drop the questions phase.**

### 1. Source inventory and snapshot (no SpecsGraph writes)

**Inventory first.** A project's truth is spread out. Before reading anything in depth, list every source with how you can reach it, and show the list to the user: "Found Jira DIRIGEO (REST), the monorepo (local clone), Figma file *App V2* (connector), Confluence space DIR (no access). Anything else: Slack channel, Drive folder, OpenAPI file, meeting notes?" Look for links inside each source too: tickets link designs, repositories and documents, and READMEs link wikis. Record each source, its access path and its status (read, partial, no access) in the ledger. A source you cannot reach is a gap in the ledger and a question to the user, never silently skipped.

**Snapshot each source once** into a local working directory, not into the conversation. Keep raw exports and write one text digest per source. What to take from each kind, and what it becomes:

| Source | Take | Yields |
| --- | --- | --- |
| Tracker (Jira, Linear, GitHub issues) | every issue with description, custom fields, links, sub-tasks, **all comments**, status, attachments | features and scenarios from stories and acceptance criteria, rules, the decision ledger, questions from "waiting for customer" and unanswered comments |
| Wiki and docs (Confluence, Notion, PRDs, briefs, Drive, SharePoint) | pages and attached files, converted to text (docx to txt, pdf by pages, sheets as CSV) | context descriptions, business rules, glossary, pricing and limit tables, process flows |
| Designs (Figma, exported mock-ups, screenshots) | the page and frame list first, then the key screens and their states (empty, error, loading), visible copy, form fields, prototype flows | read models (what a screen lists), data contracts (form fields), use cases (buttons and flows), error messages for outcomes, scenarios from flows, terms from labels |
| Source code (repositories, monorepo apps) | module layout, entities and migrations, enums, routes and controllers, guards and permission maps, validators, schedulers, consumers, i18n files, README and architecture docs | contexts from modules, aggregate properties and invariants, enums, use cases with roles and outcomes, jobs and handlers, data contracts, and the tech stack for the workstream description. Map by meaning with the code-to-kind table in `specsgraph-brownfield` |
| API and data specs (OpenAPI, GraphQL schema, DB diagrams, event schemas) | operations, payloads, status codes, tables, topics | data contracts, outcome codes, integration events, property types |
| Chat and meetings (Slack, Teams, email, meeting notes) | threads and notes that mention the project, searched by project name, ticket keys and feature words, within the agreed date range | decisions and their dates, answered and unanswered questions, contradictions with the tickets |

Snapshot tactics:
- A tracker REST API is far cheaper than paging a tracker connector issue by issue. A design file is read as a frame list first, then only the frames that carry behaviour. Code is read by layout first, then by entry point, never file by file.
- Keep every fact traceable with a short source reference: tracker key (`DIRIGEO-26`), design frame (`Figma: Sign-up / Step 2`), code area (`code: billing module`), doc page (`Confluence: Pricing v3`), chat message (`Slack #dirigeo 2026-10-02`).
- Never write credentials, tokens or personal data from chat into the snapshot or the spec.
- Note everything not settled: open decision tickets, "waiting for customer", TBD values, questions without an answer in comments or chat, designs marked draft. These become questions.

### 2. Blueprint (no SpecsGraph writes)

From all the source digests together, produce one blueprint file on disk, the single source for every later phase:

- **Workstream text:** description (product summary, architecture and tech stack, context map, conventions, source links), goals, out of scope.
- **Subdomains** with classification, and **bounded contexts** with summary, description (responsibilities, upstream/downstream, integrations), icon, colour, `implements`, the source references each covers (tickets, frames, code areas, pages), and an exhaustive brief listing aggregates and states, every rule, number, limit, permission, error case, screen, event produced or consumed.
- **Roles** (summary, description, responsibilities, needs, pain points) and **terms** (definition, aka, avoid with reasons, owning context).
- **Decision ledger:** each decision found, with its source references and date, marked `confirmed` only when the ticket is Done, the client explicitly agreed in writing, or the code and the latest design both implement it unchallenged; else `open`.
- **Open-question ledger:** every open decision, contradiction between sources (ticket against design, design against code, an old doc against a recent chat decision), missing value a developer needs (prices, limits, retention, providers, timezones, templates, legal texts), with two to six options, the default you will stage, the source references, and the owning context.
- **Coverage matrix:** per source, what was read and what each context drew from it, so a reviewer sees that the Figma flows or the code modules were not ignored.

**Reconcile sources.** When two sources disagree, agree a precedence with the user once, and default to: an explicit, dated client decision (ticket comment, meeting note, chat) over ticket acceptance criteria over the latest design over the code over older documents. Stage the winner as the default, and still ask when the loser is recent or authoritative. Code that implements something no ticket or design mentions is a finding; ask whether it is intended. A ticket the code does not implement yet is still staged; the spec says what the team agrees, not what is built.

Two independent readers (one for structure, one for decisions and questions) and a merge beat one reader on large projects; with many sources, give each reader the digests of every source, not one source each, so contradictions surface. Then cut the blueprint into **one brief file per context**: its blueprint entry plus only the tickets, design frames, code areas and pages it covers, with sub-tasks and comments. Later phases read the brief, not the whole backlog.

Show the user the context list, role list and question count, and agree before writing.

### 3. Foundation

- `workstream_editDescription`, `workstream_editGoals` and `workstream_editOutOfScope` with the `workstream`, the `version` from `workstream_get`, and the text from the blueprint (up to 4000 characters of description; up to 50 goals or notes of 500 characters each). A stale `version` answers `version-conflict` and stages nothing: read `workstream_get` again between edits.
- `spec_apply`: subdomains, bounded contexts, roles, terms.
- Ask the cross-cutting questions now (phase 6 rules), anchored on the most relevant bounded context.

### 4. Model, per context

Order inside a context: enums, value objects, aggregates (typed properties, all invariants, domain events with typed payloads, entities, methods with inputs, steps, outcomes and `raises`), data contracts, and the integration events this context publishes.

Kind discipline: a balance, a counter or a record with fields is never an enum. Shared shapes (money, citation, address) live once, in the owning context, and other contexts carry an id or their own justified copy. Say which in the description.

### 5. Behaviour, per context

This phase starts only after phase 4 is done for **every** context, because handlers trigger on other contexts' events.

- **Use cases:** one per user or system action in the stories and sub-tasks, Commands and Queries, with `roles`, typed `inputs`, `steps` (step tags such as `{{method:Ctx/Agg.Method}}` and `{{outcome:Name}}` where they really apply), and `outcomes` (the success plus every failure, each with HTTP `code` and `message`).
- **Event handlers** with a resolved `trigger`; **scheduled jobs** with `schedule` (cadence and timezone in words); **read models** for every screen, list and dashboard, with `key` and `mapping`.
- **Features:** one per story, `intent` and `description` citing the tracker key, and scenarios covering the happy path and every acceptance criterion, rule and error case.

### 6. Questions

Every entry of the open-question ledger, plus whatever came up while staging, becomes a question. Ask them in the same phase that stages the artefact they concern; do not leave them all to the end.

- Read `thread_list` with the `workstream` and `kind: question` first, and skip what is already asked.
- `thread_ask` with the `workstream`, `artefact` (the id of the most specific artefact, visible in the workstream or staged in its Proposal, else the owning bounded context), `question` (Markdown, up to 4000 characters), `options` (two to six, each at most 200 characters, the staged default first), `blocking` (false unless the artefact is unusable without the answer), `askTeam` when the user names a team (without it nobody is notified until the question escalates to the Editors after a day), `member` when the point is one scenario, case, field or method, and an `idempotencyKey` (`<project>-oq-<n>`).
- Refusals: `artefact-not-in-scope` (pick an artefact in the workstream or its Proposal, or fall back to the bounded context), `unknown-team` (ask again without `askTeam` and tell the user), `thread-requires-workstream` (never ask on Main).
- Question body: the question; then `**Current default in spec:** …`; then `**Source:** <tracker keys>`. One decision per question.
- Collect answers later with `thread_list` with the `workstream`, `kind` and `answeredSince`. Pass the newest `answer.at` you have already seen, minus a minute, never your own clock. The first time, use the `createdAt` that `thread_ask` returned. Then restage what the answers change.
- A point that changes nothing in the spec but deserves a note for reviewers (a contradiction already resolved by a default, a twin kept on purpose) is a comment: `thread_open` with the `workstream`, `artefactId`, `body`, and optionally `anchor` or `memberId`.

### 7. Verify (optional, ask first)

This phase costs about as much as phases 4 and 5 together. Offer it; do not assume it. Per context, check that every field is filled, every acceptance criterion maps to an invariant, step, outcome or scenario, and that tenant scoping, ids, timestamps and statuses are present. A final coverage pass maps every ticket to an artefact or a question.

## The ledger

Keep one file next to the blueprint (for example `notes/specsgraph-<workstream>/TODO.md`) updated after every phase. It records what was staged per context (counts by kind), what is missing, questions asked against planned, known defects (a missing key field, a suspicious kind, twins), and how to resume. The ledger and the per-context briefs make a later session cheap. Point the user at it in the closing report.

## Token economy

- Read the sources once (phase 1); everything later reads the blueprint or one context brief.
- When delegating, give each worker two or three contexts and its brief files. Tell it which kinds to stage and not to call `spec_schema`. Ask for a one-line count per context back, not the staged documents.
- Fetch `mode: full` only for what you need ids from (aggregates for triggers, integration events consumed). Use `fields` on every list, and `kind`, `context` or `q` instead of listing everything.
- Workers load only the SpecsGraph tools they call (in clients with deferred tools, one tool search for `spec_apply`, `artefact_list`, `proposal_get`, `thread_list`, `thread_ask`).
- If the user asks to save tokens, cut verification first, then shorten wording. Do not cut field coverage, behaviour or questions, and say what you cut.

## Writing rules

The sources' own words, in the project's working language for names (English names with source-language terms recorded as `aka`, or the other way round, as the team prefers). Cite source references in descriptions so every rule is traceable: tracker keys, design frame names, document titles, and the module or area for code. Never cite file paths with line numbers (they rot; keep them in the ledger), credentials or personal data from chat. Unconfirmed values are staged as defaults and asked, never stated as fact.

## Limits

- Fourteen kinds and nothing else. A context map, deployment view or tech stack goes as prose in the workstream description or the owning bounded context description.
- Accepting revisions, answering questions, scoping tasks, marking them Ready and publishing are people's acts. Once the first coherent pass is staged, call `proposal_ready` with the `proposal` and `expectedRevision` (the Proposal revision from the last `spec_apply` or `proposal_get` answer; a stale one answers `proposal-changed`). Never `proposal_finish`, `proposal_discard` or `proposal_withdraw` someone else's work.
- The spec says what the team agrees the system should do. Code, designs and chat are evidence; where one contradicts another, that is a question.
- Reading a source never writes to it: no ticket comments, design edits, commits or chat messages unless the user asks.

## Closing

1. The source inventory with what was read, partly read or out of reach, then a table per context with counts by kind and the Proposal(s) holding them.
2. Questions asked against the ledger, the blocking ones first, and the decisions that block coding.
3. Known defects and what was skipped, from the ledger.
4. Point to the Proposals page, and offer `specsgraph-engineer` or `specsgraph-product` to deepen one area, or `specsgraph-brownfield` to check one seam against the code.
