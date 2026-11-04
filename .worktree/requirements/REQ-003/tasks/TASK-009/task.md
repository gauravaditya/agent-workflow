# TASK-009 — Package and verify standalone distribution

Requirement: [REQ-003 — Self-contained application delivery](../../req.md)

Review state: Completed and explicitly accepted by the human after evidence review and manual verification. See the implementation brief's acceptance record for verification coverage and the outstanding REQ-002 dependency for final workspace qualification.

## Purpose

Make Worktree runnable on supported systems without requiring users to install its development tools or run a separate frontend server.

## Scope

Package and verify one self-contained executable for each approved initial V1 target, using TASK-008's foundation and the [project architecture](../../../../project.md). Verify the embedded production frontend and runtime requirements.

| Operating system | Architecture |
| --- | --- |
| Linux | amd64 |
| Linux | arm64 |
| macOS | amd64 |
| macOS | arm64 |
| Windows | amd64 |

Qualify Google Chrome current stable and Mozilla Firefox current stable on each applicable target. Record actual versions and qualification dates; this is initial V1 qualification, not indefinite browser-version support. Docker remains optional and is excluded from initial V1 delivery; do not create Docker packaging work.

This task follows accepted TASK-008. Final end-to-end verification depends on the relevant REQ-002 behavior being implemented and accepted; do not claim blocked behavior has passed. Exclude cloud hosting, deployment infrastructure, and a multi-service architecture.

## Expected outcome

Users on each of the five approved OS/architecture targets can run the delivered application with only the operating system and an approved browser, without separately installing Go, Node.js, Angular CLI, a database, or a frontend server. Delivery evidence separately reports build, execution, and Chrome/Firefox verification for each applicable target, identifying unverified or failed checks. Cross-compilation alone does not establish runtime verification.

Verify that no separately installed Go runtime, Node.js, Angular CLI, or separate frontend server is required; the UI loads without an external CDN or network resource; and workspace source files remain read-only. These are delivery verification conditions, not additional features.

## Implementation brief

[Implementation brief](implementation.md)
