# TASK-009 — Implementation brief: Package and verify standalone distribution

Requirement: [REQ-003 — Self-contained application delivery](../../req.md)

Task: [TASK-009 — Package and verify standalone distribution](task.md)

Review state: Completed and explicitly accepted by the human after evidence review and manual verification. The approved implementation instructions are preserved below; the acceptance record distinguishes observed results from deferred qualification.

## Objective

Build and verify a self-contained Worktree executable for each explicitly approved OS/architecture, with its optimized frontend embedded, clear build/run instructions, and evidence of standalone runtime and read-only workspace behavior.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [project architecture](../../../../project.md), [REQ-003](../../req.md), and the [approved task brief](task.md).

This task depends on the [TASK-008 foundation](../TASK-008/implementation.md). Reuse its build and host; do not introduce a second application or alternate architecture. V1 uses `./worktree --workspace /path/to/project`, with Go owning filesystem discovery, validation, and reading, and Angular using HTTP/JSON.

Final end-to-end distribution qualification also depends on accepted [TASK-004](../../../REQ-002/tasks/TASK-004/implementation.md), [TASK-005](../../../REQ-002/tasks/TASK-005/implementation.md), and [TASK-006](../../../REQ-002/tasks/TASK-006/implementation.md) behavior. Those tasks depend on TASK-008, not this task's final qualification. A successful package build does not establish that unimplemented workspace behavior works.

## Required work

### Package the approved targets

Use the following approved initial V1 qualification matrix. Use TASK-008's optimized Angular production build and Go embedding workflow to produce one self-contained executable per listed OS/architecture. Required frontend assets must be included in that executable, not delivered as a mandatory external frontend directory or server.

| Operating system | Architecture |
| --- | --- |
| Linux | amd64 |
| Linux | arm64 |
| macOS | amd64 |
| macOS | arm64 |
| Windows | amd64 |

The approved browsers are Google Chrome current stable and Mozilla Firefox current stable. Verify each browser on every applicable target and record the actual browser version and qualification date. These targets define initial V1 qualification, not indefinite support for browser versions or additional platforms.

Keep packaging simple. Record the exact build commands and identify which executable each command produces. Do not add release hosting, CI/CD deployment, installers, cloud services, or a new distribution framework merely to perform packaging. Reuse the foundation workflow rather than duplicating it.

### Verify standalone runtime

For each of the five approved targets, report executable build, actual execution on that OS/architecture, and Google Chrome/Mozilla Firefox verification separately. Run the artifact in an environment without separately installed Go runtime, Node.js, or Angular CLI and without a separate frontend server. Confirm it runs with only the operating system and browser and does not require a database, external service, or other mandatory runtime infrastructure. Do not equate cross-compilation success with execution on that target, or execution success with browser verification. Unavailable target or browser environments remain explicitly unverified; explain any non-applicable browser check instead of silently omitting it.

Verify the executable serves its embedded production UI from an isolated location without the source checkout or frontend build output. Block external network access while permitting local loopback and verify that the UI and its required scripts, styles, fonts, and other assets load without a CDN or network resource outside the application. Inspect actual browser requests as evidence; a successful entry-document response alone is insufficient.

Confirm the packaged host retains TASK-008's default `127.0.0.1` binding. Do not add network configuration features during packaging.

### Verify workspace read-only behavior and product integration

After the relevant REQ-002 behavior is implemented and accepted, run the packaged executable against representative workspace input. Compare file paths and byte contents before and after opening, discovery, validation, selection, reading, and navigation, including malformed or missing artifacts handled by the application. No workspace source file may be created, overwritten, repaired, or deleted by browsing or presentation. Use a read-only workspace environment where supported to help detect attempted source writes, without modifying the real project workspace.

Verify CLI opening and the no-argument welcome, non-blocking issue reporting, polished document presentation and Markdown fallback, contextual links, and sequential navigation only against their owning approved contracts. This task verifies delivered behavior; it must not implement or redefine those features. If functionality or an edge-case decision remains blocked, report the exact unverified condition and do not claim final end-to-end qualification.

### Document use and report coverage

Provide concise build and run instructions using the actual established commands and produced artifacts, including the CLI workspace argument. Separate development/build prerequisites from standalone runtime requirements. For each approved OS/architecture, report build result, execution result, Chrome result, and Firefox result in separate entries or columns with supporting commands, environment details, browser versions, dates, and evidence. Identify unverified or failing checks and explain any non-applicable check. Do not invent platform support, release claims, or test success.

Docker remains optional and is excluded from initial V1 delivery. Do not require it to build, run, test, or deliver the standalone executable, and do not create Docker packaging work. Any future Docker distribution would use the same application, with no separate architecture.

## Constraints and exclusions

- Depend on TASK-008 for the foundation and on accepted REQ-002 behavior for final distribution checks. Neither foundation nor REQ-002 implementation may depend on this task's final qualification.
- Preserve CLI-only access, Go filesystem ownership, embedded production assets, default local-only binding, and read-only source Markdown.
- Introduce no targets beyond the approved matrix, browser-folder-selection feature, external runtime service, alternate frontend server, cloud hosting, deployment infrastructure, or multi-service architecture.
- Runtime dependency, offline UI loading, and read-only checks are verification conditions, not new product features.
- Do not modify approved planning documents or approval states during implementation. Explicit human approval of this brief is required before work begins.

## Acceptance criteria

- One executable containing the optimized production frontend is built for each of Linux amd64, Linux arm64, macOS amd64, macOS arm64, and Windows amd64. Build, execution, and Google Chrome/Mozilla Firefox current-stable qualification are reported separately for each applicable target, with actual versions/dates and accurate unverified or failed results.
- Runtime verification demonstrates no separately installed Go runtime, Node.js, or Angular CLI is needed, and no separate frontend server is running or required.
- The executable serves its embedded UI outside the checkout without frontend build output; required UI assets load with no external CDN or network-resource dependency while loopback remains available.
- No database, external service, Docker installation, or additional mandatory runtime infrastructure is required for standalone use. Default binding remains `127.0.0.1`.
- After accepted REQ-002 functionality is available, packaged browsing and reading leave workspace source paths and byte contents unchanged, including when artifacts have issues. Attempted source writes are investigated rather than hidden by error handling.
- Build/run instructions are clear, separate build tools from runtime needs, and report verified, unverified, and failed target checks without treating build-only evidence as runtime qualification.
- Docker remains optional and excluded from initial V1 delivery; no Docker packaging, independent architecture, or unapproved packaging feature is introduced.
- Final end-to-end delivery claims are made only after relevant REQ-002 behavior is implemented, accepted, and verified in the packaged application. Blocked conditions remain reported as unverified.

## Verification and handoff

After explicit implementation approval, build using the documented production workflow for the five approved targets. For each target, separately collect build results, actual execution results, and Chrome current-stable and Firefox current-stable browser results, including versions and dates. Verify executable startup, listener binding, embedded asset responses, and external-network-blocked UI loading in each applicable environment. Inspect browser requests and confirm no separate frontend server or Go/Node.js/Angular CLI runtime installation is supplying the application. A cross-build, a successful HTTP request, or a pass on another architecture must not be reported as runtime/browser verification for an untested target.

Once REQ-002 functionality is accepted, exercise its opening, validation, reading, and navigation scenarios through the packaged binary. Use disposable workspace inputs with file-content/path comparisons and read-only permissions where supported; report both changes and attempted writes as failures. Do not run destructive qualification against the real source workspace.

Report packaged artifacts, exact commands and results, verified and unverified targets, unmet criteria, and dependencies still awaiting acceptance. Preserve failures and uncertainty. Keep standalone build verification distinct from execution, browser checks, and final end-to-end qualification. No Docker verification is included in initial V1 delivery.

### Acceptance record — 2026-10-31

The human explicitly accepted TASK-009 after reviewing the implementation, verification evidence, and manual launch. No further TASK-009 implementation or verification work is required under that instruction. Final workspace qualification remains dependent on the relevant REQ-002 behavior being implemented, accepted, and verified; this acceptance does not claim that qualification has passed.

Implementation changed only the [Makefile](../../../../../Makefile) and [README](../../../../../README.md), reusing TASK-008's Angular production build, Go embedding, and HTTP host. It added `make dist` for the five approved targets without application source changes, new dependencies, Docker packaging, or REQ-002 features. The baseline is TASK-008 commit `98a88135e3b30ba5164940eb55962c019f8d05b1`; TASK-009 changes remain uncommitted and unpushed on `feat/task-009-standalone-distribution`, stacked on the TASK-008 foundation. Acceptance does not imply Git integration or publication.

Historical build verification used macOS arm64 (Darwin 27.0.0), Go 1.26.5, Node.js 24.21.0, npm 11.19.0, and GNU Make 3.81. A fresh export of the baseline with TASK-009's build changes ran `make install` with `npm_config_offline=true`, `GOTOOLCHAIN=local`, and `GOWORK=off`. Locked `npm ci` succeeded; committed `go.mod`, `frontend/package.json`, and `frontend/package-lock.json` remained unchanged. npm reported install-script policy warnings without preventing installation or the subsequent checks. `make test` passed the Go race tests (`go test -race ./...`), `go vet ./...`, and both Angular tests (`npm test -- --watch=false`).

Two `make dist` runs succeeded in the same exported source environment with retained dependency and Go caches. Both builds produced the following identical SHA-256 hashes; the review also confirmed that the delivery copies matched. This is repeatability evidence, not an independent-machine or committed TASK-009 clean-checkout result.

| Executable | SHA-256 in both builds |
| --- | --- |
| `worktree-linux-amd64` | `674306ebcd8389a56fae3f9874388d8a85bd5b2474b86fd2d440d149dd12402b` |
| `worktree-linux-arm64` | `78a099ee4efce8477c3cc1a6651263ad4f0b5a33194d1440f1381fd90c9e974c` |
| `worktree-darwin-amd64` | `17a6682c4fbd5b3dd7c266691a4c0b779e9af3b880bd9098e5376360ffae696a` |
| `worktree-darwin-arm64` | `409ea2092b558d62f65c6d93f721432e61a9a475b31586ac62f99b69e35b7e5f` |
| `worktree-windows-amd64.exe` | `58f91913ec9271ae4902ddb2ccb9be0a2d6b0026442e5438e795c381db200db0` |

The macOS arm64 executable ran alone in a temporary directory under `sandbox-exec`, with `PATH=/nonexistent` and reads of the source checkout, exported build output, Go, Node.js, and npm denied. Denial controls confirmed these restrictions; the machine still had development tools installed outside the application's permitted access. The application served its entry document and matching embedded JavaScript/CSS, returned the JSON example, bound to `127.0.0.1:8080`, reported a second-process bind failure, and recorded exit 0 on SIGTERM. Linux outputs were identified as statically linked; the native macOS executable linked only OS-supplied libraries. Other targets were cross-built, not executed, and Windows PowerShell commands were not runtime-tested.

The human's manual launch and screenshot showed the foundation page displaying “Connected to Go.” Codex's review inspected the actual diffs, saved logs, executable metadata, and SHA-256 comparisons. An earlier installed-Chrome 156.0.8078.79 check also rendered that exchange through an external-blocking proxy, but it was not current-stable qualification. Firefox 158.0.1 automation did not establish a session. Browser validation was explicitly handed to the human; no complete browser/version/platform matrix was supplied or inferred.

The combined runtime harness did not pass as a whole: browser-isolation setup failures were followed by a Firefox automation timeout. Application shutdown results were saved in cleanup, but the later packaged-listener-release assertion was not reached. Listener release was covered by the passing Go tests. These limitations are retained rather than converted into passing results. Raw historical logs and the one-off harness were kept in temporary storage, not committed as durable evidence; this record preserves their reviewed outcomes.

| Target | Build | Runtime execution | Chrome | Firefox |
| --- | --- | --- | --- | --- |
| Linux amd64 | Passed | Pending | Deferred | Deferred |
| Linux arm64 | Passed | Pending | Deferred | Deferred |
| macOS amd64 | Passed | Pending | Deferred | Deferred |
| macOS arm64 | Passed | Passed | Deferred | Deferred |
| Windows amd64 | Passed | Pending | Deferred | Deferred |

Runtime “Passed” above covers the observed foundation execution only. Pending target execution and deferred browser qualification remain accurately reported coverage limits; they do not reopen TASK-009 or authorize further work. The outstanding REQ-002 dependency includes final packaged CLI opening and welcome behavior, non-blocking validation, browsing, reading and Markdown fallback, contextual links, sequential navigation, and workspace path/content comparisons for read-only behavior. None of those unimplemented interactions is recorded as verified or accepted by this TASK-009 acceptance.

## Open questions

- Platform/browser targets and Docker exclusion are decided above. Availability of actual target and current-stable browser environments must be established during authorized verification; unavailable checks remain unverified.
- Final end-to-end checks await implementation and acceptance of the relevant REQ-002 behavior, including resolution of remaining inaccessible-path/selection and non-HTTP/HTTPS outside-workspace interactions by their owning tasks.

### Integrated qualification follow-up — 2026-11-09

This follow-up supplements the integrated distribution run at `68a18553ed4384bee1807c0d8ba944b47376a1e5` plus the accepted REQ-002 working-tree changes. That run built all five targets and passed native macOS arm64 execution. Chrome passed functional and keyboard checks on the tested build. Firefox 159.0.1 passed functional checks using clicks. The evidence, including build hashes, remains under `/private/tmp/task009-final.GSFou5/`.

- **Chrome version verified.** Google's macOS arm64 Stable release API listed the tested `158.0.8127.18` with a rollout fraction of `0.005` (0.5%) and `157.0.8103.39` with a full-rollout entry. The tested build was in a limited Stable rollout. The broadly served Stable build was not tested. [Google Version History API](https://versionhistory.googleapis.com/v1/chrome/platforms/mac_arm64/channels/stable/versions/all/releases?filter=endtime%3Dnone&order_by=version%20desc&page_size=10)
- **Firefox keyboard and visible focus attempted, still unverified.** One headed attempt reused the existing harness and packaged binary. The live API and external-network denial controls passed. The harness timed out waiting for the Firefox document to gain foreground focus, before keyboard activation and visible focus could be checked.
- **Native Linux amd64, Linux arm64, macOS amd64, and Windows amd64 execution remains unverified.** The host is Apple silicon, Lima listed no instances, and the local inventory surfaced no ready target environment. No additional smoke tests ran.

New evidence is in `/private/tmp/task009-final.GSFou5/follow-up/`: `chrome-stable.json`, `chrome-api.log`, `firefox-headed.log`, and `runtime-feasibility.log`. Final end-to-end qualification remains partial and awaits review.

### V1 integration acceptance — 2026-11-09

The human accepted TASK-009 for V1 integration with the documented qualification limits. All five standalone builds passed. Native runtime qualification covers macOS arm64 only. Linux amd64, Linux arm64, macOS amd64, and Windows amd64 native execution remain unverified.

The tested Chrome build, `158.0.8127.18`, was in a limited Stable rollout on macOS arm64. Firefox `159.0.1` passed the functional browser checks there. Firefox keyboard activation and visible focus remain unverified. The earlier implementation and qualification records retain the detailed evidence and limitations.

GitHub Actions release automation is deferred to a separate PR after V1 integration.
