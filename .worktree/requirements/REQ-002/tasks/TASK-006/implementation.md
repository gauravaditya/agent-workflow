# TASK-006 — Implementation brief: Navigate between tasks within a requirement

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Task: [TASK-006 — Navigate between tasks within a requirement](task.md)

## Objective

Provide visually secondary previous/next links between adjacent tasks in the same requirement, preserving document type and allowing every existing readable destination regardless of template conformance.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [REQ-002](../../req.md), and this task's [approved brief](task.md).

The human's approved TASK-006 clarification, current task brief, and requirement define destination eligibility: existence and readability, not template conformance.

[TASK-004](../TASK-004/implementation.md) owns workspace access, hierarchy context, source-document availability, and issue discovery. [TASK-005](../TASK-005/implementation.md) owns reading, Markdown fallback, breadcrumbs, and contextual Markdown links. This task owns only sequential task navigation and its eligibility decisions. These boundaries do not prescribe new software modules.

Use the agreed application direction in [project context](../../../../project.md) and the [TASK-008 foundation](../../../REQ-003/tasks/TASK-008/task.md). Go owns filesystem access and runtime readability checks for the CLI-provided workspace; Angular uses HTTP/JSON through the TASK-004 integration. Ordering and destination eligibility remain unchanged.

## Required work

### Determine adjacent tasks

For a selected task document, identify its owning task, parent requirement, and current document type using the established workspace context. Read task links in that requirement's `Tasks` section in their listed order; this sequence is authoritative. Do not sort by task ID, filename, or directory enumeration.

Consider only the immediately previous and immediately next task in that same requirement. At either end, there is no link in the direction without an adjacent task. Do not wrap, cross a requirement boundary, or skip over an ineligible adjacent task to another task. If the task sequence or ownership cannot be determined unambiguously, identify the affected file and problem through TASK-004's lightweight issue indication and concise list rather than inventing an order or relationship.

### Preserve document type and check eligibility

For each adjacent task, form the corresponding destination within its task directory: `task.md` when viewing `task.md`, or `implementation.md` when viewing `implementation.md`. Use existing workspace access to establish whether that exact destination exists and is readable.

Show the link when the destination exists and is readable, even if it fails Worktree template validation. Hide the link when the destination is missing, unreadable, or inaccessible. Do not substitute another document type, require a valid template, or use template-format issues as a readability failure.

Pass an eligible selection to the same document reader used by TASK-005. Conforming documents can use structured rendering; nonconforming documents use its general Markdown fallback. Do not add a separate renderer, repair files, or mutate task links.

### Present secondary navigation

Provide subtle Previous and Next links, visually secondary to the reading content. Following a link selects the exact eligible destination and retains its requirement/task context through the existing selection and reader behavior. Do not introduce another hierarchy level or duplicate breadcrumbs.

If a destination becomes inaccessible after eligibility was checked, do not silently switch type or task. Handling that failed selection must follow the approved issue/link interaction once decided, not a new recovery policy created in this task.

## Constraints and exclusions

- Use parent requirement task-link order, immediate adjacency, the current document type, and the current requirement boundary exactly as specified.
- Reuse workspace access/context and the document reader. Do not own folder opening, template parsing, Markdown rendering, issue presentation, or contextual Markdown-link behavior.
- Keep readable nonconforming documents eligible. Eligibility does not grant template conformance or modify the source.
- Introduce no technology choice, dependency, persisted ordering, ID allocation rule, new abstraction, or feature beyond sequential navigation.
- Do not change planning artifacts, templates, conventions, approval states, or source Markdown. This brief requires explicit human approval before implementation; unresolved integration details remain blockers.

## Acceptance criteria

- Previous/next destinations use task-link order in the parent requirement's `Tasks` section, including when it differs from ID or filename order.
- Each destination is the immediately adjacent task within the same requirement. First/last-task controls do not wrap or cross requirements, and an ineligible neighbor is not skipped.
- Task briefs lead only to corresponding task briefs; implementation briefs lead only to corresponding implementation briefs, with no type fallback.
- Existing readable destinations show navigation links regardless of template conformance. Missing or unreadable/inaccessible destinations have no links.
- A readable nonconforming destination opens in TASK-005's Markdown fallback; a conforming destination uses the same reader's supported rendering. Requirement and task context remain correct.
- Controls remain secondary to document content. Navigation does not alter source artifacts or duplicate reading, workspace-opening, breadcrumb, or issue-presentation responsibilities.

## Verification and handoff

After approval, use applicable project checks and focused behavior tests. Exercise a requirement whose task-link order differs from IDs, both document types, both directions, a single-task requirement, and first/last tasks. Confirm there is no wrap or cross-requirement movement.

For each type and direction, check an existing readable conforming destination, an existing readable nonconforming destination, a missing destination, and an unreadable/inaccessible destination. Include a missing implementation brief where the adjacent task brief exists: hide the link rather than falling back. Include an ineligible immediate neighbor followed by another readable task: do not skip the neighbor. Verify successful navigation uses TASK-005 and preserves source files.

Runtime tests depend on the TASK-008 foundation and TASK-004/TASK-005 integration, with Go providing filesystem access. Verify ambiguous-order issues through TASK-004's lightweight file/problem reporting. Once remaining failed-selection behavior is decided, verify it through the owning issue/link behavior rather than implementing a separate policy. Report checks and results, unmet criteria, deviations, and unresolved details; do not claim untested integrations passed.

### Final TASK-006 acceptance record — 2026-11-09

The human reviewed and accepted TASK-006. Sequential navigation uses the requirement's authoritative `taskOrder` and the existing reader selection path. The selected brief type and requirement context are preserved.

The acceptance follow-up added a regression for a middle task whose previous implementation brief is unreadable. Previous is hidden, and Next selects the immediate next task's implementation brief with exactly one document GET.

- The focused document-reading suite passed all 82 tests.
- `make test` passed with 333 Angular tests, Go race tests, and `go vet`. `make build` and `git diff --check` passed.
- The existing stylesheet budget warning remains: `app.scss` is 6.57 kB against the 4.00 kB warning threshold.

## Open questions

- TASK-008 must provide the agreed foundation for integration and tests. The application direction, Go ownership of filesystem access, and lightweight workspace issue presentation are decided; ordering must still never be guessed.
- What should happen when an eligible destination becomes inaccessible before selection completes? Broken internal Markdown-link messages are decided; other failed-selection behavior and its tests still require resolution with TASK-004 and TASK-005.
