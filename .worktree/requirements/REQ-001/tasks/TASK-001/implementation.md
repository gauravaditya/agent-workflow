# TASK-001 — Implementation brief: workspace structure and linking conventions

Requirement: [REQ-001 — Establish the workspace contract](../../req.md)

Task: [TASK-001 — Define the workspace structure and linking conventions](task.md)

Review state: Completed. Approved implementation delivered and verified; outcome reviewed and accepted by the human.

## Objective

Document where Worktree artifacts belong, what each artifact does, how identifiers remain stable, and how artifacts link to one another. A human or agent must be able to navigate the workspace without inventing conventions.

## Context and sources

Read the applicable project instructions, the [project primer](../../../../primer.md), the requirement and task linked above, and the existing [workspace structure contract](../../../../../Requirement.md) before implementing.

The approved REQ-001 requirement, TASK-001 task brief, and project primer express the intended product decisions. Treat `Requirement.md` as an existing reference, not as authority over those decisions. If it conflicts with any of them, report the conflict and wait for human resolution before proceeding; do not silently choose or reconcile a conflicting rule.

The approved hierarchy is Project → Requirement → Task. A task has separate human-readable and agent-ready briefs. Both documents belong to the task; neither introduces another hierarchy level. Markdown files remain the source of truth.

The canonical Markdown templates have not been finalized. This brief's organization does not establish their required metadata or sections.

## Required work

### 1. Document the canonical layout

Create `.worktree/conventions.md` as the shared reference for the structure and linking conventions below. Keep this task's changes limited to that document; reference existing source documents rather than rewriting them.

Include the following layout, clearly identifying the example requirement and task IDs and the optional supporting-material directory:

```text
my-project/
├── AGENTS.md
└── .worktree/
    ├── AGENTS.md
    ├── project.md
    ├── conventions.md
    ├── templates/
    └── requirements/
        └── REQ-001/
            ├── req.md
            └── tasks/
                └── TASK-001/
                    ├── task.md
                    ├── implementation.md
                    └── supporting-material/   (optional)
```

Document the intended layout without creating empty directories or placeholder artifacts to populate it. Explain that implementation briefs are prepared after task-brief approval; a deferred brief is not evidence of completed implementation.

### 2. Explain artifact purposes and relationships

- Root `AGENTS.md` provides the entry point to workspace instructions while preserving existing project instructions.
- `.worktree/AGENTS.md` holds the agent workspace contract.
- `project.md` supplies project identity, purpose, and context, with access to its requirements.
- `conventions.md` holds shared project conventions, including this structure and linking reference.
- `.worktree/templates/` holds the canonical Markdown templates; their contents and filenames are defined by TASK-002.
- Each requirement directory contains `req.md` and a `tasks/` directory. Its `req.md` explains intent and desired outcomes and links to every associated task brief.
- Each task directory holds `task.md` and its separate `implementation.md`. The task brief states concise human-readable purpose and scope and links to the implementation brief. The implementation brief supplies execution detail and references its task and parent requirement.
- Optional supporting material stays within its task directory. Applicable briefs link to it; supporting material does not replace the task's approved intent.

### 3. Document naming and identity rules

Use stable requirement and task directory IDs in the agreed forms, such as `REQ-001` and `TASK-001`. Keep primary filenames fixed as `req.md`, `task.md`, and `implementation.md`.

Requirement IDs must be unique among requirements in the project; task IDs must be unique among tasks in the project. Each task belongs to one requirement. Titles are separate from identity: changing a title must not change its ID, directory, or established links.

Do not introduce an ID allocation mechanism, new identifier forms, metadata schema, or task-move workflow. Raise any unresolved naming decision rather than silently extending the rules.

### 4. Document relative Markdown links

Resolve each workspace link from the directory containing the source Markdown file. Link to the target file using its exact name and case. Use relative paths for workspace artifacts so links remain usable when the project directory moves.

Include these examples with their source locations:

Source paths below are relative to the project root. “Either task document” means `task.md` or `implementation.md` in `.worktree/requirements/REQ-001/tasks/TASK-001/`.

| Source | Target | Relative target |
| --- | --- | --- |
| `.worktree/project.md` | Requirement brief | `requirements/REQ-001/req.md` |
| `.worktree/requirements/REQ-001/req.md` | Task brief | `tasks/TASK-001/task.md` |
| `.worktree/requirements/REQ-001/tasks/TASK-001/task.md` | Implementation brief | `implementation.md` |
| `.worktree/requirements/REQ-001/tasks/TASK-001/implementation.md` | Task brief | `task.md` |
| Either task document | Parent requirement | `../../req.md` |
| Either task document | Task supporting material | `supporting-material/example.md` |

Show ordinary Markdown link syntax, such as `[Task brief](tasks/TASK-001/task.md)` from `req.md`. Label illustrative targets and deferred files clearly; do not imply they already exist. Avoid machine-specific absolute paths and directory-only links in artifact navigation.

## Constraints and exclusions

- Preserve the approved hierarchy, IDs, folder locations, primary filenames, and artifact relationships.
- Document the structure and link rules only. Do not create or finalize templates, mandatory or optional content sections, or metadata fields; those belong to TASK-002.
- Describe the locations and purposes of agent instruction files without writing their detailed discovery, creation, update, validation, or correction procedures; those belong to TASK-003.
- Do not build a viewer, parser, validator, workspace generator, integration, or other software feature.
- Do not modify approved planning artifacts, the primer, existing agent instructions, or `Requirement.md`. Report a source conflict or missing product decision and wait for human resolution before proceeding. `Requirement.md` must not override the intended product decisions in the approved requirement, task brief, and primer.
- Keep shared rules concise and in one reference. Do not copy this brief into the conventions document or claim the broader workspace contract is implemented.

## Acceptance criteria

- [ ] `.worktree/conventions.md` describes the canonical layout, including `.worktree/templates/`, requirement directories, task directories, separate task and implementation briefs, and optional task-local supporting material.
- [ ] Artifact purposes and the Project → Requirement → Task hierarchy are clear, with no additional hierarchy level.
- [ ] Stable IDs, uniqueness within each artifact type across the project, fixed filenames, single requirement ownership, and title-independent identity are explicit.
- [ ] Project-to-requirement, requirement-to-task, task-to-implementation, implementation-to-task and requirement, and supporting-material links are described with correct relative-path examples.
- [ ] Examples distinguish illustrative or deferred targets from existing files. All live document links resolve.
- [ ] The document follows the intended product decisions in the approved requirement, task brief, and primer. Any conflict with `Requirement.md` is reported and implementation waits for human resolution.
- [ ] No templates, metadata schemas, detailed agent procedures, unrelated artifacts, or runtime features are introduced.

## Verification and handoff

Review the conventions document against each acceptance criterion and the source documents. Check relative-path examples from their stated source directories, live links, Markdown structure, and whitespace. Documentation review is sufficient; do not add runtime tests or new validation tooling for this task.

Report the changed file, checks performed and their results, unmet criteria, and any deviations or unresolved decisions. Follow applicable repository delivery instructions and report unavailable Git or publication capabilities accurately. Human approval of this brief is required before any of this work begins.
