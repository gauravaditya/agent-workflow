# TASK-008 — Establish the executable application foundation

Requirement: [REQ-003 — Self-contained application delivery](../../req.md)

Review state: Draft task brief for human review. Implementation has not begun.

## Purpose

Provide the minimal executable application foundation required by REQ-002 without implementing its workspace browsing or reading features here.

## Scope

Establish the Go HTTP server, Angular production build, embedded frontend assets, HTTP/JSON communication foundation, application startup and graceful shutdown, and development and production build workflow. Follow the agreed [project architecture](../../../../project.md) without duplicating its definition.

Bind the Go HTTP server to `127.0.0.1` by default so it is not exposed to the local network. Do not add network configuration features beyond existing requirements.

Preserve TASK-004's ownership of CLI workspace opening, the no-argument welcome screen, hierarchy, selection, and issues; TASK-005's ownership of reading and contextual links; and TASK-006's ownership of sequential navigation. Follow the agreed Go ownership of workspace filesystem access without absorbing those product responsibilities into the foundation.

## Expected outcome

The application can be built and started as a Go executable serving its optimized embedded frontend with the HTTP/JSON foundation, and shuts down gracefully. Development and production build workflows are clear. Source workspace files remain read-only, and no excluded runtime infrastructure is required.

## Implementation brief

[Implementation brief](implementation.md)
