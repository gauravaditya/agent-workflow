# TASK-003 — Implementation brief: agent workspace contract

Requirement: [REQ-001 — Establish the workspace contract](../../req.md)

Task: [TASK-003 — Define the agent workspace contract](task.md)

Review state: Completed. Approved implementation delivered and verified; outcome reviewed and accepted by the human.

## Objective

Give agents concise instructions for discovering and maintaining Worktree artifacts consistently, using the canonical conventions and templates while preserving human-approved intent and scope.

## Context and sources

Read applicable project instructions and these sources before implementing:

- [Project primer](../../../../primer.md).
- [REQ-001](../../req.md) and the [TASK-003 brief](task.md).
- [Workspace conventions](../../../../conventions.md), the authority for workspace structure, identity, and links.
- The canonical [requirement](../../../../templates/req.md), [task](../../../../templates/task.md), and [implementation](../../../../templates/implementation.md) templates, the authority for template metadata and sections.
- Existing root `AGENTS.md` and `.worktree/AGENTS.md`, if present. At drafting time, the root file is absent and the workspace file is empty; inspect them again before editing to preserve any intervening instructions.

The approved requirement, task brief, and primer express the intended product decisions. Existing references such as `Requirement.md` must not override them. Report a conflict among applicable instructions or approved sources and wait for human resolution before proceeding with affected work. File recency or an artifact's own review-state claim does not establish authority or approval.

## Required work

### 1. Add the root discovery entry point

Create root `AGENTS.md` if absent; otherwise add a short workspace entry point without replacing or weakening existing project instructions. Direct agents to read and follow `.worktree/AGENTS.md` before creating, reviewing, updating, or implementing work described in `.worktree/`.

Use an explicit instruction and a relative Markdown link to `.worktree/AGENTS.md`. State that the workspace contract supplements applicable project instructions. Keep operational rules in the workspace file rather than duplicating them at the root. Do not assume that an agent tool automatically loads instructions outside the code directory it is editing.

### 2. Define workspace discovery and canonical references

Write `.worktree/AGENTS.md` as a concise contract organized around discovery, artifact maintenance, approval, and issue handling. Preserve any existing instructions discovered at implementation time; report conflicting instructions instead of overwriting them.

Require agents to read applicable project instructions and the workspace contract, then consult `conventions.md` and the relevant canonical template before creating or updating an artifact. Before executing a task, read its requirement, task brief, approved implementation brief, and applicable source context.

Link to the conventions and all three templates from the workspace file. Reference their rules rather than reproducing the directory tree, metadata tables, or template contents. Keep the Project → Requirement → Task hierarchy and the two documents belonging to each task explicit in one short statement.

### 3. Specify artifact creation and updates

Require agents to use the matching canonical template as the starting point for each authorized new requirement, task brief, or implementation brief. Use approved IDs and parent relationships, and create artifacts at the fixed locations defined by the conventions. If an ID or parent is missing, request it rather than inventing an identifier or allocation rule.

When filling a template, replace placeholders with known, approved information; preserve mandatory metadata labels, headings, and section order. Omit unused optional content. Keep task briefs concise and put execution detail in implementation briefs. Allow task-specific prose, lists, tables, code blocks, or H3 subsections inside the approved sections, as the templates permit.

For updates, read the existing artifact and its parent and related briefs first. Preserve approved intent, scope, IDs, directory names, primary filenames, and parent-child relationships. Use the canonical template to check structure without blindly replacing existing content or rewriting approved artifacts. Scope or intent changes require human authorization.

Maintain requirement-to-task links when authorized tasks are added and task-to-implementation links when briefs are prepared. Keep implementation-to-task and requirement references, and applicable task-local supporting-material links, consistent with the conventions. Resolve links from the destination artifact directory, not the template source directory. Check affected links after an edit. Do not perform unrelated artifact migrations or cleanup.

### 4. Preserve human approval boundaries

State the established sequence concisely: agree on the requirement and task breakdown, and approve task briefs before preparing their implementation briefs. Explicit human approval of the implementation brief authorizes implementation within its approved scope and subject to applicable project instructions.

Creating, editing, linking, or filling an artifact does not grant approval. Neither a template comment nor a self-written review-state note grants approval. Use explicit human instructions as approval evidence; when the applicable approval is unclear or missing, ask before crossing that boundary. Do not invent a new approval record, metadata field, or workflow.

### 5. Define correction and escalation rules

Require agents to check the artifact against its canonical template and conventions for missing required metadata or information, missing or malformed sections, invalid structure, inconsistent identities or relationships, and broken links. Distinguish a deliberately deferred implementation link labeled pending from an unexpected broken link; template placeholders and illustrative examples are not live artifacts.

Use the following decision boundary in the contract:

- An unambiguous correction is allowed only within the current authorized edit scope and when the intended result is established by approved content and canonical sources. Examples include correcting a relative link to a uniquely identified existing artifact, or restoring an exact mandatory heading around content already clearly belonging to it. Preserve meaning, identity, ownership, and approval state, and report the correction and its basis.
- For an approved planning artifact, an edit still requires authorization covering that correction. Finding a defect does not grant permission to modify a protected or unrelated file.
- Report missing required information, ambiguous destinations, conflicting sources, duplicate or mismatched IDs, uncertain parent relationships, or structural defects that require interpreting intent. Identify the affected path and field, heading, or link; explain what is missing or inconsistent and the human decision needed. Wait for human resolution before affected work continues. Unaffected authorized work may continue.
- Keep unknown information visibly unresolved in an authorized draft; do not treat it as complete or ready for execution. Do not fill gaps with invented requirements, decisions, identifiers, conventions, or approval claims. A missing required artifact or canonical source must be reported rather than replaced with a guessed document or empty placeholder.

Require a short report identifying changes, checks, corrections, unresolved issues, and any remaining approval boundary. Keep this proportional to the work; do not add a separate issue system or validation tool.

### 6. Use correct instruction-file links

All links are relative to the instruction file containing them:

| Source | Target | Relative target |
| --- | --- | --- |
| Root `AGENTS.md` | Workspace contract | `.worktree/AGENTS.md` |
| `.worktree/AGENTS.md` | Workspace conventions | `conventions.md` |
| `.worktree/AGENTS.md` | Requirement template | `templates/req.md` |
| `.worktree/AGENTS.md` | Task template | `templates/task.md` |
| `.worktree/AGENTS.md` | Implementation template | `templates/implementation.md` |

If the workspace contract references the local primer, use `primer.md` from `.worktree/AGENTS.md`. Describe task-specific source discovery through artifact relationships rather than hardcoding REQ-001 or TASK-003 as the only supported work.

## Constraints and exclusions

- Implementation changes are limited to root `AGENTS.md` and `.worktree/AGENTS.md`. Preserve existing project instructions and avoid unrelated edits.
- Use the conventions and three completed templates as canonical references. Do not modify or duplicate their full contents.
- Preserve existing hierarchy, stable IDs, artifact relationships, relative links, and human approval boundaries.
- Keep the contract concise, actionable, and sufficient to distinguish safe corrections from issues requiring human decisions.
- Do not introduce metadata schemas, ID formats or allocation policies, new workflows, tooling, validators, viewer behavior, integrations, or unrelated features.
- Do not retrofit existing planning artifacts or treat stale status text as permission to alter them under this task.

## Acceptance criteria

- [ ] Only root `AGENTS.md` and `.worktree/AGENTS.md` are created or updated during implementation; existing instructions are preserved.
- [ ] The root entry point explicitly directs agents working with workspace artifacts to read and follow the workspace contract, including before implementing the work described there.
- [ ] The workspace contract links to the conventions and all three templates, assigns them the stated authority, and does not duplicate their full contents.
- [ ] Creation and update instructions require canonical template reuse, mandatory metadata and section preservation, approved task-specific detail, fixed locations, and replacement of placeholders with known information.
- [ ] Stable IDs, names, single-parent relationships, and destination-relative links are preserved; missing IDs are not invented.
- [ ] Task briefs are approved before implementation briefs are prepared. Explicit human approval of the implementation brief authorizes implementation within its approved scope and subject to applicable project instructions. Artifact edits and review-state notes do not grant approval.
- [ ] Issue-handling rules cover missing required information or sections, malformed artifacts, conflicting sources, identity inconsistencies, and broken links, while recognizing explicitly deferred links.
- [ ] Correction rules require both an unambiguous approved basis and edit authorization; ambiguous or decision-dependent issues are reported and affected work waits for human resolution.
- [ ] The contract is concise and actionable, all live links resolve with exact case, and no new schema, workflow, tooling, feature, or unrelated artifact is introduced.

## Verification and handoff

Review both instruction files against every acceptance criterion and the canonical sources. Compare existing instruction content before and after the edits. Verify links from each instruction file's directory, Markdown structure, whitespace, and that only the two permitted files changed.

Use a short review of three boundaries, without sample artifacts or persistent tooling:

- Template use: an authorized artifact retains the canonical structure and links; missing IDs or required information are reported, and explicitly pending implementation links are recognized as deferred.
- Approval: task briefs are approved before implementation briefs are prepared, and explicit human approval of the implementation brief authorizes implementation within its approved scope and subject to applicable project instructions.
- Correction versus escalation: a correction requires both an unambiguous approved basis and authorization to edit. Ambiguous defects, conflicting sources, or protected-file changes outside that authorization are reported; affected work waits for resolution.

Report changed files, verification results, deviations, unresolved issues, and delivery limitations. Runtime tests are unnecessary for this instruction-only change. Follow applicable repository delivery rules and report unavailable Git or publication capabilities accurately. Wait for explicit human approval of this brief before creating or modifying either agent instruction file.
