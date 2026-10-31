# TASK-004 — Open a local workspace and browse its hierarchy

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Review state: Proposed task brief for human review. Implementation has not begun.

## Purpose

Help a user find requirements and tasks in an existing local Markdown workspace without navigating a raw file tree.

## Scope

Let the user open a local workspace and browse a sidebar representing Project → Requirement → Task. Make both task documents selectable within their task, without adding a hierarchy level. Provide a document reading area alongside navigation, giving reading visual priority. Allow navigation to collapse and expand without losing the user's place.

Open the workspace supplied through `./worktree --workspace /path/to/project`. Go owns all workspace filesystem access, including discovery, validation, and reading; Angular communicates through HTTP/JSON. With no workspace argument, show a simple welcome screen explaining how to launch with the required argument. With an argument, open that workspace directly. Keep source files read-only and do not copy them into permanent application storage.

Use the established artifact structure. Workspace validation must not prevent opening: show a lightweight issue indicator and concise list identifying affected files and problems, while keeping valid content accessible and hierarchy navigation primary. Do not add a workspace summary or dashboard. Document rendering, including Markdown fallback, and contextual links belong to TASK-005; sequential task navigation belongs to TASK-006.

Follow [project context](../../../../project.md) and depend on TASK-008 for the application foundation. Behavior when the CLI-provided workspace path is inaccessible remains unresolved.

## Expected outcome

A user can open a workspace, find its requirements and tasks, and select an artifact for reading even when other artifacts have validation issues. Missing or inconsistent artifacts are surfaced without blocking access to valid content. Collapsing and expanding navigation preserves the selection and the user's current reading place.

## Implementation brief

[Implementation brief](implementation.md) — pending; to be prepared after human approval of this task brief.
