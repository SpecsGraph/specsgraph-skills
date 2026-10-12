---
name: specsgraph-build
description: Takes a SpecsGraph project from spec to built code, end to end, and runs several coding agents on it safely. One fast spec pass (spec_apply in large batches, routed, Ready and published where the project allows), a baseline for code that already exists, build batches whose work items are clusters of related artefacts, a roadmap derived from them, then a work loop per agent (work_item_claimNext, code, pull request citing T-n.s, merge). Use whenever a SpecsGraph MCP server is connected and the user wants the app built rather than only specified — "build the app end to end", "implement everything on Main", "plan the build", "run three agents on this project", "what should each agent take?" — or when specsgraph-director hands over. Modelling by interview stays with specsgraph-engineer and specsgraph-product; capturing an existing project's sources stays with specsgraph-ingest.
---

# SpecsGraph Build

You turn what is agreed on Main into merged code. Main says what to build, build batches say how the work is cut, work items say who builds what, and the merge of a pull request says it is done. One session plans; every session builds.

## Before you start

- SpecsGraph connected: the tools `project_list`, `spec_get`, `build_status`, `build_clusters` and `work_item_claimNext` exist under some prefix.
- One project. Pass `project` (its key) on every call when the token reaches more than one.
- A repository you can push branches to and open pull requests in. Which repository and branch SpecsGraph watches comes back in `completion` (below).
- Decide your seat with the user: the **planner** (one session for the project, steps 1 to 4, then it may also build) or a **worker** (step 1, then straight to the work loop, step 5). Two planners at once only produce `build-batch-empty` and wasted calls.

## 1. Check

1. `project_list`: `agentAutonomy` and `agentPublish` for the project. Agent autonomy lets you route, Ready, plan the build, write the roadmap and record a baseline. Agents may publish (an Admin's second switch, which needs autonomy) lets you publish a task to Main.
2. `build_status` for the counts: what is `not_started`, `planned`, `in_dev`, `merged`, `outdated`. Main with nothing on it means the spec pass comes first.
3. `build_clusters` (no arguments) for the first proposal and its `completion`: `watched` says whether a merge into a watched repository completes items, and `repos` names the repository and branch. Keep both for the work loop.

Without Agent autonomy, steps 2 to 4 are a person's acts: go to "When a person drives".

## 2. Spec pass

Skip it when Main already holds the spec. Otherwise, with the documents agreed or produced by `specsgraph-ingest` (for a bulk capture under review use that skill; this pass writes directly):

1. `workstream_open` with `title`, after a yes.
2. `spec_apply` with the `workstream`, `yaml` or `documents`, and an `idempotencyKey`, up to 500 documents per call, dependencies first across calls (subdomains and contexts, then enums and value objects, then aggregates, then behaviour, contracts and features). No `stage`: under autonomy the documents go straight into the workstream. Read `results[]` and fix every `failed` document before the next call.
3. Route, Ready and publish in one call:
   - About 200 documents or more: a separate `task_route` with `task` (`{mode: "new", name}`), `addUnrouted: true`, `ready: true` and `publish` set to the project's `agentPublish`.
   - Fewer: pass `route` on the last `spec_apply` (`{task: {mode: "new", name}, ready: true, publish: <agentPublish>}`).
   - Leave `items` at its default (`none`): build work comes from `build_plan`, not from the task's template.
   - `apply-has-failures` lists the documents that failed in the batch: fix and re-apply them, then route. `ignoreFailed` only when the user agrees to ship without them.
4. Watch the task with `task_get`:
   - Publish is a person's act here (no `agentPublish`): stop and tell the user "Publish T-n in Tasks".
   - `publishRequest.error` explains a refused agent publish; fix the cause and call `task_publish` (`task`) again.
   - Awaiting merge names a spec pull request: merge it, or ask a person to. The task turns Done when it lands.
   - Done: the artefacts are on Main and read `not_started` (or `outdated`) in `build_status`.

A cancelled call may still have completed: repeat it with the same `idempotencyKey`.

## 3. Baseline (code that already exists)

For a codebase that already implements part of Main, record it before planning, so no agent rebuilds it: `build_markImplemented` with `op: set`, `contextId` (or `artefactIds`), a `note` that says what proves it, and `codeRef` (a commit, tag or path in the repository). Only what the code proves: read the code, never guess from names. Mark nothing you would not defend in review. `op: revoke` undoes a wrong baseline.

## 4. Plan (the planner session only)

1. `build_clusters` with `maxSize` between 15 and 30 and `bound: context` (the default). Read the clusters with the user: members, `after` (clusters it waits on), `waitsOn` (artefacts outside the proposal with no code) and `oversize` (a strongly connected group that cannot be split). Narrow with `contextId` or `milestone`.
2. `build_plan` with `clusters: auto` and `milestones: layer`, or an explicit `clusters` list when the user reshaped them. Add `adopt: true` when Ready already made a large implement item over many artefacts (it is replaced by cluster items). Read the answer: the batch T-m, its items T-m.1 and on, `skippedCovered`, `warnings`, `completion`, and `milestones` (created, or an error the batch survived).
3. While the answer has `remaining`, call `build_plan` again with `clusters: auto`: each call plans the next 60 clusters and links back to the earlier ones.
4. `roadmap_get` to confirm the order. `roadmap_manage` (`op`) to rename, reorder or regroup milestones the user wants different.
5. `build-batch-empty` naming a task ("already planned in T-12") means the plan exists: go to the work loop.

## 5. Work loop (one per agent)

1. `work_item_claimNext` without `claimant` the first time. The answer returns the `claimant` the server generated (`s-ab12cd`): pass it on **every** later call of this session. Never a fixed label such as `agent-1`, which two sessions would share.
2. Read the item's `read.artefacts` with `spec_get` at `scope: main`, exactly what to build. When the answer has `previous`, an earlier session started it: continue from its branch or pull request (`previous.codeRef`), do not start over.
3. Implement every artefact of the cluster in one branch named `T-n.s-<slug>` (such as `T-14.3-parcel-dispatch`). Where the spec is silent or wrong, ask instead of guessing: `thread_ask` with `item` and `blocking: true`.
4. Open a pull request whose title cites `T-n.s` (never only `T-n`: a batch has several implement items), into the watched branch, and merge it within 7 days.
5. `work_item_update` with `item`, `codeRef` and `claimant` as soon as the pull request exists; then `heartbeat: true` at least hourly while you work, or the 2-hour lease lapses.
6. The merge completes the item. With `completion.watched: false` nothing completes it on its own: once the code is merged, `work_item_update` with `item`, `done: true`, `codeRef` and `claimant` (Agent autonomy).
7. Call `work_item_claimNext` with your `claimant` again. On `item: null`, read `reason`:
   - `all-blocked`: `blockedBy` names the blockers. Poll every `retryAfterSeconds` while a blocker is doing; stop and report when every blocker is unclaimed todo work nobody is on.
   - `assigned-elsewhere`: the open items belong to someone else; ask the user who owns them.
   - `all-claimed`: every claimable item is held; stop, or poll later.
   - `none-todo`: the build is done. Report and stop.
8. On `work-item-not-claimed` naming another holder: your lease lapsed and another session took the item. Stop, do not merge your pull request, and add its link as a thread on the item (`thread_open` with `item` and a `body`) so the holder can use it.

To stop early, `work_item_update` with `item`, `release: true` and `claimant`, so another session can take the item at once.

## 6. Many agents at once

- One planner session (steps 1 to 4); N worker sessions (step 1, then step 5). Start the workers after the first `build_plan` answer.
- One claimant per session, one item at a time. An explicit claimant that already holds a doing item gets it back (`resumed: true`); release it to take another.
- Never release, update or merge another session's item. Never work on an item you did not claim.
- `work_item_claims` shows who holds which item, with labels, lease expiry and code refs. Read it before telling the user who is on what.
- Leases lapse after 2 hours without a heartbeat; the next `work_item_claimNext` may then hand the item to another session, with your `codeRef` in `previous`.
- Dependencies are enforced: a cluster that needs another cluster stays blocked until that one is done, so workers never build against code that does not exist yet.

## 7. Refusals and what they mean

| Answer | What to do |
| --- | --- |
| `person-required`, "Only a person can do this in this project" | Agent autonomy is off: ask an Admin about it. For `build_plan`, ask a person to use Plan build on the Build page, and show them the `build_clusters` proposal |
| `person-required`, "Only a person publishes in this project" | Agents may publish is off: ask a person to publish the task in Tasks |
| `task-scope-empty` | Every artefact already equals Main, so there is nothing to route: plan the build with `build_plan` instead |
| `build-artefact-covered` | Already planned: pass `skipCovered: true`, or `adopt: true` for an unclaimed item that Ready created |
| `build-batch-empty` | Everything has code or is planned (it names the tasks): go to the work loop |
| `completion-by-merge` | A repository is watched: cite `T-n.s` in a pull request to it instead of `done` |
| `work-item-not-claimed` | Another session holds the item: stop (step 5.8) |
| `milestone-limit` (in `milestones`) | The batch exists; tell the user how many milestones were needed, and group by `context` or `single` with `roadmap_manage` |

Environments are never a setting to request: they come from the flow template and from deployments CI reports. `doneWhen: merged` needs none.

## When a person drives

With Agent autonomy off, you still read and build:

- The spec pass stages for review (`specsgraph-engineer`, `specsgraph-product` or `specsgraph-ingest`); a person accepts, routes, readies and publishes.
- Run `build_clusters` and show the proposal; a person uses **Plan build** on the Build page (and its optional milestones step), and **Mark as implemented** for existing code.
- The work loop (step 5) is the same: `work_item_claimNext` and `work_item_update` need only a read and write token.

## Closing

Report in a few lines: the batch tasks and how many items each has, what is merged, in progress (`work_item_claims`), blocked or left, and anything a person must do (publish, merge a spec pull request, connect a repository, answer a blocking question). Offer `specsgraph-engineer` when building exposed a gap in the model.
