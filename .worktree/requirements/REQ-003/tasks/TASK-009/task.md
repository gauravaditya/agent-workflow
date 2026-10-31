# TASK-009 — Package and verify standalone distribution

Requirement: [REQ-003 — Self-contained application delivery](../../req.md)

Review state: Draft task brief for human review. Implementation has not begun.

## Purpose

Make Worktree runnable on supported systems without requiring users to install its development tools or run a separate frontend server.

## Scope

Package and verify one self-contained executable for each approved OS/architecture, using TASK-008's foundation and the [project architecture](../../../../project.md). Verify the embedded production frontend and runtime requirements. Optional Docker distribution, if approved for this delivery, uses the same application rather than a separate architecture.

This task follows TASK-008. Final end-to-end verification depends on the relevant REQ-002 behavior being implemented and accepted; do not claim blocked behavior has passed. Target platforms and first-delivery Docker inclusion remain questions in the parent requirement. Exclude cloud hosting, deployment infrastructure, and a multi-service architecture.

## Expected outcome

Users on each approved target can run the delivered application with only the operating system and a browser, without separately installing Go, Node.js, Angular CLI, a database, or a frontend server. Delivery checks demonstrate those claims and clearly identify any unverified target or optional distribution.

Verify that no separately installed Go runtime, Node.js, Angular CLI, or separate frontend server is required; the UI loads without an external CDN or network resource; and workspace source files remain read-only. These are delivery verification conditions, not additional features. Supported OS/architecture and browser targets remain open decisions.

## Implementation brief

[Implementation brief](implementation.md)
