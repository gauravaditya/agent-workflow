# TASK-005 — Read documents and navigate their context

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Review state: Proposed task brief for human review. Implementation has not begun.

## Purpose

Make selected Markdown planning documents comfortable to read while keeping their workspace context clear.

## Scope

Render selected Markdown in the reading area provided by TASK-004. Show a breadcrumb indicating the document's position within Project → Requirement → Task, with navigation to its ancestors. Make the current document identifiable while keeping task and implementation briefs distinct as documents belonging to the same task, without an additional hierarchy level.

Distinguish template-format validation from Markdown readability. Documents that do not conform to the Worktree templates must remain viewable: if structured template parsing fails, render their actual Markdown content using a general reading fallback. Do not reject these documents or leave the reading area blank solely because template validation fails.

Render existing Markdown links as navigable links, preserving their meaning and artifact relationships. Resolve valid internal links relative to their source document and navigate within Worktree. Broken internal links show a clear unavailable-target message without disrupting the current document. HTTP/HTTPS links open externally in a new browser tab. Outside-workspace targets must not be treated as internal documents; behavior for non-HTTP/HTTPS outside-workspace targets remains unresolved. Do not invent related-artifact relationships or add a generic related-artifacts panel. Workspace issue discovery and non-blocking opening belong to TASK-004.

## Expected outcome

A user can read a selected document's actual Markdown even when it does not match a Worktree template, identify the current document and its hierarchy context, navigate to ancestors, and follow existing links. Template-format issues do not by themselves prevent reading.

## Implementation brief

[Implementation brief](implementation.md) — pending; to be prepared after human approval of this task brief.
