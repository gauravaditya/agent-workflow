# TASK-008 — Implementation brief: Establish the executable application foundation

Requirement: [REQ-003 — Self-contained application delivery](../../req.md)

Task: [TASK-008 — Establish the executable application foundation](task.md)

Review state: Draft implementation brief for human review. Implementation requires explicit human approval.

## Objective

Establish a minimal Go executable that serves an optimized embedded Angular frontend and supports HTTP/JSON communication, with local-only default binding, clear build workflows, and graceful shutdown. Supply the foundation for REQ-002 without implementing its product behavior.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [project architecture](../../../../project.md), [REQ-003](../../req.md), and the [approved task brief](task.md).

There is currently no application code or build infrastructure. Establish only the approved Go standard-library HTTP server and Angular/TypeScript/SCSS foundation. Development/build tools are separate from standalone runtime requirements.

Ownership is fixed: [TASK-004](../../../REQ-002/tasks/TASK-004/implementation.md) owns CLI workspace opening, the no-argument welcome screen, hierarchy, selection, and non-blocking workspace validation/issues; [TASK-005](../../../REQ-002/tasks/TASK-005/implementation.md) owns reading and contextual links; [TASK-006](../../../REQ-002/tasks/TASK-006/implementation.md) owns sequential navigation. Go owns all workspace filesystem access; Angular uses HTTP/JSON. Do not implement those product features in this task.

[TASK-009](../TASK-009/task.md) consumes this foundation for packaging and delivery qualification. This task does not depend on TASK-009 or implemented REQ-002 features; its foundation checks must run independently, avoiding a dependency cycle.

## Required work

### Establish the minimal host and frontend

Create a small Go application entry point using the standard-library HTTP server. Separate static asset handling from API handling clearly without adding an HTTP framework or unnecessary architectural layers. Establish the Angular application in TypeScript and SCSS with only the minimal application mount needed to demonstrate serving the frontend. Do not build the workspace welcome screen, browser, reader, issues UI, or navigation as foundation demonstrations.

Bind the server to `127.0.0.1` by default. Use an explicit loopback address rather than a wildcard or empty host that exposes the listener to the local network. Do not introduce network-binding configuration features. Report the actual local URL on successful startup and make startup failures, including failure to bind, observable rather than claiming readiness.

Establish a minimal API routing and JSON response convention: keep API routes distinct from frontend routes, use appropriate HTTP status codes, and identify JSON responses with the appropriate content type, including API errors. Provide only the minimal exchange needed to demonstrate Angular-to-Go communication, documenting its actual endpoint, method, and response. The concrete exchange may be a routine implementation choice. Do not introduce domain-specific endpoints, unnecessary API versioning, speculative contracts, workspace discovery or reading behavior, or a monitoring feature.

### Build and embed production assets

Provide the Angular production build with minification, tree-shaking, asset optimization, and lazy loading where appropriate to the actual foundation. Do not add artificial routes or features just to demonstrate lazy loading.

Embed the resulting frontend assets into the Go executable using Go embedding. Serve the entry document and its referenced assets from the embedded content at runtime, with appropriate content types. Constrain asset path resolution to the embedded filesystem so paths, including encoded traversal attempts, cannot escape it or fall through to host filesystem access. The production executable must not read a frontend build directory from the working directory or require a separately running frontend server.

Preserve clear API/static routing separation. Unknown API routes must return an appropriate API error, never the frontend entry document. Serve the frontend entry document only for appropriate frontend navigation requests, accounting for the request method, requested content type, and actual frontend routes. Missing asset requests and ineligible requests must not be disguised as successful frontend navigation. Document the routing behavior without creating artificial frontend routes or product features.

Keep the UI's required scripts, styles, fonts, and other load-time assets local to the application; no external CDN or network resource may be needed to load it. Preserve the existing no-database, no-external-services, and no-mandatory-additional-runtime-infrastructure constraints.

### Startup, shutdown, and build workflows

Start the local server and release its resources on normal process termination using graceful HTTP shutdown. Allow active requests to finish within a bounded shutdown period and report shutdown failure accurately. Choose a small, justified shutdown bound during implementation rather than adding a general lifecycle framework or configuration surface. Do not leave an application listener running after shutdown completes.

Provide concise development and production build instructions with the actual commands established by the implementation. Define the order: obtain development dependencies, build the optimized Angular frontend, then build the Go executable embedding those assets. Make a missing frontend build fail clearly rather than producing a falsely complete binary. Document any development-only frontend server separately; it must never be a production runtime dependency.

Commit dependency manifests and lockfiles where supported, including the normal Go module files and frontend dependency manifest/lockfile as applicable. Document reproducible dependency installation and build commands that use those recorded versions and the chosen tool's locked installation mode where supported. Declare required tools and versions; do not rely on undeclared dependencies or tools installed only on the current development machine. Verify the workflow from a clean checkout without changing committed dependency resolutions. Do not infer or declare supported OS/architecture or browser targets from the developer's current machine.

## Constraints and exclusions

- Use only the agreed architecture; introduce no additional framework, component library, database, external service, microservice, deployment infrastructure, or unnecessary abstraction.
- Preserve CLI-only workspace selection and Go ownership of filesystem access. Do not introduce browser folder selection or browser-based file access.
- Workspace CLI behavior and all REQ-002 product interactions remain with their owning tasks. Foundation communication must not duplicate their responsibilities.
- Do not modify planning documents, approval states, canonical templates, or source workspace files during application implementation unless separately authorized. Source Markdown is a read-only input.
- Docker is not required for foundation building, running, or testing. Optional distribution decisions belong to TASK-009 after human resolution.

## Acceptance criteria

- A documented build produces a Go executable serving the Angular frontend and demonstrating the minimal HTTP/JSON exchange without a separate runtime frontend server.
- A minimal routing/JSON convention documents the actual demonstration endpoint, method, response, content type, and status behavior. It introduces no domain endpoints, unnecessary versioning, or speculative contracts.
- The default listener binds explicitly to `127.0.0.1`, not the local-network interfaces; no additional network configuration feature is introduced.
- The executable serves its embedded production assets when run outside the repository with the original frontend output directory unavailable. Its required UI assets do not load from a CDN or external network resource.
- Production optimization is enabled, with lazy loading used only where justified by actual content. Asset paths stay within the embedded filesystem. Unknown API routes return API errors, never frontend HTML; only eligible frontend navigation receives the entry document, and missing assets do not masquerade as successful navigation.
- Startup success and failure are distinguishable. Graceful shutdown finishes or reports its bounded failure and releases the listener.
- Committed manifests and supported lockfiles, declared tool requirements, and documented reproducible installation/build commands allow a clean checkout to build without relying on undeclared machine-local tools or changing recorded dependency resolutions. Development dependencies are not mandatory standalone runtime infrastructure.
- Foundation checks do not depend on REQ-002 implementation or TASK-009 completion. No workspace product features, source writes, or unsupported-platform claims are introduced.

## Verification and handoff

After explicit implementation approval, run the established Go and Angular checks and production build. Test the documented HTTP/JSON exchange and response convention, including status and content type. Test static asset responses, unknown API routes, missing assets, eligible frontend navigation, and ineligible methods/content requests to confirm handler separation. Exercise traversal and encoded traversal paths and verify they cannot escape embedded content or expose host files. Inspect the actual bound listener to confirm `127.0.0.1`, exercise bind failure, and test graceful termination, including an active request and eventual listener release.

From a clean checkout, follow the documented dependency installation and build commands using the declared tools and committed manifests/lockfiles. Verify no undeclared machine-local dependency is needed and recorded dependency resolutions remain unchanged. Keep this development-workflow check separate from standalone runtime qualification.

Run the built executable in an isolated directory without the frontend build output available. Verify the entry document and all required production assets are served from the binary. In a browser, block external network access while allowing loopback and confirm UI loading and the minimal JSON exchange still succeed. Inspect requests for external asset dependencies. Do not treat a development-server result as embedded-executable verification.

Record commands, results, actual environment tested, and unmet criteria. Check workspace source files for unintended changes. Clearly distinguish foundation verification from TASK-009's target qualification and later REQ-002 end-to-end checks. No test framework or infrastructure beyond what the approved foundation needs is prescribed here.

## Open questions

- Supported OS/architecture and browser targets remain undecided. Local development results must identify the actual environment tested without declaring it a supported target.
- The parent requirement's optional Docker inclusion remains undecided and does not block standalone foundation work.
