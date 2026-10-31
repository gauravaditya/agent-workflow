# Worktree application foundation

This implements TASK-008 only. It demonstrates an Angular page communicating
with a Go server. Workspace CLI opening, the no-argument welcome screen,
browsing, reading, issues, and navigation belong to later tasks and are not
implemented. Arguments, including `--workspace`, currently fail explicitly.

## Development tools

Use Go **1.26.5**, Node.js **24.21.0** (`.nvmrc`), npm **11.19.0**, and Make
(tested with GNU Make 3.81). Angular CLI and build/test dependencies are local to
`frontend/` and resolved by `frontend/package-lock.json`. No global Angular CLI
or additional Go modules are needed. There is no `go.sum` because there are no
external Go module dependencies. Go's declared version is in `go.mod`.

## Install, build, test, and run

From a fresh source checkout with the declared tools available:

```sh
make install
make build
make test
./bin/worktree
```

`make install` runs `npm ci`, preserving locked resolutions. `make build` first
builds the optimized Angular production frontend and then builds the Go
executable embedding it. Direct `go build ./cmd/worktree` fails if the frontend
output is missing. Build output and dependency caches are ignored by Git.

Open the URL printed by the process: **http://127.0.0.1:8080**. Stop with Ctrl-C
or SIGTERM. The host binds only to `127.0.0.1`; it has no network-binding flags.
A busy port causes a startup error and nonzero exit rather than a readiness
message. Shutdown allows active requests up to five seconds to drain, then
closes remaining connections and reports an error. Five seconds bounds local
termination while comfortably exceeding the small foundation exchange.

Only the executable and an OS/browser are needed at runtime. It serves its
embedded entry document, scripts and styles; neither the source checkout nor
the frontend output directory is read at runtime. No CDN, external fonts,
database, Docker, Node.js, Go installation, or frontend server is required to
run this foundation. This is not qualification of any supported platform list
or of later workspace functionality.

For frontend iteration, run `./bin/worktree` in one terminal and:

```sh
cd frontend
npm start
```

The optional development server binds to `127.0.0.1:4200` and proxies `/api` to
the Go process. It is development-only. Rebuild the production executable with
`make build` after changes. The single small foundation page needs no routing
or artificial lazy-loaded features; production optimization and hashed output
are enabled by the Angular configuration.

## HTTP contract and routing

The sole demonstration is `GET /api/example`, returning status 200,
`Content-Type: application/json`, and:

```json
{"message":"Connected to Go."}
```

API routes occupy `/api` and `/api/…`. Unknown routes return 404 with
`{"error":"not found"}`; unsupported methods on the example return 405 with
`{"error":"method not allowed"}` and `Allow: GET`. No API versioning,
workspace contracts, or monitoring endpoints are added. API results are JSON,
never the frontend entry document.

Only `/` and `/index.html` are frontend navigation entry points in this
foundation. They accept GET/HEAD when HTML is acceptable (including an omitted
Accept header or a compatible wildcard). HTML explicitly refused by Accept
returns 406. Unknown paths and missing assets return 404; unsupported static
methods return 405. There is no blanket SPA fallback for arbitrary paths.

Asset names are resolved only in the embedded filesystem. Invalid paths,
traversal segments, backslashes, NULs, and residual percent escapes are rejected;
no URL is translated to a host filesystem path. Actual asset content types are
served with `X-Content-Type-Options: nosniff`.

## Verification boundaries

`make test` builds the production frontend, runs Go HTTP/lifecycle tests with
the race detector, runs `go vet`, and runs Angular's Vitest tests. Socket tests
need local loopback access. The frontend tests check the displayed exchange
result and failure through its HTTP boundary.

TASK-009 still owns platform packaging and runtime qualification. OS/architecture
and browser targets and initial Docker inclusion remain undecided. No workspace
source files are opened or written by this foundation.
