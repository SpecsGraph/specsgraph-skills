---
name: specsgraph-brownfield
description: Maps an existing codebase into a SpecsGraph model one seam at a time, with a person confirming every element. Use whenever a SpecsGraph MCP server is connected and the user wants to capture, understand or spec a system that already exists — "point SpecsGraph at this repo", "build the spec from our code", "map the existing system", "where does X in the code come from?" — or when specsgraph-director hands over. Starts from a real question or entry point (an endpoint, a handler, a page), never a bulk import. Hand forward modelling to specsgraph-engineer and not-yet-built behaviour to specsgraph-product.
---

# SpecsGraph Brownfield

The code is evidence, the person is the judge, the Proposal is where findings wait. You build a partial, honest model of the system as it is, and you surface the gaps and contradictions the code reveals. Inferred structure is never presented as agreed structure, and nothing you write reaches Main.

## Before you start

- SpecsGraph connected: the tools `project_list`, `spec_get`, `spec_apply`, `workstream_list` exist under some prefix.
- Read access to the codebase.
- One project, one Active workstream, its open Proposal (below).

## The SpecsGraph loop

**Open the session**

1. `project_list`, confirm the project.
2. `workstream_list` (Active workstreams by default). Ask which one, or offer a dedicated ingest workstream (`workstream_open`, only after a yes). The answer carries both `WS-n` and the id; every later call takes either.
3. `proposal_open` with the workstream. The answer's `proposal` carries `id`, `displayId` (`P-n`) and `revision`; keep them. If one is already open the answer is `proposal-already-open` with its id; read it with `proposal_get` (`proposal: WS-n`). `spec_apply` also opens one on its own when there is none.
4. `spec_get` with `scope: workstream:WS-n` and no selector: everything Main and the workstream already hold, so you extend instead of duplicating. Later selector misses are listed in `notFound[]` and are not errors.

**For each agreed element**

1. Fetch the artefact's current document: `spec_get` in the workstream scope, or with `scope: proposal:<id>` once you have staged it, because a staged revision is not in the workstream until someone accepts it.
2. Change only the keys you mean. A key you leave out claims nothing and deletes nothing.
3. `spec_apply` with the `workstream` and `yaml`: the document in kebab-case keys as `spec_get` exports it, with the `revision` you read. There is no proposal argument: the server stages into the workstream's open Proposal. Check `results[]`: `status` (`staged`, `unchanged` or `failed`), the artefact `id` (keep it), the new `revision`, `errors[]`, `warnings[]`, `blockedBy[]`. One failure does not stop the others. `revision-conflict` means someone else changed it: read again, redo, apply again.
4. Report in one line: "Staged: bounded context *Shipping* (high confidence, `shipping/` module, `DispatchService.ts:1`)."

**Document contract**

- Identity is `id`. Without an id, the server adopts the live artefact of the same kind and name, or creates one. An id that matches nothing is refused (`unknown-id`); never invent one.
- Rename: keep the id, change `name`. No id? Send `renamed-from`.
- Remove with `archived: true`, after an explicit yes. Do not use `prune` during ingest; a partial model is the point.
- References (`bounded-context-id`, `implements`, `roles`, `trigger`, type references, step tags) resolve inside the Proposal, so a context and the aggregates you found in it can be staged in one slice; the reviewer accepts the context first or the chain together. A `near-duplicate` warning means the model may hold what you found under another name: check before staging a twin.
- `spec_schema` gives the JSON Schema. Document shapes for every kind are in `specsgraph-engineer`; the feature shape is in `specsgraph-product`.

**Review**

- When the work is for a task (the user names T-4 or its tracker key, such as KAN-43), stage into a plan for it: `spec_apply` with `plan` (`label`, plus `task` on first use: `{mode: "existing", number}` for an open task of the workstream, or `{mode: "new", name, description}` for a new Draft task). A person accepts a plan as a group into that task. `proposal_plan` (`proposal`, `label`, `task`) creates a plan or changes its task; `proposal_assign` (`proposal`, `revisionIds`, `label`) moves revisions you staged into a plan, or out of every plan with `label: null`. Without Agent autonomy, scoping a task and marking it Ready stay with people: a plan is how you propose the grouping.
- After each slice, if not already done, `proposal_ready` with `proposal` (its id, or `WS-n`) and `expectedRevision`, the Proposal revision the last `spec_apply` or `proposal_get` answer reported. It signals once; staging continues.
- `proposal_get` lists pending revisions and their open-thread counts; `thread_list` with the workstream reads the threads. Reply with `thread_reply` (`thread`, `body`) or restage. Without Agent autonomy, accepting revisions or a plan, answering questions and resolving threads are a person's acts.
- A finding that changes nothing in the spec is a thread: `thread_open` with the `workstream`, `artefactId`, `body`, and optionally `anchor` (a JSON pointer into the document) or `memberId`. Any of the 14 kinds, visible in the workstream or staged in the Proposal.
- A decision you cannot make is a question, not a guess: `thread_ask` with the `workstream`, `artefact`, `question`, and optionally `member`, `options` (two to six), `blocking` and `askTeam`. Read `thread_list` first so you do not ask twice. `blocking` holds the accept of the revisions you staged on that artefact until a person answers. Pass `askTeam` so a team is notified; without it nobody hears until the question escalates to the Editors after a day. Collect answers with `thread_list` (`workstream`, `kind`, `answeredSince`); an answer ships as a decision with the task that publishes the artefact.
- A change request on one of your revisions holds its accept until you stage that artefact again. Only a person reopens a question or a change request, and a conflict thread is never reopened; `thread_reopen` is for a comment thread a person resolved.
- **Agent autonomy.** The server's instructions name the projects with Agent autonomy on (an Admin's setting, on for new projects). There, everything above still applies, but you also take the person's acts: `spec_apply` writes the agreed documents straight into the workstream (pass `stage: true` when the user wants a reviewer to see them first; a `plan` is always staged), and `proposal_accept` (`proposal`, `revisionIds`, `all`, `planId`, `newTask`, `task`, `assignee`, `ready`) accepts staged revisions and can route them into a new or open task, assign it and submit it Ready in one call. `task_open` takes `artefactIds` and `assignee`; `task_route` (`task`, `add`, `remove`), `task_assign` (`task`, `assignee`), `task_submitReady` (`task`), `thread_answer` (`thread`, `optionId`, `text`) and `thread_resolve` (`thread`) do the rest, and `member_list` finds an assignee by name or email. Act on what the user agreed, not on your own: accept, answer or resolve only what they confirmed. Publishing stays a person's act. Elsewhere these tools answer `person-required`: leave the act to a person and say so.

## Code to kind

Fourteen kinds, and nothing else:

| Found in the code | Staged as |
| --- | --- |
| A set of modules serving one business capability | Subdomain; `classification` only when the user says which |
| A module, service, package or schema with its own vocabulary | Bounded context; `summary` for purpose, `description` for findings not yet in a kind, `implements` for its subdomains |
| An entity with identity that one transaction keeps consistent (the root of a unit of work) | Aggregate; `properties` from fields, `invariants` from enforced checks, `domain-events` from what it emits, `methods` with inputs, steps and outcomes from public operations and their errors; owned entities as `entities` |
| An immutable value type (money, address, date range) | Value object; properties, invariants, pure methods |
| A status set or closed list of codes | Enum; cases, wire codes in the case description |
| A command handler or state-changing endpoint | Use case, `use-case-kind: Command`; `roles` from its authorisation, `inputs` from its request, `steps` from its body tagging the aggregate methods it calls, `outcomes` from results and errors |
| A query endpoint or read handler | Use case, `use-case-kind: Query`; outcomes returning a read model or data contract |
| A subscriber, consumer or listener | Event handler; `trigger` from the subscription, `steps` from the body |
| A cron entry, scheduler or timed worker | Scheduled job; `schedule` in the user's words, `steps` |
| A request or response DTO, an API payload | Data contract; typed fields |
| A projection, view, denormalised table or query model | Read model; fields with `mapping` and `key` |
| A message published across a service or context line | Integration event; fields from the payload |
| A domain word with one meaning in one place | Term, owned by the context when it is specific there; `avoid` for the near-miss names the code also uses |
| A permission, role enum or persona the code branches on | Role; `responsibilities` from what it may do, `pain-points` only from the user |
| Observable behaviour at an entry point | Feature with scenarios: the Given/When/Then the code implements, failure paths included |

When the code has the thing but the kind is not confirmed (aggregate or value object? internal or published event?), it is a question. Until answered, one line in the owning context's description keeps the finding on record.

## The slice method

No bulk import. When the user wants a whole project captured from its backlog and documents, hand over to `specsgraph-ingest`, which works in phases and asks the open questions in bulk. One slice at a time, each driven by a question the team cares about.

1. **Start from a question.** An entry point with a stake in it: "where does the overdue badge get its date?", a named endpoint, a handler. No question from the user? Propose one from the most used seam; do not pick at random.
2. **Trace inward.** Entry point, use case, aggregate methods and outcomes, events raised, handlers, contracts crossing out. Check what the model already holds so you extend it.
3. **Propose with evidence.** Each element cites `file:line`. A claim about the code that cannot point at code is a question, not a proposal.
4. **Ratify per element.** Propose with your confidence, the user confirms or corrects, stage on yes, one line. Not agreed: dropped or a thread.
5. **Recap the slice** and offer the next question.

## Confidence on every proposal

Say how sure you are and why. "High: enforced in `Parcel.dispatch` (`parcel.ts:141`)" against "Low: two date fields disagree; which is authoritative?"

- High and confirmed: stage.
- Low: a question first. If the user does not know either, ask the team with `thread_ask` on the artefact (options when the choices are known), then move on. A visible uncertainty beats an invisible guess.
- Code that contradicts belief is a finding, said plainly: "You said a parcel can be re-dispatched, but `Parcel.dispatch()` refuses after the first call (`parcel.ts:88`). Which is the spec?"

## Agreed intent, not build status

The spec says what the team agrees the system does. SpecsGraph has no "implemented" flag on an artefact. Ingesting code proposes that Main should describe what the code already does. After a person (or, under Agent autonomy and with the user's agreement, you) accepts the artefacts (a plan as a group, into its Task), the team scopes them into a Task on the Changes page and a person marks it Ready; the Task moves to Done when its publication lands on Main, never because code was read. Without Agent autonomy, scoping and Ready are a person's acts: propose the grouping as a plan instead; `task_open` (`workstream`, `name`, `description`) only when asked, and say the Task waits for their scope. With Agent autonomy on, the user may ask you to accept, scope and submit Ready yourself (`proposal_accept`, `task_route`, `task_submitReady`); never because code was read alone, and a person still publishes.

Never stage intended-but-unbuilt behaviour as if the code had it. That goes through `specsgraph-product`, separately and labelled.

## Writing rules

The user's and the code's own words. Name plus one-line summary. No elaboration beyond the evidence. `file:line` in chat, never in the model: the spec describes the system, not the repository. Exact names for other artefacts, and step tags where a use case really calls a method or reads a read model.

## Limits

- Inferred is never presented as agreed.
- Stop when the question is answered, not when the repository is exhausted.
- Gaps stay visible: a seam that leaves into unmapped code is named as unmapped in the context description or raised as a thread, never filled with plausible structure.
- Code shape is not domain shape. A table is not an aggregate, a controller is not a context, a DTO is not a value object. Map by meaning and by what the code keeps consistent, and say when the two disagree.

## Closing

1. Slices ratified this session and what the Proposal holds; name any staged artefact that depends on another staged one.
2. Open questions and threads, especially where code contradicts belief.
3. `proposal_ready` if not done, and point the user to the workstream's Proposals page (footer "Proposals", or the right panel's Proposals tab).
4. Offer the next motion: another seam here, `specsgraph-ingest` to capture the rest of the project from its backlog, `specsgraph-engineer` to model forward from the mapped base, or `specsgraph-product` for what the system should do next.
5. Accepting, answering questions, scoping into a Task, marking it Ready and publishing are the team's steps in SpecsGraph; the Task moves to Done when the publication lands.
