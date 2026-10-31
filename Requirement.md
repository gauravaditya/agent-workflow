# Workspace Structure Contract

**Status:** Agreed\
**Scope:** Folder structure, artifact organization, and navigation relationships\
**Purpose:** Establish a predictable workspace structure that humans can navigate easily and coding agents can follow consistently.

## 1. Core Principles

1. Markdown files are the source of truth.
2. Every requirement and task has its own directory.
3. Every artifact has a clearly defined purpose and location.
4. Human-readable task briefs and agent-ready implementation briefs are separate files.
5. Related artifacts are connected through explicit relative Markdown links.
6. Supporting material belongs to the task it supports.
7. Agents must follow the defined structure and templates rather than inventing their own conventions.
8. The viewer presents a curated, structured interface rather than exposing the filesystem as a plain tree or displaying Markdown as an unstructured text dump.

## 2. Canonical Folder Structure

```text
my-project/
├── AGENTS.md
└── .worktree/
    ├── AGENTS.md
    ├── project.md
    ├── conventions.md
    └── requirements/
        ├── REQ-001/
        │   ├── req.md
        │   └── tasks/
        │       ├── TASK-001/
        │       │   ├── task.md
        │       │   ├── implementation.md
        │       │   └── supporting-material/
        │       └── TASK-002/
        │           ├── task.md
        │           ├── implementation.md
        │           └── supporting-material/
        └── REQ-002/
            ├── req.md
            └── tasks/
                └── TASK-003/
                    ├── task.md
                    └── implementation.md
```

The structure above is illustrative. Supporting-material directories are optional and should only be created when needed.

## 3. Artifact Responsibilities

### Project

**`project.md`**

Defines the project identity, purpose, and high-level context.

**`conventions.md`**

Contains shared project conventions and decisions relevant to the work managed in the workspace.

**`.worktree/AGENTS.md`**

Defines the workspace contract for agents, including folder conventions, naming rules, templates, linking requirements, and expectations for creating or modifying artifacts.

**Root `AGENTS.md`**

Provides an entry point directing coding agents to `.worktree/AGENTS.md`. Existing project instructions must be preserved and integrated rather than overwritten.

### Requirement

**Location:** `.worktree/requirements/REQ-001/req.md`

The requirement captures the essential intent and desired outcome in a concise, human-readable form.

It must:

- Explain what needs to be achieved and why.
- Avoid unnecessary implementation details.
- Link to every task associated with the requirement.
- Remain understandable without opening its tasks.

### Task brief

**Location:** `.worktree/requirements/REQ-001/tasks/TASK-001/task.md`

The task brief is the primary human-facing description of a task.

It must:

- Explain the task's purpose and scope concisely.
- Communicate what needs to be accomplished.
- Link to its implementation brief.
- Link to relevant supporting material when applicable.

### Implementation brief

**Location:** `.worktree/requirements/REQ-001/tasks/TASK-001/implementation.md`

The implementation brief is the agent-facing specification for executing the task.

It contains the implementation details necessary to perform the work, including applicable requirements, constraints, technical context, and acceptance criteria.

It must:

- Reference the task and its parent requirement.
- Provide actionable, unambiguous instructions.
- Include only relevant implementation context.
- Remain consistent with the approved task brief.
- Avoid silently changing the scope or intent of the task.

### Supporting material

**Location:** Inside the corresponding task directory.

Supporting material may include diagrams, examples, reference documents, or other files needed to understand or implement a task.

Rules:

- Supporting files are optional.
- Related material must remain organized within the task directory.
- The primary task and implementation briefs must link to relevant supporting files.
- Supporting material must not become an alternative source of truth for the task's intent.

## 4. Hierarchy and Navigation

The logical hierarchy is:

**Project → Requirement → Task → Task brief / Implementation brief**

The implementation brief is a separate artifact belonging to the same task, not another hierarchy level.

Navigation relationships:

- The project provides access to its requirements.
- Each requirement links to all its tasks.
- Each task brief links to its implementation brief.
- Both briefs may link to relevant supporting material.
- Relative Markdown links are used wherever artifacts reference one another.

The viewer must resolve these relationships without requiring users to understand the underlying directory layout.

## 5. Naming and Identity

- Requirement directories use stable identifiers such as `REQ-001`.
- Task directories use stable identifiers such as `TASK-001`.
- Primary filenames are fixed: `req.md`, `task.md`, and `implementation.md`.
- Folder identifiers are independent of human-readable titles.
- Renaming a title must not change an artifact's identity.
- Each task belongs to one parent requirement in the agreed hierarchy.
- IDs must be unique within their respective artifact types.

## 6. Agent Compliance

Agents working in a configured project must:

1. Read the applicable project instructions and `.worktree/AGENTS.md`.
2. Follow the canonical directory structure and naming conventions.
3. Use the prescribed templates for primary artifacts.
4. Preserve IDs, parent relationships, and relative links.
5. Keep human-facing summaries concise and implementation instructions appropriately detailed.
6. Store supporting material in the relevant task directory.
7. Avoid creating unrecognized hierarchy levels or arbitrary primary artifact formats.
8. Report missing references, ambiguous requirements, or structural inconsistencies instead of silently inventing replacements.
9. Preserve approved intent and scope unless changes are explicitly authorized.

## 7. Viewer Expectations

The viewer must render the agreed structure as an intuitive, curated workspace.

It must support navigation from project context to requirements, tasks, and their respective briefs.

It must:

- Present requirements and tasks through concise summaries.
- Keep task briefs and implementation briefs clearly distinct.
- Resolve links between artifacts.
- Present supporting material in the context of its task.
- Identify missing required files, broken links, and structural inconsistencies clearly.
- Render standardized Markdown sections consistently.

The underlying folder tree is an organizational contract, not the intended primary user interface.

## 8. Scope Boundary

This document establishes only the workspace structure, artifact responsibilities, navigation relationships, and agent expectations.

It does not define:

- Application architecture or technology choices.
- UI component design or visual styling.
- Detailed Markdown templates and validation schemas.
- Agent execution or direct integration mechanisms.
- Additional project management capabilities.

Those decisions remain separate and must not change the agreed structure without an explicit revision to this contract.

---

**Acceptance criteria**

- [ ] Every requirement has its own directory containing `req.md` and a `tasks/` directory.
- [ ] Every task has its own directory containing `task.md` and `implementation.md`.
- [ ] Optional supporting material remains organized within the relevant task directory.
- [ ] Requirement-to-task and task-to-implementation links are defined as relative Markdown links.
- [ ] Agent instructions establish the canonical structure and expected behavior.
- [ ] The viewer is expected to render the hierarchy as a curated, navigable interface.
- [ ] No additional hierarchy levels or unrelated product capabilities are introduced by this contract.
