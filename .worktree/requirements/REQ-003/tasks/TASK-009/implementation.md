# TASK-009 — Implementation brief: Package and verify standalone distribution

Requirement: [REQ-003 — Self-contained application delivery](../../req.md)

Task: [TASK-009 — Package and verify standalone distribution](task.md)

Review state: Draft implementation brief for human review. Implementation requires explicit human approval.

## Objective

Build and verify a self-contained Worktree executable for each explicitly approved OS/architecture, with its optimized frontend embedded, clear build/run instructions, and evidence of standalone runtime and read-only workspace behavior.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [project architecture](../../../../project.md), [REQ-003](../../req.md), and the [approved task brief](task.md).

This task depends on the [TASK-008 foundation](../TASK-008/implementation.md). Reuse its build and host; do not introduce a second application or alternate architecture. V1 uses `./worktree --workspace /path/to/project`, with Go owning filesystem discovery, validation, and reading, and Angular using HTTP/JSON.

Final end-to-end distribution qualification also depends on accepted [TASK-004](../../../REQ-002/tasks/TASK-004/implementation.md), [TASK-005](../../../REQ-002/tasks/TASK-005/implementation.md), and [TASK-006](../../../REQ-002/tasks/TASK-006/implementation.md) behavior. Those tasks depend on TASK-008, not this task's final qualification. A successful package build does not establish that unimplemented workspace behavior works.

## Required work

### Package the approved targets

Obtain the approved OS/architecture and browser target list before claiming target coverage. Use TASK-008's optimized Angular production build and Go embedding workflow to produce one self-contained executable per approved OS/architecture. Required frontend assets must be included in that executable, not delivered as a mandatory external frontend directory or server.

Keep packaging simple. Record the exact build commands and identify which executable each command produces. Do not add release hosting, CI/CD deployment, installers, cloud services, or a new distribution framework merely to perform packaging. Reuse the foundation workflow rather than duplicating it.

### Verify standalone runtime

For each approved target, distinguish build success from actual runtime verification. Run the artifact in an environment without separately installed Go runtime, Node.js, or Angular CLI and without a separate frontend server. Confirm it runs with only the operating system and browser and does not require a database, external service, or other mandatory runtime infrastructure. Do not equate cross-compilation success with execution on that target.

Verify the executable serves its embedded production UI from an isolated location without the source checkout or frontend build output. Block external network access while permitting local loopback and verify that the UI and its required scripts, styles, fonts, and other assets load without a CDN or network resource outside the application. Inspect actual browser requests as evidence; a successful entry-document response alone is insufficient.

Confirm the packaged host retains TASK-008's default `127.0.0.1` binding. Do not add network configuration features during packaging.

### Verify workspace read-only behavior and product integration

After the relevant REQ-002 behavior is implemented and accepted, run the packaged executable against representative workspace input. Compare file paths and byte contents before and after opening, discovery, validation, selection, reading, and navigation, including malformed or missing artifacts handled by the application. No workspace source file may be created, overwritten, repaired, or deleted by browsing or presentation. Use a read-only workspace environment where supported to help detect attempted source writes, without modifying the real project workspace.

Verify CLI opening and the no-argument welcome, non-blocking issue reporting, polished document presentation and Markdown fallback, contextual links, and sequential navigation only against their owning approved contracts. This task verifies delivered behavior; it must not implement or redefine those features. If functionality or an edge-case decision remains blocked, report the exact unverified condition and do not claim final end-to-end qualification.

### Document use and report coverage

Provide concise build and run instructions using the actual established commands and produced artifacts, including the CLI workspace argument. Separate development/build prerequisites from standalone runtime requirements. Identify approved targets, those built, those actually executed and browser-tested, and those unverified or failing, with supporting commands and results. Do not invent platform support, release claims, or test success.

Docker remains optional. Do not require it to build, run, test, or deliver the standalone executable. Leave first-delivery inclusion unresolved; do not create Docker packaging until explicitly decided and authorized. If later included, it must run the same application, with no separate architecture. Workspace mounting/access expectations would need explicit agreement then.

## Constraints and exclusions

- Depend on TASK-008 for the foundation and on accepted REQ-002 behavior for final distribution checks. Neither foundation nor REQ-002 implementation may depend on this task's final qualification.
- Preserve CLI-only access, Go filesystem ownership, embedded production assets, default local-only binding, and read-only source Markdown.
- Introduce no supported targets, browser-folder-selection feature, external runtime service, alternate frontend server, cloud hosting, deployment infrastructure, or multi-service architecture.
- Runtime dependency, offline UI loading, and read-only checks are verification conditions, not new product features.
- Do not modify approved planning documents or approval states during implementation. Explicit human approval of this brief is required before work begins.

## Acceptance criteria

- One executable containing the optimized production frontend is built for each approved OS/architecture; approved versus unverified target coverage is stated accurately.
- Runtime verification demonstrates no separately installed Go runtime, Node.js, or Angular CLI is needed, and no separate frontend server is running or required.
- The executable serves its embedded UI outside the checkout without frontend build output; required UI assets load with no external CDN or network-resource dependency while loopback remains available.
- No database, external service, Docker installation, or additional mandatory runtime infrastructure is required for standalone use. Default binding remains `127.0.0.1`.
- After accepted REQ-002 functionality is available, packaged browsing and reading leave workspace source paths and byte contents unchanged, including when artifacts have issues. Attempted source writes are investigated rather than hidden by error handling.
- Build/run instructions are clear, separate build tools from runtime needs, and report verified, unverified, and failed target checks without treating build-only evidence as runtime qualification.
- Docker remains optional and first-delivery inclusion is explicitly unresolved. No independent architecture or unapproved packaging feature is introduced.
- Final end-to-end delivery claims are made only after relevant REQ-002 behavior is implemented, accepted, and verified in the packaged application. Blocked conditions remain reported as unverified.

## Verification and handoff

After implementation approval and target selection, build using the documented production workflow. For each approved target, collect build results, actual runtime environment, browser used, executable startup, listener binding, embedded asset responses, and external-network-blocked UI loading results. Inspect browser requests and confirm no separate frontend server or Go/Node.js/Angular CLI runtime installation is supplying the application.

Once REQ-002 functionality is accepted, exercise its opening, validation, reading, and navigation scenarios through the packaged binary. Use disposable workspace inputs with file-content/path comparisons and read-only permissions where supported; report both changes and attempted writes as failures. Do not run destructive qualification against the real source workspace.

Report packaged artifacts, exact commands and results, verified and unverified targets, remaining decisions, unmet criteria, and dependencies still awaiting acceptance. Preserve failures and uncertainty. Keep standalone build verification distinct from optional Docker checks and final end-to-end qualification.

## Open questions

- Which OS/architecture and browser targets are approved? This blocks the final build/qualification matrix and any claim of supported-platform coverage.
- Is Docker included in the first delivery? Until explicitly decided, standalone work proceeds without Docker; any future container workspace-access expectations also require agreement.
- Final end-to-end checks await implementation and acceptance of the relevant REQ-002 behavior, including resolution of remaining inaccessible-path/selection and non-HTTP/HTTPS outside-workspace interactions by their owning tasks.
