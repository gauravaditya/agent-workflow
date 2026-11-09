# Worktree

Worktree is a local, read-only workspace browser. Open a project from the CLI,
browse requirements and tasks in the Foldout interface, and read their Markdown
documents with contextual links and previous/next task navigation. A single
Go executable serves the embedded Angular frontend.

## Development tools

Use Go **1.26.5**, Node.js **24.21.0** (`.nvmrc`), npm **11.19.0**, and Make
(tested with GNU Make 3.81). Angular CLI and build/test dependencies are local to
`frontend/` and resolved by `frontend/package-lock.json`. No global Angular CLI
is needed. Go's version and module dependencies are recorded in `go.mod` and
`go.sum`.
These commands use a POSIX shell and GNU Make; on Windows use an environment
providing those build tools, or the PowerShell commands below. End users do not
need these development tools.

## Install, build, test, and run

From a fresh source checkout with the declared tools available:

```sh
make install
make build
make test
./bin/worktree
```

With no argument, the application shows welcome instructions. To browse a
project, use:

```sh
./bin/worktree --workspace /path/to/project
```

An explicitly supplied missing, non-directory, or unreadable path prints an
actionable error to stderr and exits nonzero before the HTTP server starts.
It does not show the no-argument welcome. A readable folder with missing or
malformed `.worktree/` artifacts still opens and reports issues.

`make install` runs `npm ci`, preserving locked resolutions. `make build` first
builds the optimized Angular production frontend and then builds the Go
executable embedding it. Direct `go build ./cmd/worktree` fails if the frontend
output is missing. Build output and dependency caches are ignored by Git.

Open the URL printed by the process: **http://127.0.0.1:8080**. Stop with Ctrl-C
or SIGTERM. The host binds only to `127.0.0.1`; it has no network-binding flags.
A busy port causes a startup error and nonzero exit rather than a readiness
message. Shutdown allows active requests up to five seconds to drain, then
closes remaining connections and reports an error. Five seconds bounds local
termination for HTTP connections. The workspace reader stays open until active
handlers finish.

Only the executable and an OS/browser are needed at runtime. It serves its
embedded entry document, scripts and styles; neither the source checkout nor
the frontend output directory is read at runtime. No CDN, external fonts,
database, Docker, Node.js, Go installation, or frontend server is required to
run Worktree. See Delivery qualification for the platforms actually exercised.

For frontend iteration, run `./bin/worktree` in one terminal and:

```sh
cd frontend
npm start
```

The optional development server binds to `127.0.0.1:4200` and proxies `/api` to
the Go process. It is development-only. Rebuild the production executable with
`make build` after changes. Production optimization and hashed output are enabled by the
Angular configuration.

## HTTP contract and routing

The retained foundation demonstration is `GET /api/example`, returning status 200,
`Content-Type: application/json`, and:

```json
{"message":"Connected to Go."}
```

API routes occupy `/api` and `/api/…`. Unknown routes return 404 with
`{"error":"not found"}`; unsupported methods on the example return 405 with
`{"error":"method not allowed"}` and `Allow: GET`. No API versioning or
monitoring endpoints are added. API results are JSON,
never the frontend entry document.

`GET /api/workspace` returns status 200, `Content-Type: application/json`, and
`Cache-Control: no-store`. Without a CLI workspace it returns
`{"workspace":null}`. Otherwise `workspace` contains:

- `name`, the project title or source-directory name when the title is absent.
- `document`, the project artifact descriptor.
- `requirements`, each with `id`, `title`, `document`, `tasks`, and `taskOrder`.
- `issues`, a list of workspace-relative `path` and `message` pairs.

Tasks contain `id`, `title`, and `documents`. Every document descriptor has
`path`, `kind` (`project`, `requirement`, `task`, or `implementation`), `title`,
`readable`, and `templateValid`. Source paths preserve the actual canonical
directory identity. Readable documents remain selectable when template
validation fails. Direct selection reports availability without substituting
another document. Requirements retain
their Tasks-section link order in `taskOrder`; ambiguous/missing ordering
returns `null`. Unlisted physical tasks remain browsable with issues, without
assigning them an authoritative sequential position.

Workspace metadata is discovered once at startup. Restart to rescan changed
files. `GET /api/document?path=…` reads a workspace-relative Markdown path and
returns the source or a typed availability error. Go confines discovery and
document reads to the selected workspace, including symlink resolution.
Workspace files are read-only. Validation recognizes the canonical
template headings, metadata, and inline relative Markdown links, excluding
authoring comments and fenced examples; it is not a general Markdown renderer.
Unsupported methods on `/api/workspace` return 405 JSON with `Allow: GET`.

Only `/` and `/index.html` are frontend navigation entry points in this
foundation. They accept GET/HEAD when HTML is acceptable (including an omitted
Accept header or a compatible wildcard). HTML explicitly refused by Accept
returns 406. Unknown paths and missing assets return 404; unsupported static
methods return 405. There is no blanket SPA fallback for arbitrary paths.

Asset names are resolved only in the embedded filesystem. Invalid paths,
traversal segments, backslashes, NULs, and residual percent escapes are rejected;
static asset URLs never address the host filesystem. Actual asset content types are
served with `X-Content-Type-Options: nosniff`.

## Verification boundaries

`make test` builds the production frontend, runs Go HTTP/lifecycle tests with
the race detector, runs `go vet`, and runs Angular's Vitest tests. Socket tests
need local loopback access. The frontend tests cover the retained foundation
API, workspace browsing, document availability, Markdown and link handling,
reading-focus behavior, and previous/next navigation.

TASK-004 tests use temporary workspaces, including read-only, incomplete,
malformed, and inaccessible fixtures. They compare paths and bytes before and
after discovery. The integrated distribution checks also compare fixture
paths and bytes after reading and navigation.

## Standalone packages

Install dependencies with `make install` (`npm ci` uses the committed lockfile),
then run:

```sh
make dist
```

This builds the optimized production frontend once and embeds it into each
executable. Outputs are ignored by Git:

| Initial V1 target | Executable |
| --- | --- |
| Linux amd64 | `bin/dist/worktree-linux-amd64` |
| Linux arm64 | `bin/dist/worktree-linux-arm64` |
| macOS amd64 | `bin/dist/worktree-darwin-amd64` |
| macOS arm64 | `bin/dist/worktree-darwin-arm64` |
| Windows amd64 | `bin/dist/worktree-windows-amd64.exe` |

The Makefile records the exact Go commands. `CGO_ENABLED=0` avoids an external
C toolchain and C runtime dependency; macOS still uses its operating-system
libraries. `-trimpath` removes build-machine paths and `-buildvcs=false` avoids
embedding checkout-specific Git state. These settings do not prove target
execution or browser compatibility. Use the declared tools and committed
`go.mod`, `go.sum`, `frontend/package.json`, and `frontend/package-lock.json`; do not use
`npm install` to refresh dependency resolutions during a delivery build.

For a Windows amd64 build from PowerShell without Make, with the same declared
Go/Node.js/npm versions installed, run from the checkout root:

```powershell
Push-Location frontend
npm ci
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Dependency installation failed' }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Frontend build failed' }
Pop-Location
New-Item -ItemType Directory -Force bin/dist | Out-Null
$env:CGO_ENABLED = '0'
$env:GOOS = 'windows'
$env:GOARCH = 'amd64'
go build -trimpath -buildvcs=false -o bin/dist/worktree-windows-amd64.exe ./cmd/worktree
if ($LASTEXITCODE -ne 0) { throw 'Executable build failed' }
Remove-Item Env:CGO_ENABLED, Env:GOOS, Env:GOARCH
```

This is the equivalent build recipe, not evidence of a Windows build-host test.
Use a dedicated build terminal so target environment variables do not affect
later native builds.

Copy only the executable for the target OS/architecture into an otherwise empty
directory. No frontend directory, Go runtime, Node.js, Angular CLI, database,
external service, or separate frontend server is needed at runtime. Docker is
optional and excluded from initial V1 delivery; there is no Docker package.

On Linux/macOS, retain execute permission (or use `chmod +x` after copying):

```sh
./worktree-darwin-arm64
```

Substitute the matching Linux/macOS artifact name. On Windows PowerShell:

```powershell
.\worktree-windows-amd64.exe
```

Open `http://127.0.0.1:8080` in the browser. No automatic browser launch is
implemented. Use Ctrl-C to stop; port 8080 must be available. The host keeps
TASK-008's loopback-only binding. Windows console shutdown and other target
runtime differences require actual target testing, not just compilation.

The V1 workspace command is
`./worktree --workspace /path/to/project` (Windows:
`.\worktree.exe --workspace C:\path\to\project`), after naming the copied binary
`worktree` or `worktree.exe`. Without the argument, Worktree shows the welcome
screen.

## Delivery qualification

Qualification targets are Google Chrome current stable and Mozilla Firefox
current stable on each applicable platform above. Record actual browser
versions and dates; these are initial V1 targets, not indefinite version
support. Build, target execution, and each browser result must be reported
separately. Cross-compilation never establishes runtime verification.

For each executable, verify startup and `127.0.0.1:8080` binding, embedded UI
and `/api/example`, termination, and listener release. Run outside the source
checkout with frontend output unavailable and development runtimes unavailable.
Allow loopback but block external network access, inspect actual browser
requests, and verify scripts/styles/fonts load locally. An HTTP 200 for the
entry document alone is insufficient browser evidence.

The integrated V1 build passed for all five targets. Only macOS arm64 passed
native runtime qualification. Chrome passed the tested browser scenarios on
a limited Stable rollout build. Firefox passed the functional scenarios, with
keyboard activation and visible focus unverified. Disposable workspace paths
and contents stayed unchanged through browsing, validation, reading, and
navigation. See the [TASK-009 record](.worktree/requirements/REQ-003/tasks/TASK-009/implementation.md)
for the acceptance scope and remaining coverage gaps.

### Build and verification record — 2026-10-31

Built from a fresh export of TASK-008 commit
`98a88135e3b30ba5164940eb55962c019f8d05b1` with the TASK-009 Makefile changes.
`make install` used npm's locked offline cache; `make test` passed Go race tests,
`go vet`, and both Angular tests. `make dist` passed twice, producing identical
SHA-256 hashes for all five executables. Committed dependency manifests and the
lockfile were unchanged. This was source-export verification, not verification
of a committed TASK-009 checkout. At the time of the 2026-10-31 verification,
these changes had not been committed or published.

| Target | Executable build | Actual execution | Chrome qualification | Firefox qualification |
| --- | --- | --- | --- | --- |
| Linux amd64 | Passed | Unverified | User validation pending | User validation pending |
| Linux arm64 | Passed | Unverified | User validation pending | User validation pending |
| macOS amd64 | Passed | Unverified | User validation pending | User validation pending |
| macOS arm64 | Passed | Passed: foundation only | User validation pending | User validation pending |
| Windows amd64 | Passed | Unverified | User validation pending | User validation pending |

The macOS arm64 executable ran alone in a temporary directory with checkout,
frontend output, Go, Node.js, and npm reads denied and an empty executable
search path. It served matching embedded JavaScript/CSS and the JSON example,
bound to `127.0.0.1:8080`, reported a second-process bind failure, and exited
successfully on SIGTERM. Its linked libraries are supplied by macOS; the Linux
artifacts were identified as statically linked. No other target was executed.
PowerShell build/run commands have not been tested on Windows.

In this historical run, browser validation was left to the user.
An earlier headless check rendered the foundation exchange in installed Chrome
156.0.8078.79 using an external-blocking proxy; it is not current-stable
qualification. Firefox 158.0.1 automation did not establish a session, so no
Firefox result is claimed. Browser-isolation setup failures were test-harness
limitations; they did not lead to application changes. This historical run
preceded integrated REQ-002 qualification.
