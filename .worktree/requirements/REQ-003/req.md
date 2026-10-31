# REQ-003 — Self-contained application delivery

Review state: Requirement and task briefs drafted under human authorization for review. No implementation has begun.

## Intent

Let users run Worktree locally without assembling a backend, frontend server, or supporting infrastructure themselves.

## Desired outcome

A user can run Worktree as a self-contained local application without separately installing Go, Node.js, Angular CLI, a database, or a frontend server. Each supported OS/architecture has one executable requiring only the operating system and a browser. Optional Docker distribution runs the same application.

## Scope

Establish the minimal application foundation and standalone delivery using the agreed [architecture and access direction](../../project.md). Include application startup and graceful shutdown, development and production build workflows, and verification that the optimized frontend is embedded in the executable.

Keep workspace opening and browsing in REQ-002's TASK-004, reading and contextual links in TASK-005, and sequential navigation in TASK-006. This requirement supplies their foundation, not duplicate product behavior. Exclude cloud hosting, deployment infrastructure, a database, external services, microservices, and mandatory additional runtime dependencies. Docker is optional and does not introduce a separate architecture.

## Tasks

- [TASK-008 — Establish the executable application foundation](tasks/TASK-008/task.md)
- [TASK-009 — Package and verify standalone distribution](tasks/TASK-009/task.md)

## Open questions

- Which OS/architecture and browser targets are supported for the first delivery?
- Is optional Docker distribution included in the first delivery, and what workspace access expectations apply to it?

TASK-008 provides the foundation needed by REQ-002. TASK-009 follows the foundation; final end-to-end distribution verification depends on the relevant REQ-002 behavior being implemented and accepted.
