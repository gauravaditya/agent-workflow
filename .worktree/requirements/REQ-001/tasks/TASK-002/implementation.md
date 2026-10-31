# TASK-002 — Implementation brief: Markdown templates

Requirement: [REQ-001 — Establish the workspace contract](../../req.md)

Task: [TASK-002 — Define the Markdown templates](task.md)

Review state: Completed. Approved implementation delivered and verified; outcome reviewed and accepted by the human.

## Objective

Provide three predictable Markdown starting points for requirements, concise human-facing task briefs, and detailed agent-facing implementation briefs. Make required content explicit while allowing relevant task-specific detail within a consistent structure.

## Context and sources

Read the applicable project instructions, [REQ-001](../../req.md), the [TASK-002 brief](task.md), the [project primer](../../../../primer.md), and the completed [workspace conventions](../../../../conventions.md) before implementing.

The approved requirement, task brief, and primer express the intended product decisions; the conventions define the completed structure and linking rules. If these sources conflict or leave a product decision unresolved, report it and wait for human resolution. An existing reference such as `Requirement.md` must not override approved product decisions.

The hierarchy remains Project → Requirement → Task. `task.md` and `implementation.md` are separate documents belonging to the same task. Templates are reusable source files, not additional work items or hierarchy levels.

## Required work

### 1. Create only the three canonical template files

Create these files under `.worktree/templates/`:

| Template source | Artifact created from it |
| --- | --- |
| `.worktree/templates/req.md` | `.worktree/requirements/REQ-<id>/req.md` |
| `.worktree/templates/task.md` | `.worktree/requirements/REQ-<id>/tasks/TASK-<id>/task.md` |
| `.worktree/templates/implementation.md` | `.worktree/requirements/REQ-<id>/tasks/TASK-<id>/implementation.md` |

The angle-bracket text illustrates replacement values, not a new identifier format. Actual IDs retain the agreed forms, such as `REQ-001` and `TASK-001`.

Keep authoring guidance inside the templates as brief HTML comments. Do not add a separate guide, schema, generator, validator, or example workspace.

### 2. Define mandatory and optional metadata

Use ordinary Markdown, without YAML front matter or a machine-readable metadata schema. Each template must identify the following information before its content sections:

| Template | Mandatory metadata | Optional metadata |
| --- | --- | --- |
| Requirement | One H1 containing the requirement ID and human-readable title | `Review state:` followed by a factual human-readable note |
| Task | One H1 containing the task ID and title; `Requirement:` with a relative link to its parent requirement | `Review state:` followed by a factual human-readable note |
| Implementation | One H1 containing the task ID and title, identifying it as an implementation brief; `Requirement:` and `Task:` with relative links to the parent requirement and task brief | `Review state:` followed by a factual human-readable note |

The implementation brief reuses its task's ID; it has no independent work-item ID. Titles do not determine IDs or directories.

Mark each metadata item as mandatory or optional in an adjacent authoring comment. Use clear replacement placeholders, never prefilled approval or completion claims. A review-state note records known facts only; it does not introduce status enums, an approval mechanism, or new workflow rules. Omit optional metadata when it adds no useful information. Do not require dates, owners, priorities, estimates, or other metadata.

### 3. Specify the content sections

Keep the following H2 headings in the stated order. Identify each as mandatory or optional through a short adjacent authoring comment. The labels describe authoring requirements and need not appear in rendered headings.

| Template | Mandatory sections, in order | Optional sections, after the mandatory sections |
| --- | --- | --- |
| Requirement | `Intent`, `Desired outcome`, `Scope`, `Tasks` | `Open questions` |
| Task | `Purpose`, `Scope`, `Expected outcome`, `Implementation brief` | `Supporting material`, `Open questions` |
| Implementation | `Objective`, `Context and sources`, `Required work`, `Constraints and exclusions`, `Acceptance criteria`, `Verification and handoff` | `Supporting material`, `Open questions` |

For the requirement template, prompt for what needs to be achieved and why, the desired result, and scope boundaries. The `Tasks` section must link to every associated task brief; do not embed detailed execution plans in the requirement.

For the task template, use short prompts that produce a brief a human can review on its own. Explain purpose, included work and boundaries, and the observable outcome in a few sentences or focused bullets. Keep implementation steps and technical detail in the separate implementation brief. The `Implementation brief` section must include its relative link, labeled pending when the file is deferred.

For the implementation template, prompt for relevant source context, actionable required work, explicit constraints and exclusions, explicit and testable acceptance criteria, and checks and reporting needed for handoff. Use checklists where useful, with items initially unchecked; bullets, numbered lists, or tables are also acceptable when each criterion remains independently verifiable. Do not prefill passing results.

Optional supporting-material sections link to relevant files inside the task directory, such as `supporting-material/example.md`. Relevant references may also appear in the applicable mandatory section; a separate optional section is not required for every link. Open questions capture unresolved information without guessing.

Keep template reminders about human approval, unresolved information, and deferred implementation short and relevant to the section. A reminder may state that implementation requires human approval, unknown information must not be invented, or a deferred implementation link is pending. Do not duplicate detailed operational rules; those belong to TASK-003.

### 4. Allow detail within the defined structure

Retain mandatory headings and metadata labels across artifacts. Add task-specific prose, lists, tables, code blocks, or H3 subsections inside the relevant H2 section when useful. Do not add arbitrary peer H2 sections, rename mandatory sections, or introduce additional metadata fields as an ad hoc format.

Optional sections and metadata may be omitted entirely when unused. Required sections remain present and meaningful; where a section genuinely has nothing applicable, use a short explicit statement instead of an unexplained blank. Mark unresolved required information clearly rather than inventing it; leave detailed handling procedures to TASK-003. Placeholder guidance is not completed artifact content.

### 5. Preserve paths and links

Author link placeholders for the destination artifact directory, not the template source directory. Explain this distinction in a short template comment. Use exact filenames and case, relative Markdown paths, and descriptive link text.

| Destination source | Target | Relative target |
| --- | --- | --- |
| `.worktree/requirements/REQ-001/req.md` | Associated TASK-001 brief | `tasks/TASK-001/task.md` |
| `.worktree/requirements/REQ-001/tasks/TASK-001/task.md` | Parent requirement | `../../req.md` |
| Same task brief | Implementation brief | `implementation.md` |
| `.worktree/requirements/REQ-001/tasks/TASK-001/implementation.md` | Task brief | `task.md` |
| Same implementation brief | Parent requirement | `../../req.md` |
| Either task document | Task-local supporting file | `supporting-material/example.md` |

These are illustrative examples for authoring guidance, not links to be resolved from `.worktree/templates/`. Replace example IDs and filenames when instantiating an artifact. Distinguish placeholders, illustrative supporting files, and explicitly deferred implementation briefs from existing live references. Never create placeholder files merely to make a template example resolve.

## Constraints and exclusions

- Implementation changes are limited to the three template files under `.worktree/templates/`. Do not migrate or rewrite existing planning artifacts, conventions, the primer, `Requirement.md`, or agent instructions.
- Preserve the approved hierarchy, fixed artifact filenames, stable IDs, task ownership, relative links, and task-local supporting material.
- Keep requirement and task templates concise. Detailed execution context belongs in implementation briefs; shared conventions remain in their existing reference.
- Keep template reminders about approval, unresolved information, and deferred implementation concise. Do not duplicate the detailed approval, unresolved-information handling, agent discovery, artifact update, validation, or correction procedures assigned to TASK-003.
- Do not introduce viewer behavior, integrations, dependencies, executable tooling, or additional product features.
- Do not claim that authoring comments, a filled template, or a review-state note grants approval or establishes completed work.

## Acceptance criteria

- [ ] Exactly the three specified template files are created under `.worktree/templates/`; unrelated files remain unchanged.
- [ ] Each template explicitly distinguishes mandatory and optional metadata and sections, using the labels and ordering defined above.
- [ ] Metadata preserves stable identity and requirement/task relationships. The implementation template reuses its task ID and introduces no hierarchy level or metadata schema.
- [ ] Requirement content covers intent, outcome, scope, and links to all tasks. Task content stays concise and human-friendly, with a separate implementation link. Implementation content provides predictable execution detail, constraints, acceptance criteria, and verification.
- [ ] Acceptance-criteria guidance requires explicit, testable, independently verifiable criteria while allowing checklists, bullets, numbered lists, or tables as appropriate. Checklist items start unchecked and no results are prefilled.
- [ ] Templates explain how to include task-specific details within the defined structure, omit unused optional content, and identify unresolved required information without inventing it.
- [ ] Link guidance uses destination-relative paths consistent with `.worktree/conventions.md`, clearly distinguishes illustrative or deferred targets, and keeps supporting material task-local.
- [ ] Placeholders and comments are clear, carry no implied approval or completed results, and do not require extra files or tooling.
- [ ] Template reminders about approval, unresolved information, and deferred implementation are brief; detailed operational rules remain with TASK-003. No detailed TASK-003 contract, viewer work, or other out-of-scope feature is introduced.

## Verification and handoff

Review all three templates against the acceptance criteria and approved sources. Check metadata labels, mandatory and optional section comments, heading order, task-brief concision, and the completeness of implementation prompts.

Verify every relative-path example from its stated destination directory, including both task documents for supporting-material links. Distinguish path correctness from target existence. Check all live reference links, Markdown structure, whitespace, and that only the three permitted files changed. An in-memory or temporary substitution may help verify placeholders; do not add sample artifacts or persistent validation tooling. Runtime tests are unnecessary for this documentation-only task.

Report changed files, check results, deviations, unresolved decisions, and delivery limitations. Follow applicable repository delivery instructions without claiming unavailable Git or publication steps succeeded. Wait for explicit human approval of this brief before creating the templates. Do not begin TASK-003.
