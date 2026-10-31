# Agent workspace contract

## Discover the instructions and sources

Read applicable project instructions and this contract before creating, reviewing, updating, or implementing workspace work. Before creating or updating an artifact, consult the [workspace conventions](conventions.md) for authoritative structure, identity, and linking rules, and the matching canonical template for authoritative metadata and sections:

- [Requirement template](templates/req.md)
- [Task brief template](templates/task.md)
- [Implementation brief template](templates/implementation.md)

The hierarchy is Project → Requirement → Task; `task.md` and `implementation.md` are separate documents belonging to the same task.

Before executing a task, read its requirement, task brief, approved implementation brief, applicable source context, and the [project primer](primer.md). Approved requirement and task intent and the primer express product decisions. Existing references such as `Requirement.md` do not override those decisions. Report conflicting instructions or approved sources and wait for human resolution before affected work continues. File recency alone does not establish authority.

## Create and update artifacts

Use the matching canonical template for each authorized new artifact at the fixed location defined by the conventions. Use approved IDs and parent relationships; request a missing ID or parent rather than inventing one or an allocation rule.

Replace placeholders with known, approved information. Preserve mandatory metadata labels, headings, and section order; omit unused optional content. Keep task briefs concise and execution detail in implementation briefs. Add task-specific prose, lists, tables, code blocks, or H3 subsections inside the approved sections as the template permits.

Before updating an artifact, read its existing content, parent requirement where applicable, and related briefs. Preserve approved intent, scope, stable IDs, directory names, primary filenames, single-parent relationships, and approval state. Check structure against the template without blindly replacing content. Changes to approved intent or scope require human authorization; avoid unrelated migrations or cleanup.

Maintain requirement-to-task links when authorized tasks are added, task-to-implementation links when briefs are prepared, and implementation-to-task and requirement references. Keep supporting material within its task directory and link it from applicable briefs. Resolve relative Markdown links from the destination artifact's directory, not the template directory, using exact filenames and case. Check affected links after edits.

## Respect human approval

Agree on the requirement and task breakdown. Task briefs must be approved before implementation briefs are prepared. Explicit human approval of the implementation brief authorizes implementation within its approved scope and subject to applicable project instructions.

Creating, editing, linking, or filling an artifact does not grant approval. Template comments and self-written review-state notes do not grant approval. Rely on explicit human instructions; ask before crossing an approval boundary when approval is missing or unclear. Do not introduce an approval record, metadata field, or workflow.

## Correct or report issues

Check artifacts against the conventions and matching template for missing required metadata or information, missing or malformed sections, invalid structure, inconsistent IDs or relationships, and broken links. A deferred implementation link explicitly labeled pending is distinct from an unexpected broken link. Template placeholders and illustrative examples are not live artifacts.

Correct an issue only when both conditions hold: the intended result is unambiguous from approved content and canonical sources, and the current authorization covers editing that artifact. For example, fix a link to a uniquely identified existing artifact or restore an exact mandatory heading around clearly corresponding existing content. Preserve meaning, identity, ownership, and approval state; report the correction and its basis. Approved planning artifacts still require authorization covering the correction. Finding a defect grants no permission to edit protected or unrelated files.

Report missing required information, ambiguous destinations, conflicting sources, duplicate or mismatched IDs, uncertain parent relationships, and structural defects requiring interpretation. Name the affected path and field, heading, or link; explain the issue and the human decision or authorization needed. Wait for human resolution before affected work continues; unaffected authorized work may continue.

Keep unknowns visibly unresolved in an authorized draft and do not claim it is complete or ready for execution. Do not invent requirements, decisions, identifiers, conventions, or approval claims. Report missing required artifacts or canonical sources instead of creating guessed replacements or empty placeholders.

Finish with a short report of changes, checks and results, corrections and their basis, unresolved issues, and remaining approval boundaries. Keep reporting proportional to the work; do not add tooling or a separate issue system.
