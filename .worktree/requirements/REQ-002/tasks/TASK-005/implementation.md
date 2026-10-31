# TASK-005 — Implementation brief: Read documents and navigate their context

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Task: [TASK-005 — Read documents and navigate their context](task.md)

## Objective

Present selected documents through a polished, web-native reading experience that feels like a well-designed webpage. Markdown is the source format, not the user experience. Preserve document content, meaning, hierarchy, and contextual links in both template-aware presentation and general Markdown fallback.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [REQ-002](../../req.md), and this task's [brief](task.md). Use the completed [requirement](../../../../templates/req.md), [task](../../../../templates/task.md), and [implementation](../../../../templates/implementation.md) templates as the authority for template conformance.

[TASK-004](../TASK-004/implementation.md) provides workspace access, document selection, hierarchy context, the reading-area layout, and workspace issue discovery. This task owns rendering, breadcrumbs, current-document identification, and contextual Markdown links. [TASK-006](../TASK-006/implementation.md) owns previous/next links and their destination eligibility; it uses this task's reader after navigation.

Follow the agreed application direction in [project context](../../../../project.md) and the [TASK-008 foundation](../../../REQ-003/tasks/TASK-008/task.md). Go owns all workspace filesystem access for the CLI-provided path; the Angular reader obtains content through HTTP/JSON and TASK-004's workspace selection/context. This brief adds no parser, component library, rendering architecture, or shared abstraction decision.

## Required work

### Read selected content

Use the selected document's readable Markdown, source location, type, and established hierarchy context from TASK-004. Render in the existing reading area rather than creating a competing layout or another workspace-opening mechanism.

Recognize documents conforming to the established Worktree templates and use their structure and meaning to guide richer, document-specific layouts and appropriate UI elements. Preserve all document content and section meaning rather than presenting known templates as an undifferentiated Markdown preview.

If structured template parsing fails or the document is nonconforming, provide a polished general Markdown fallback. Present headings, paragraphs, lists, links, tables, and code blocks as appropriate web-native UI elements displaying the document's actual content. Raw Markdown syntax must not be the primary reading experience. Do not reject readable content or leave the area blank merely because required fields or headings are absent or malformed. Keep template-format validation distinct from readability; fallback changes presentation, not the source document.

Both presentation paths must feel like part of the same application, with consistent typography, spacing, and treatment of equivalent content and links. Choose a simple approach consistent with the approved application environment once decided; avoid unnecessarily creating two independent rendering systems. This specifies presentation intent, not a rendering architecture or additional abstraction.

The original Markdown files remain the source of truth and must never be modified by rendering or presentation. Preserve their content, links, and meaning. Do not invent missing sections, replace content with a generated summary, or silently modify artifacts to make parsing succeed. Missing or inaccessible source content cannot be rendered as though it exists. A broken internal link shows an unavailable-target message while preserving the current document; other inaccessible-selection behavior remains unresolved.

### Preserve hierarchy and document identity

Show breadcrumbs for the established Project → Requirement → Task context, stopping at the relevant level for the selected artifact. Allow navigation to established ancestors. Make the current document identifiable while keeping `task.md` and `implementation.md` as documents of the same task, not extra breadcrumb hierarchy levels.

Use known source relationships from TASK-004. Do not invent ancestors or related-artifact relationships when source information is inconsistent; surface the issue through TASK-004's approved issue presentation. Preserve current document context after a supported internal link or breadcrumb navigation.

### Follow contextual Markdown links

Render existing Markdown links as navigable links in both template-aware and fallback views. Resolve links to workspace artifacts from the source document's directory using exact target filenames and case; preserve the target and established artifact relationship. Valid internal links select their target through the workspace navigation already provided by TASK-004.

Do not reinterpret an implementation brief link as a task brief link or add generic related-artifact suggestions. For broken internal links, show a clear unavailable-target message without disrupting the current document. Open HTTP/HTTPS links externally in a new browser tab. Resolve workspace boundaries correctly: outside-workspace targets are not internal documents. Behavior for non-HTTP/HTTPS outside-workspace targets remains unresolved; do not invent an opening policy for them.

## Constraints and exclusions

- TASK-004 owns CLI workspace opening, the no-argument welcome screen, hierarchy discovery, workspace validation issues, and collapsible layout. Reuse its results; do not duplicate them or access the filesystem from Angular.
- TASK-006 owns sequential navigation and eligibility. A readable nonconforming document must still be renderable when reached by that navigation.
- Preserve hierarchy, identity, relationships, relative links, and source Markdown. Do not duplicate the full conventions or template definitions in product UI.
- Follow the agreed environment in project context. Prescribe no additional framework, Markdown library, component library, rendering architecture, abstraction, metadata schema, or unapproved link policy through this brief. Keep the approach simple.
- Exclude editing, persistence, agent integrations, related-artifacts panels, and unrelated features. Do not change planning artifacts or approval states.
- Implementation requires explicit human approval of this brief. Unresolved inaccessible-selection or non-HTTP/HTTPS outside-workspace interactions block affected details; TASK-008 provides the foundation and Go owns filesystem access.

## Acceptance criteria

- Selected readable documents feel like polished webpages within Worktree, with document content, links, and meaning preserved; raw Markdown syntax is not the primary reading experience.
- Known conforming Worktree templates receive richer, document-specific layouts and appropriate UI elements informed by their structure and meaning.
- Missing fields, malformed sections, or structured parsing failure trigger a polished general Markdown fallback. Headings, paragraphs, lists, links, tables, and code blocks receive appropriate web-native presentation. Template-format failure alone never makes readable content unavailable or leaves the area blank.
- Template-aware and fallback presentations feel consistent within the same application, including typography, spacing, and treatment of equivalent content and links. Rendering and presentation never modify the original Markdown files.
- Breadcrumbs reflect the known Project → Requirement → Task hierarchy and navigate to ancestors. The current document is identifiable without creating a document hierarchy level.
- Valid internal artifact links resolve from their source directories and navigate to the intended content in both rendering modes while preserving context.
- Broken internal links display a clear unavailable-target message while the current document remains undisturbed. HTTP/HTTPS links open externally in a new browser tab. Outside-workspace targets are never treated as internal documents; other unresolved cases are not silently assigned behavior.
- Reader integration works with TASK-004 selection and TASK-006 navigation without changing source artifacts or duplicating their responsibilities.

## Verification and handoff

After approval and foundation availability, use applicable project checks and focused reading/navigation tests. Compare presented content, meaning, and link targets against source Markdown for conforming and nonconforming examples. Include missing metadata, missing sections, malformed section structure, and structured parsing failure; readable content must remain displayed through fallback.

Visually review both presentation paths in the approved application environment. Verify known templates use document-specific layouts reflecting their structure, and fallback examples containing headings, paragraphs, lists, links, tables, and code blocks read as polished webpages rather than raw Markdown previews. Compare typography, spacing, and equivalent content/link treatment across the paths for a consistent application experience. Check original file contents before and after presentation to confirm rendering makes no source changes.

Verify project, requirement, task-brief, and implementation-brief context, ancestor navigation, and source-relative internal links from different source directories. Exercise the same internal-link behavior in both rendering modes. Confirm task and implementation briefs share a task hierarchy position and that source files remain unchanged.

Test broken internal links in both presentation paths: show the unavailable-target message and preserve the current document. Verify HTTP/HTTPS links open in a new browser tab and outside-workspace targets are not routed as internal documents. After remaining interaction decisions are approved, test other inaccessible selections and non-HTTP/HTTPS outside-workspace links against them. Integrate with TASK-004 and TASK-006 rather than testing duplicate opening or ordering implementations. Report checks and results, unmet criteria, deviations, and blockers; do not claim undefined interactions passed.

## Open questions

- TASK-008 must provide the agreed application foundation for TASK-004/reader integration. The stack and Go ownership of filesystem access are decided.
- Beyond broken internal links, what happens when a selected document becomes inaccessible? Workspace issues use TASK-004's lightweight indicator and concise file/problem list; this remaining selection-failure interaction is not assumed.
- How should non-HTTP/HTTPS links outside the workspace behave? HTTP/HTTPS external tabs and broken internal-link messages are decided; outside-workspace targets must never be treated as internal documents.
