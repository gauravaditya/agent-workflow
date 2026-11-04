# Worktree

Worktree is a lightweight workspace for planning and implementing software with coding agents. It organizes Markdown planning artifacts and provides a curated viewer so humans can review intent and scope while agents use detailed implementation briefs.

Markdown files are the source of truth. Work follows the Project → Requirement → Task hierarchy, with separate task and implementation briefs belonging to each task. See the [project primer](primer.md) for context and the [workspace conventions](conventions.md) for structure and links.

## Application architecture

The agreed application direction is a Go backend using the standard-library HTTP server, an Angular frontend using TypeScript and SCSS, and an HTTP/JSON API. An optimized Angular production build uses minification, tree-shaking, asset optimization, and lazy loading where appropriate. Embed the built frontend assets into the Go executable.

Deliver one self-contained executable per supported OS/architecture. Standalone runtime requires only the operating system and a browser, with no separately installed Go, Node.js, Angular CLI, or frontend server. There is no database, external service, microservice architecture, or mandatory additional runtime dependency. Docker remains optional and is excluded from initial V1 delivery; no Docker packaging work is included. Any future Docker distribution would use the same application rather than a separate architecture.

The approved initial V1 qualification targets are:

| Operating system | Architecture |
| --- | --- |
| Linux | amd64 |
| Linux | arm64 |
| macOS | amd64 |
| macOS | arm64 |
| Windows | amd64 |

Qualify Google Chrome current stable and Mozilla Firefox current stable on the applicable targets. Record the actual browser version and qualification date when testing. These are initial V1 qualification targets, not indefinite browser-version support or claims that qualification has already passed.

These are agreed planning decisions, not claims that an application has been implemented. [REQ-003](requirements/REQ-003/req.md) covers the foundation and distribution work.

## Workspace opening and access

Worktree V1 uses CLI-only workspace selection: `./worktree --workspace /path/to/project`. The Go backend receives the path and owns all workspace filesystem access, including discovery, validation, and file reading. The Angular frontend communicates with Go through the HTTP/JSON API; it does not access the workspace filesystem directly. Source Markdown remains read-only and is not copied into permanent application storage.

With a workspace argument, open the specified workspace directly. Without one, display a simple welcome screen explaining how to launch Worktree with the required argument. REQ-002 defines the browsing experience.

Browser-based folder selection is a possible future enhancement, not a V1 commitment. The earlier dual-entry approach is superseded by the CLI-only decision.

## Requirements

- [REQ-001 — Establish the workspace contract](requirements/REQ-001/req.md)
- [REQ-002 — Core workspace browsing and document reading](requirements/REQ-002/req.md)
- [REQ-003 — Self-contained application delivery](requirements/REQ-003/req.md)
