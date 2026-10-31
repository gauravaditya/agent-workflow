# REQ-002 — Core workspace browsing and document reading

Review state: Draft prepared with human authorization using TASK-004 through TASK-006. The requirement and task briefs await human review; no implementation briefs or application implementation have been prepared.

## Intent

Let users browse agent-generated Markdown planning documents in a simple local-first viewer, read them comfortably, and move between them without losing hierarchy or context.

## Desired outcome

A user opens a local workspace and sees its requirements and tasks in hierarchical navigation alongside a document reading area. The reading area has visual priority. Navigation can be collapsed and expanded without losing the user's place.

V1 opens the workspace path supplied through `./worktree --workspace /path/to/project`. Go owns workspace filesystem access; Angular communicates with Go through HTTP/JSON. If no workspace argument is supplied, a simple welcome screen explains how to launch the application with the required argument.

The user can select and read an artifact, use breadcrumbs to understand its position and navigate to ancestors, and follow existing Markdown links in context. The current document is identifiable without adding a hierarchy level. Subtle previous and next links support browsing tasks within the current requirement while preserving the viewed document type.

Workspace validation does not prevent opening. A lightweight issue indicator and concise issue list identify affected files and problems while valid content remains accessible. The hierarchy remains the primary navigation; there is no workspace summary or dashboard. Documents that fail Worktree template-format validation remain viewable through a general Markdown reading fallback displaying their actual content.

## Scope

- Use a local folder as the source of Markdown files. Markdown remains the source of truth, following the completed [workspace contract requirement](../REQ-001/req.md) and [workspace conventions](../../conventions.md).
- Follow the agreed CLI-only architecture and opening direction in [project context](../../project.md). Go receives the workspace path and owns discovery, validation, and file reading. The frontend uses the HTTP/JSON API; do not copy workspace files into permanent application storage.
- Represent Project → Requirement → Task in the sidebar and breadcrumbs. Present `task.md` and `implementation.md` as identifiable documents belonging to the same task, without an additional hierarchy level.
- Provide a focused reading area, collapsible hierarchical navigation, ancestor breadcrumbs, and navigable existing Markdown links that preserve their meaning and context.
- Use the order of task links in the parent requirement's `Tasks` section as authoritative for previous and next navigation within that requirement. Preserve the current document type: `task.md` leads to the adjacent task's `task.md`, and `implementation.md` to its `implementation.md`. Show links to existing readable destinations regardless of template conformance; hide links to missing or unreadable/inaccessible destinations without falling back to another document type. Do not cross into another requirement.
- Open workspaces despite validation issues, identify missing or inconsistent artifacts through a lightweight indicator and concise list naming affected files and problems, and keep valid content accessible. Do not add a workspace summary, dashboard, analytics, or health-reporting feature.
- Valid internal Markdown links navigate within Worktree. Broken internal links show a clear unavailable-target message without disrupting the current document. HTTP/HTTPS links open externally in a new browser tab. Links outside the workspace must not be treated as internal workspace documents.
- Distinguish Worktree template-format validation from Markdown readability. If structured template parsing fails, show the document's actual Markdown through a general reading fallback; do not reject it or leave the reading area blank merely because it does not conform to a template.
- Keep navigation controls visually secondary to document content. Do not prescribe exact panel widths, technology, or internal architecture.

This requirement covers browsing and reading, not editing or project management. It excludes a generic related-artifacts panel, invented artifact relationships, a database or persistence layer, agent integrations, and unrelated features. No implementation is authorized by creating these planning documents.

## Tasks

- [TASK-004 — Open a local workspace and browse its hierarchy](tasks/TASK-004/task.md)
- [TASK-005 — Read documents and navigate their context](tasks/TASK-005/task.md)
- [TASK-006 — Navigate between tasks within a requirement](tasks/TASK-006/task.md)

## Open questions

- Inaccessible workspace: what should happen when the CLI-provided path cannot be accessed? The no-argument welcome screen is decided; inaccessible-path behavior remains unresolved.
- Outside-workspace links: HTTP/HTTPS opening is decided, and outside-workspace targets are not internal documents. How should non-HTTP/HTTPS outside-workspace targets behave?

TASK-004 depends on REQ-003's application foundation. TASK-005 depends on the workspace navigation provided by TASK-004. TASK-006 depends on task context from those tasks and follows the ordering and document-type rules above. Go owns filesystem access as defined in project context; no additional technology is assumed.
