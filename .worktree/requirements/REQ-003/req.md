# REQ-003 — Self-contained application delivery

Review state: TASK-008 and TASK-009 are completed and explicitly accepted by the human. Final workspace distribution qualification remains dependent on implementation and acceptance of the relevant REQ-002 behavior; this requirement is not recorded as fully qualified.

## Intent

Let users run Worktree locally without assembling a backend, frontend server, or supporting infrastructure themselves.

## Desired outcome

A user can run Worktree as a self-contained local application without separately installing Go, Node.js, Angular CLI, a database, or a frontend server. Each approved OS/architecture has one executable requiring only the operating system and a browser. Initial V1 browser qualification covers Google Chrome current stable and Mozilla Firefox current stable, not indefinite browser-version support. Docker is optional and excluded from initial V1 delivery.

## Scope

Establish the minimal application foundation and standalone delivery using the agreed [architecture and access direction](../../project.md). Include application startup and graceful shutdown, development and production build workflows, and verification that the optimized frontend is embedded in the executable.

The approved initial V1 qualification matrix is:

| Operating system | Architecture |
| --- | --- |
| Linux | amd64 |
| Linux | arm64 |
| macOS | amd64 |
| macOS | arm64 |
| Windows | amd64 |

Qualify both approved browsers on each applicable target, recording actual stable versions and test dates. Report executable build, target execution, and browser verification separately; a successful cross-build does not establish runtime qualification.

Keep workspace opening and browsing in REQ-002's TASK-004, reading and contextual links in TASK-005, and sequential navigation in TASK-006. This requirement supplies their foundation, not duplicate product behavior. Exclude cloud hosting, deployment infrastructure, a database, external services, microservices, and mandatory additional runtime dependencies. Docker is optional, excluded from initial delivery, and creates no packaging work in this requirement's initial V1 scope.

## Tasks

- [TASK-008 — Establish the executable application foundation](tasks/TASK-008/task.md)
- [TASK-009 — Package and verify standalone distribution](tasks/TASK-009/task.md)

## Open questions

No platform/browser-target or initial Docker-inclusion decision remains open: the targets above are approved and Docker is excluded. Actual qualification results and any unavailable test environments must be reported by TASK-009 without assuming success.

TASK-008 provides the foundation needed by REQ-002. TASK-009 follows the foundation; final end-to-end distribution verification depends on the relevant REQ-002 behavior being implemented and accepted.
