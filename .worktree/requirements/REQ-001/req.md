# REQ-001 — Establish the workspace contract

Review state: Completed and explicitly accepted by the human. TASK-001, TASK-002, and TASK-003 have completed, verified, reviewed, and human-accepted outcomes: workspace conventions, the three canonical templates, and the agent workspace contract with its root entry point.

## Intent

Establish a consistent, predictable Markdown workspace structure that humans and coding agents can use to create, navigate, and maintain requirements, task briefs, and implementation briefs.

## Desired outcome

Every artifact has a defined location, purpose, template, and linking convention. Agents can follow the same contract without inventing their own structure, while humans can navigate the work without reading verbose technical documentation.

## Scope

Define the workspace structure and links, the Markdown templates, and the agent workspace contract. Preserve the agreed hierarchy: Project → Requirement → Task. Each implementation brief belongs to its task.

Every requirement has its own directory with `req.md` and `tasks/`. Every task has its own directory with `task.md` and, after approval, `implementation.md`. Optional supporting material stays within the relevant task directory. Templates belong under `.worktree/templates/`.

Viewer work and additional product features are outside this requirement.

## Tasks

- [TASK-001 — Define the workspace structure and linking conventions](tasks/TASK-001/task.md)
- [TASK-002 — Define the Markdown templates](tasks/TASK-002/task.md)
- [TASK-003 — Define the agent workspace contract](tasks/TASK-003/task.md)

## Review boundary

Review and approve the individual task briefs before preparing their implementation briefs. Implementation requires an approved implementation brief and an explicit task handoff.
