# Worktree — Project Primer for Coding Agents

## 1. Project Purpose

Worktree is a lightweight workspace for planning and implementing software with coding agents.

Its purpose is to reduce the cognitive overhead of agent-assisted development by organizing work into a clear hierarchy and separating concise, human-readable task briefs from detailed, agent-ready implementation briefs.

The product consists of two core parts:

1. A predictable Markdown-based workspace structure that humans and coding agents can follow.
2. A curated viewer that renders the workspace as an intuitive, navigable interface rather than a raw file tree or unstructured Markdown dump.

Markdown files are the source of truth.

## 2. The Problem We Are Solving

The planning and implementation process often produces verbose documentation that is difficult for humans to review.

Worktree must make it possible for a human to understand the intended outcome, review the scope of a task, and approve implementation without having to read the full technical specification.

Detailed instructions remain available to coding agents in separate implementation briefs.

The human remains responsible for approving intent and scope. The coding agent implements the approved work.

## 3. Agreed Hierarchy

The only supported work hierarchy is:

Project → Requirement → Task

Each task has two separate primary documents:

- `task.md`: concise, human-readable task brief.
- `implementation.md`: detailed, agent-ready implementation brief.

A requirement has its own `req.md` file and links to its tasks. A task brief links to its implementation brief.

The implementation brief is a document belonging to a task, not an additional hierarchy level.

## 4. Agreed Folder Structure

```text
my-project/
├── AGENTS.md
└── .worktree/
    ├── AGENTS.md
    ├── project.md
    ├── conventions.md
    └── requirements/
        └── REQ-001/
            ├── req.md
            └── tasks/
                └── TASK-001/
                    ├── task.md
                    ├── implementation.md
                    └── supporting-material/
```

Supporting material is optional. When present, it belongs to the relevant task and should be referenced by the applicable brief.

Every requirement and task must have a dedicated directory. Primary filenames and directory naming conventions are fixed.

## 5. Product Boundaries

The MVP is intentionally small.

It includes:

- The workspace folder and file conventions.
- Standardized Markdown templates.
- Agent instructions explaining the workspace contract.
- A curated UI for navigating and reading the Markdown artifacts.
- Support for introducing the workspace into an existing software project.
- Copy-ready and file-based agent handoff, using the same underlying task specification.

It does not include a general project management platform, sprint planning, team dashboards, a database-backed task system, mandatory agent integrations, or unrelated productivity features.

Do not add features beyond the agreed scope.

## 6. Working Model

Product planning is performed by the human and the planning assistant.

Codex is the implementation agent.

The planning workflow is:

1. Agree on a requirement.
2. Break it into concise, reviewable tasks.
3. Obtain human approval of the task breakdown.
4. Create the task briefs.
5. Create implementation briefs for approved tasks.
6. Implement the approved tasks.
7. Verify the result against the implementation brief and acceptance criteria.

Do not skip ahead to implementation while the relevant planning artifacts remain unapproved.

## 7. Authority and Decision Boundaries

Human-approved decisions are authoritative.

Codex may make routine implementation choices within an approved specification, but it must not independently change product scope, introduce new hierarchy levels, or redefine established artifact conventions.

If a requirement is ambiguous, a decision is missing, or an implementation constraint conflicts with the brief:

- Identify the issue.
- Explain why it matters.
- Suggest a minimal resolution if useful.
- Ask for clarification when the issue requires a product decision.

Do not silently invent requirements or treat suggestions as approved decisions.

## 8. Documentation Expectations

Keep documentation proportional to the work.

- Requirements express intent and desired outcomes concisely.
- Task briefs explain the work in human-readable terms.
- Implementation briefs contain the technical detail required for implementation.
- Shared conventions are documented once rather than duplicated across every task.
- Every artifact must follow the agreed templates and linking conventions.

Do not generate exhaustive documentation merely for completeness.

## 9. Implementation Discipline

Before implementing a task:

- Read this primer and the applicable agent instructions.
- Read the approved requirement, task brief, and implementation brief.
- Inspect relevant existing code and project conventions.
- Identify conflicts or missing prerequisites before making changes.

During implementation:

- Stay within the approved scope.
- Preserve existing project behavior unless a change is required by the brief.
- Avoid unnecessary abstractions and dependencies.
- Follow the project's established conventions.
- Do not modify approved planning artifacts without authorization.

After implementation:

- Run relevant tests and checks.
- Report the changes made, the checks performed, their results, and any outstanding issues.
- Identify deviations from the implementation brief.
- Do not claim that a task is complete if its acceptance criteria have not been verified.

## 10. Current Planning State

The workspace structure has been agreed upon.

The Markdown templates, exact metadata fields, agent contract details, viewer design, and implementation architecture have not yet been finalized.

These decisions must be made through the planning workflow rather than inferred from this primer.

## 11. Instructions for the Current Session

Treat this document as project context, not as authorization to begin implementation.

Do not create additional requirements, tasks, templates, or architecture decisions on your own.

Wait for the human-approved requirement and task breakdown, then implement only the task explicitly handed over through its approved implementation brief.

When information is insufficient, raise the issue instead of guessing.
