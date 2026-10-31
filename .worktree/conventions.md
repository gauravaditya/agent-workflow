# Workspace structure and linking conventions

Worktree organizes Markdown artifacts so humans can review intent and coding agents can find execution detail. Markdown files are the source of truth.

The logical hierarchy is Project → Requirement → Task. A task's `task.md` and `implementation.md` are separate documents belonging to that task, not additional hierarchy levels.

## Canonical layout

Paths are relative to the software project's root. `REQ-001` and `TASK-001` illustrate requirement and task IDs; each requirement and task has its own directory.

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

This is the intended layout, not an inventory of existing files. Do not create empty directories or placeholder artifacts merely to populate it. Implementation briefs are prepared after task-brief approval. A deferred brief does not indicate completed implementation. Supporting-material directories are optional and exist only when needed.

## Artifact purposes and relationships

| Location | Purpose and relationships |
| --- | --- |
| Root `AGENTS.md` | Entry point directing agents to `.worktree/AGENTS.md`, while preserving existing project instructions. |
| `.worktree/AGENTS.md` | Agent workspace contract. Detailed agent procedures belong to TASK-003. |
| `.worktree/project.md` | Project identity, purpose, and context, with links to its requirements. |
| `.worktree/conventions.md` | Shared project conventions, including this structure and linking reference. |
| `.worktree/templates/` | Canonical Markdown templates. TASK-002 defines their filenames and contents. |
| `.worktree/requirements/REQ-001/req.md` | Concise requirement intent and desired outcomes; links to every associated task brief in its `tasks/` directory. |
| `.worktree/requirements/REQ-001/tasks/TASK-001/task.md` | Concise human-readable task purpose and scope; links to its separate implementation brief. |
| `.worktree/requirements/REQ-001/tasks/TASK-001/implementation.md` | Detailed agent-ready execution specification; references its task brief and parent requirement. |
| Task-local supporting material | Optional references, examples, diagrams, or other supporting files within the relevant task directory. Applicable briefs link to these files. They do not replace the task's approved intent. |

Each requirement directory contains `req.md` and a `tasks/` directory. Each task directory contains its `task.md` and, once prepared after approval, its separate `implementation.md`. Supporting material belongs to that task and may be organized under `supporting-material/`.

## Naming and identity

- Use stable directory IDs in the agreed forms, such as `REQ-001` for requirements and `TASK-001` for tasks.
- Requirement IDs are unique among all requirements in the project. Task IDs are unique among all tasks in the project, including tasks under different requirements.
- Each task belongs to exactly one requirement.
- Primary filenames are fixed: `req.md`, `task.md`, and `implementation.md`. Preserve their spelling and case.
- Human-readable titles are separate from IDs. Changing a title must not change its ID, directory, or established links.

These conventions do not define ID allocation, additional identifier forms, metadata fields, or a task-move workflow. Unresolved naming decisions require human resolution rather than invented rules.

## Relative Markdown links

Resolve a link from the directory containing the source Markdown file. Use the exact target filename and case, including `.md`, and a relative path between workspace artifacts. Links should continue to work when the project directory moves. Do not use machine-specific absolute paths or directory-only links for artifact navigation.

For example, in `.worktree/requirements/REQ-001/req.md`:

```markdown
[Task brief](tasks/TASK-001/task.md)
```

The source paths below are relative to the project root. “Either task document” means `task.md` or `implementation.md` in `.worktree/requirements/REQ-001/tasks/TASK-001/`.

| Source | Target | Relative target |
| --- | --- | --- |
| `.worktree/project.md` | Requirement brief | `requirements/REQ-001/req.md` |
| `.worktree/requirements/REQ-001/req.md` | Task brief | `tasks/TASK-001/task.md` |
| `.worktree/requirements/REQ-001/tasks/TASK-001/task.md` | Implementation brief | `implementation.md` |
| `.worktree/requirements/REQ-001/tasks/TASK-001/implementation.md` | Task brief | `task.md` |
| Either task document | Parent requirement | `../../req.md` |
| Either task document | Task supporting material | `supporting-material/example.md` |

These are path examples, not claims that all sources or targets exist. In the current workspace, `project.md` is planned and `supporting-material/example.md` is illustrative. An implementation brief may be deferred pending task-brief approval; label such links as pending instead of implying the file exists. Both TASK-001 briefs currently exist.

## Sources and boundaries

These conventions implement the structure and linking scope of [REQ-001](requirements/REQ-001/req.md), [TASK-001](requirements/REQ-001/tasks/TASK-001/task.md), and its [implementation brief](requirements/REQ-001/tasks/TASK-001/implementation.md), using the [project primer](primer.md) as product context.

The approved requirement, task brief, and primer express the intended product decisions. The existing [structure reference](../Requirement.md) does not override them. If it conflicts with those decisions, report the conflict and wait for human resolution before proceeding.

Actual template definitions belong to TASK-002. Detailed agent discovery, artifact creation and update, validation, and correction procedures belong to TASK-003. This document does not define those procedures, metadata schemas, or viewer behavior, and does not establish completion of the broader workspace contract.
