# Worktree application foundation

This implements TASK-008's Go/Angular foundation and TASK-009's standalone
packaging. The foundation page demonstrates Angular communicating with Go.
Workspace opening, the no-argument welcome screen, browsing, reading,
validation issues and task navigation belong to REQ-002 and are not implemented
in this revision. Arguments, including `--workspace`, currently fail explicitly.

## Development tools

Use Go **1.26.5**, Node.js **24.21.0** (`.nvmrc`), npm **11.19.0**, and Make
(tested with GNU Make 3.81). Angular CLI and build/test dependencies are local to
`frontend/` and resolved by `frontend/package-lock.json`. No global Angular CLI
or additional Go modules are needed. There is no `go.sum` because there are no
external Go module dependencies. Go's declared version is in `go.mod`.
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
`go.mod`, `frontend/package.json`, and `frontend/package-lock.json`; do not use
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

The planned V1 workspace command is
`./worktree --workspace /path/to/project` (Windows:
`.\worktree.exe --workspace C:\path\to\project`), after naming the copied binary
`worktree` or `worktree.exe`. Workspace arguments remain unsupported in this
foundation-and-packaging revision; TASK-004 supplies workspace opening and browsing.

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

After TASK-004, TASK-005, and TASK-006 are implemented and accepted, repeat
qualification with disposable workspace fixtures, including missing and
malformed artifacts. Compare file paths and byte contents before/after opening,
discovery, validation, selection, reading, and navigation. Use read-only fixture
permissions where supported and investigate attempted writes. Never use the
real project workspace for destructive testing. Those checks are currently
blocked and have not passed. TASK-009 has been explicitly accepted by the human;
final workspace qualification remains pending.

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

Browser validation is left to the user under the implementation instructions.
An earlier headless check rendered the foundation exchange in installed Chrome
156.0.8078.79 using an external-blocking proxy; it is not current-stable
qualification. Firefox 158.0.1 automation did not establish a session, so no
Firefox result is claimed. Browser-isolation setup failures were test-harness
limitations; they did not lead to application changes. No browser qualification
or final REQ-002 read-only/end-to-end result is claimed.
