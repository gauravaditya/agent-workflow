# TASK-004 — Implementation brief: Open a local workspace and browse its hierarchy

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Task: [TASK-004 — Open a local workspace and browse its hierarchy](task.md)

## Objective

Let a user open a local Markdown workspace, browse its established hierarchy, and select documents without validation issues in other artifacts blocking access. Provide the navigation and reading-area layout used by the other REQ-002 tasks.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [REQ-002](../../req.md), and this task's [brief](task.md). The completed [REQ-001](../../../REQ-001/req.md) and canonical templates define the existing artifact contract.

This task owns opening, hierarchy browsing, selection, collapsible navigation, and non-blocking workspace validation. [TASK-005](../TASK-005/implementation.md) owns document rendering, breadcrumbs, and contextual Markdown links. [TASK-006](../TASK-006/implementation.md) owns previous/next navigation. These are responsibility boundaries, not prescribed software modules.

The agreed application direction and CLI-only V1 workspace access are recorded in [project context](../../../../project.md). [TASK-008](../../../REQ-003/tasks/TASK-008/task.md) owns the application foundation. Go receives the CLI path and owns all workspace discovery, validation, and file reading; Angular communicates with Go through HTTP/JSON. There is still no application implementation.

## Required work

### Open and inspect a workspace

Support `./worktree --workspace /path/to/project`: Go receives the supplied path and opens that workspace directly. Without a workspace argument, display a simple welcome screen explaining how to launch with the required argument. Do not treat an inaccessible supplied path as if no argument was given; its failure behavior remains unresolved.

Use the CLI-provided project's `.worktree/` artifacts according to the conventions. Perform all filesystem access in Go, including discovery, validation, and reading; Angular obtains workspace information and content through the HTTP/JSON API. Keep files as the source of truth; opening and browsing must not modify them or copy them into permanent application storage.

Discover project, requirement, task, and document relationships from the established structure and links. Preserve their IDs and parent relationships. Identify missing or inconsistent artifacts as workspace issues rather than inventing replacement artifacts, IDs, or relationships.

Keep workspace opening independent of artifact validation success. A problem with one artifact must not prevent access to other valid content. Distinguish a missing or unreadable document from a readable document with template-format problems. Keep the latter selectable for TASK-005's fallback. Do not implement Markdown rendering here.

### Browse and select documents

Provide hierarchical navigation alongside a visually prioritized reading area. Represent Project → Requirement → Task. Make `task.md` and `implementation.md` selectable as documents belonging to their task, without another hierarchy level.

Selecting a document must identify its source location, document type, and established project/requirement/task context for the reading behavior owned by TASK-005. Preserve the parent requirement's task-link order for TASK-006; do not substitute filename or ID sorting for that sequence. Do not invent an order or parent relationship when source information is ambiguous.

Allow navigation to collapse and expand while preserving the selected document and current reading place. Do not prescribe exact panel widths, animation, or a persistence mechanism.

### Surface issues without blocking content

Show a lightweight indication when issues exist and a concise list naming each affected file and its problem. Keep hierarchy navigation primary; do not add a workspace summary, dashboard, analytics, or health-reporting feature. Validation must not reject the whole workspace because of missing documents, malformed artifacts, or broken relationships. Keep usable content accessible.

Behavior when the CLI-provided workspace path cannot be accessed still needs human resolution. An inability to access the folder is not an artifact-validation failure; do not claim opening succeeded when the source is inaccessible.

## Constraints and exclusions

- Preserve canonical hierarchy, IDs, filenames, relationships, and relative links; reference canonical sources rather than redefining them.
- Own workspace issue discovery and opening behavior only. Leave reading/fallback, breadcrumbs, and Markdown-link interactions to TASK-005, and sequential navigation to TASK-006.
- Use the agreed environment from project context and the TASK-008 foundation, with Go owning filesystem access. Do not add unapproved dependencies or introduce permanent workspace storage, a database, editing, agent integrations, or unnecessary abstractions.
- Do not add a generic related-artifacts panel, implementation-brief hierarchy level, or unrelated project-management features.
- Do not change existing planning artifacts or approval states. This brief does not authorize implementation; explicit human approval is required, and unresolved decisions still block affected details.

## Acceptance criteria

- A CLI `--workspace` argument opens the specified workspace directly for browsing. Without that argument, a simple welcome screen explains the required launch command. Go owns discovery, validation, and file reading; Angular accesses workspace data through HTTP/JSON.
- Both task document types can be selected in their task context without adding a hierarchy level. Readable nonconforming documents remain selectable.
- The reading area has visual priority. Collapsing and expanding navigation preserves selection and the current reading place.
- A lightweight indicator and concise file/problem list surface missing or inconsistent artifacts without preventing opening or access to valid content elsewhere. Hierarchy remains primary; there is no workspace summary or dashboard.
- Document selection supplies accurate source and hierarchy context for TASK-005; task-link order is preserved for TASK-006.
- Opening, validation, and browsing leave source Markdown unchanged. No behavior owned by the other tasks or excluded features is introduced.

## Verification and handoff

Once implementation is authorized and dependencies are available, use the project's applicable checks and focused behavioral tests; do not introduce a test framework solely through this brief. Exercise a conforming workspace, mixed valid and malformed artifacts, absent task documents, and readable nonconforming documents. Verify unaffected content remains selectable, the lightweight issue indicator/list identifies affected files and problems, and no source files change.

Check hierarchy, selection context, collapse/expand preservation, and integration with TASK-005's reader and TASK-006's ordering input. Test startup with a CLI workspace path and without the argument: the former opens directly, and the latter shows the simple welcome instructions. Verify filesystem operations are owned by Go, the frontend uses HTTP/JSON, and no source changes or permanent workspace copy occur. Do not count unresolved inaccessible-path interactions as verified.

Report changed application files, checks and results, unmet criteria, deviations, and unresolved decisions. Do not claim full task completion while required access or inaccessible-folder behavior remains blocked.

## Open questions

- TASK-008 must provide the application foundation before integration. Its agreed direction is recorded in project context, not an open stack choice.
- What should the user see when the CLI-provided workspace path cannot be read? That failure interaction remains unresolved; absence of the argument uses the agreed welcome screen.
