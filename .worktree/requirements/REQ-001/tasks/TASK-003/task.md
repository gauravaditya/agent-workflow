# TASK-003 — Define the agent workspace contract

Parent requirement: [REQ-001 — Establish the workspace contract](../../req.md)

Review state: Completed. Task and implementation briefs approved; the agent workspace contract and root entry point delivered in `.worktree/AGENTS.md` and root `AGENTS.md`, verified, reviewed, and accepted by the human.

## Purpose

Enable agents to maintain the workspace consistently while preserving human-approved intent and scope.

## Scope

Specify how agents discover the instructions, create and update artifacts, preserve IDs and links, and discover and reuse the canonical templates under `.worktree/templates/`. Define how agents handle missing or inconsistent information without inventing requirements or decisions.

Define how agents handle artifacts with missing required fields, invalid structure, or broken links. Instructions must specify when agents report these issues and when they may correct them under the approved contract, preserving approved intent and scope without silently inventing conventions.

## Expected outcome

Agents have clear instructions consistent with the structure and links covered by [TASK-001](../TASK-001/task.md) and the templates covered by [TASK-002](../TASK-002/task.md). They can locate and reuse the canonical templates and report or correct invalid artifacts according to the approved contract. The instructions preserve the human approval boundaries for task briefs, implementation briefs, and implementation.

## Implementation brief

[Implementation brief](implementation.md)
