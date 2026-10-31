# TASK-006 — Navigate between tasks within a requirement

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Review state: Proposed task brief for human review. Implementation has not begun.

## Purpose

Make sequential task reading easier without sending the user unexpectedly into another requirement.

## Scope

Provide subtle previous and next links when viewing a task, using the task context established by TASK-004 and TASK-005. Navigate only between tasks belonging to the current requirement, using the order of task links in its `Tasks` section as authoritative. Keep the controls visually secondary to document content.

Preserve the currently viewed document type: `task.md` navigates to the corresponding `task.md` in the adjacent task, and `implementation.md` to its corresponding `implementation.md`. Show the navigation link when that destination exists and is readable, regardless of Worktree template conformance. A conforming document can use structured rendering; a nonconforming document remains navigable and uses TASK-005's general Markdown fallback. Hide the link only when the corresponding destination is missing or unreadable/inaccessible. Do not fall back to another document type or cross into another requirement.

## Expected outcome

A user can move between adjacent tasks in the same requirement in the parent requirement's listed order while preserving document type and requirement context. Readable corresponding documents remain navigable even when they do not conform to a Worktree template. Links to missing or unreadable/inaccessible corresponding documents are hidden, with no fallback to another document type.

## Implementation brief

[Implementation brief](implementation.md) — pending; to be prepared after human approval of this task brief.
