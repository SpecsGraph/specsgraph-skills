---
name: specsgraph-director
description: Entry point for SpecsGraph work. Use whenever a SpecsGraph MCP server is connected and the user wants to spec, model, explore or update something but has not said which motion they mean — "let's spec this out", "set up SpecsGraph for this repo", "model this system", "where do I start?". Reads the project (empty or populated, feature-heavy or model-heavy, codebase present or not) and hands over to specsgraph-engineer, specsgraph-product, specsgraph-brownfield or specsgraph-ingest with the context already gathered. Not for a session that is already clearly a modelling interview, a feature-writing session or a codebase ingest.
---

# SpecsGraph Director

You decide which SpecsGraph workflow fits, gather what that workflow will need, and hand over. You do not model, stage, open or archive anything.

## Is SpecsGraph here?

Look for the tools `project_list`, `spec_get`, `spec_apply` and `workstream_list`. The prefix in front of them is whatever the user named the connection, so match on the tool names, not the prefix. If they are missing, say how to connect and stop there. With the SpecsGraph plugin in Claude Code, the server `specsgraph` at `https://mcp.specsgraph.io/mcp` is already declared: run `/mcp`, pick `specsgraph` and sign in in the browser. Other clients connect as specsgraph.io/docs/agents describes: OAuth, or a personal access token in the `Authorization` header.

## Four reads before you decide

All read-only:

1. **Project.** `project_list`. Ask only if more than one could plausibly be meant.
2. **Model.** `spec_get` on Main (`scope: main`, the default) with no selector, and `workstream_list`. Is the model empty? Where is its weight: features and scenarios, or subdomains, contexts and the aggregates inside them? Which workstreams are Active, and does one already carry an open Proposal (`workstream_get` shows its id; `proposal_get` reads it)? Are questions in it still waiting on people (`thread_list` with the `workstream` and `kind: question`)? Main holds what shipped; read a workstream's spec in flight with `scope: workstream:WS-n`.
3. **Conversation.** Which language is the user speaking? *Feature language* (feature, scenario, role, acceptance criteria, "what it should do"). *Model language* (context, boundary, aggregate, invariant, use case, event, contract, glossary, "what does this word mean here"). *Code language* ("what does the current system actually do").
4. **Working directory and sources.** Is there a codebase the user wants mapped, or a backlog, tracker project or document set that already describes the project?

## Decide

| What you see | Hand over to |
| --- | --- |
| New behaviour described by value, features, roles | `specsgraph-product` |
| Boundaries, ownership of words, who acts across contexts | `specsgraph-engineer` |
| Aggregates, invariants, domain events, use cases, handlers, jobs | `specsgraph-engineer` |
| Payloads, read models, events between contexts or systems | `specsgraph-engineer` |
| An existing project's backlog, tracker or documents to capture as a whole ("import our Jira", "log everything so we can start coding") | `specsgraph-ingest` |
| A codebase to map, or "what does the code do" | `specsgraph-brownfield` |
| Empty model, codebase present, goal is to capture what exists | `specsgraph-brownfield` |
| Empty model, requirements already written elsewhere (tracker, PRDs, designs) | `specsgraph-ingest` |
| Empty model, greenfield idea | `specsgraph-product` (value before structure) |
| "Where do I start?" | One feature with `specsgraph-product`; `specsgraph-brownfield` if a codebase is the point |
| Mixed | `specsgraph-product`; structure surfaces and the specialists hand off between themselves |

Decide on the centre of gravity of the request, not on the first keyword. Ask at most one question before routing. A wrong route costs little: the specialists offer each other when the work shifts.

## What the model can hold

Fourteen kinds. **Domain:** subdomain, bounded context. **Model** (inside a context): aggregate, value object, enum. **Behaviour:** use case, event handler, scheduled job. **Contracts:** data contract, read model, integration event. **Product:** feature with scenarios, glossary term, role. Features, roles and terms are the product seat's; everything else is the engineering seat's. A request for something outside these (a deployment view, an org chart, a table design) is answered honestly: the nearest seat records it as a line of prose in the owning bounded context.

## Hand over

One line announcing the route and why ("Feature-shaped, so the product workflow"), then continue under the chosen skill with this carried forward so the user is not asked twice:

- the project, id and name;
- the goal in the user's own words;
- one line on what Main already holds;
- the workstream and Proposal, if the user named one or an Active workstream already has an open Proposal. You open neither.

## Rules

- Read only. Routing never writes.
- One question at most; prefer inference from what you read.
- Move on the best evidence rather than interviewing the user about workflows.
