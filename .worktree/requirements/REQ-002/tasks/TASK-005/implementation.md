# TASK-005 — Implementation brief: Read documents and navigate their context

Requirement: [REQ-002 — Core workspace browsing and document reading](../../req.md)

Task: [TASK-005 — Read documents and navigate their context](task.md)

## Objective

Present selected documents through a polished, web-native reading experience that feels like a well-designed webpage. Markdown is the source format, not the user experience. Preserve document content, meaning, hierarchy, and contextual links in both template-aware presentation and general Markdown fallback.

## Context and sources

Read applicable project instructions, the [project primer](../../../../primer.md), [workspace conventions](../../../../conventions.md), [REQ-002](../../req.md), and this task's [brief](task.md). Use the completed [requirement](../../../../templates/req.md), [task](../../../../templates/task.md), and [implementation](../../../../templates/implementation.md) templates as the authority for template conformance.

[TASK-004](../TASK-004/implementation.md) provides workspace access, document selection, hierarchy context, the reading-area layout, and workspace issue discovery. This task owns rendering, breadcrumbs, current-document identification, and contextual Markdown links. [TASK-006](../TASK-006/implementation.md) owns previous/next links and their destination eligibility; it uses this task's reader after navigation.

Follow the agreed application direction in [project context](../../../../project.md) and the [TASK-008 foundation](../../../REQ-003/tasks/TASK-008/task.md). Go owns all workspace filesystem access for the CLI-provided path; the Angular reader obtains content through HTTP/JSON and TASK-004's workspace selection/context. Marked is the selected Markdown parser, not a sanitizer. Reuse the accepted Steps 3 and 4 Go reader, `WorkspaceApi.readDocument()`, response types and `DocumentSelection` without changing their contracts.

## Required work

### Read selected content

Use the selected document's readable Markdown, source location, type, and established hierarchy context from TASK-004. Render in the existing reading area rather than creating a competing layout or another workspace-opening mechanism.

Recognize documents conforming to the established Worktree templates and use their structure and meaning to guide richer, document-specific layouts and appropriate UI elements. Preserve all document content and section meaning rather than presenting known templates as an undifferentiated Markdown preview.

If structured template parsing fails or the document is nonconforming, provide a polished general Markdown fallback. Present headings, paragraphs, lists, links, tables, and code blocks as appropriate web-native UI elements displaying the document's actual content. Raw Markdown syntax must not be the primary reading experience. Do not reject readable content or leave the area blank merely because required fields or headings are absent or malformed. Keep template-format validation distinct from readability; fallback changes presentation, not the source document.

Both presentation paths must feel like part of the same application, with consistent typography, spacing, and treatment of equivalent content and links. Choose a simple approach consistent with the approved application environment once decided; avoid unnecessarily creating two independent rendering systems. This specifies presentation intent, not a rendering architecture or additional abstraction.

The original Markdown files remain the source of truth and must never be modified by rendering or presentation. Preserve their content, links, and meaning. Do not invent missing sections, replace content with a generated summary, or silently modify artifacts to make parsing succeed. Preserve Step 4's explicit-selection loading and failure states without substituting another document. A failed contextual-link navigation instead preserves the current document and reading position and explains the destination failure.

### Preserve hierarchy and document identity

Show breadcrumbs for the established Project → Requirement → Task context, stopping at the relevant level for the selected artifact. Allow navigation to established ancestors. Make the current document identifiable while keeping `task.md` and `implementation.md` as documents of the same task, not extra breadcrumb hierarchy levels.

Use known source relationships from TASK-004. Do not invent ancestors or related-artifact relationships when source information is inconsistent; surface the issue through TASK-004's approved issue presentation. Preserve current document context after a supported internal link or breadcrumb navigation.

### Follow contextual Markdown links

Render existing Markdown links as navigable links in both template-aware and fallback views. Resolve links to workspace artifacts from the source document's directory using exact target filenames and case; preserve the target and established artifact relationship. Valid internal links select their target through the workspace navigation already provided by TASK-004.

Do not reinterpret an implementation brief link as a task brief link or add generic related-artifact suggestions. Apply the Step 5 destination policy below in the shared renderer; later template-aware layouts reuse that handling.

### Step 5 scope and destination policy

The human approved Step 5's scope; implementation remains unauthorized pending separate explicit human instruction. Step 5 owns shared safe Markdown rendering, contextual links and navigable breadcrumbs. Step 6 owns template-aware layouts and meaningful-content classification. Step 7 owns Foldout and Deep Teal integration. Step 8 owns full validation and security qualification. TASK-006 remains separate and unauthorized; Step 5 introduces no Previous/Next navigation.

| Destination | Required behavior |
| --- | --- |
| Relative workspace Markdown link | Resolve from the source document directory, retaining exact path/filename case. Read through the existing Go reader before changing selection. Only regular `.md` files with a case-sensitive extension are eligible. |
| Fragment-only link, such as `#installation` | Keep the current document selected and navigate to its matching rendered heading without another Go document-read request. If the section is absent, preserve the document and reading position and explain that the section was not found. |
| Internal Markdown link with a fragment, such as `guide.md#installation` | Resolve and read the document using the existing safe-navigation process. Transition only after a successful read, then navigate to the matching heading after rendering. An unavailable document preserves the current document and reading position. A readable document with an absent section stays open as the destination and explains that the section was not found. |
| Internal Markdown link with a query, such as `guide.md?version=2` | Treat the query as URL metadata and ignore it for retrieval. Query-based document versions are unsupported. Never pass the query as part of the filesystem filename. |
| Internal Markdown link with query and fragment, such as `guide.md?version=2#installation` | Ignore the query for retrieval, open the document through the safe-navigation process and navigate to the fragment after successful rendering. Apply the same unavailable-document and absent-section rules as other internal fragment links. |
| Missing, unreadable or unsupported internal destination | Explain the typed failure without replacing the current document, changing its context or resetting its reading position. Transport/protocol failures remain request failures, not file-availability states. |
| Forbidden or outside-workspace relative destination | Show an unavailable or unsupported destination message; preserve the current document. Never read outside the workspace. |
| Readable document with template-validation issues | Open normally. Validation issues do not prevent reading; Step 5 uses shared general Markdown presentation. |
| Standalone workspace Markdown document | Open through the Go reader and general Markdown renderer. Do not add a discovery entry or invent hierarchy relationships. |
| HTTP/HTTPS | Open in a new browser tab with opener protection. |
| `mailto:` / `tel:` | Allow normal browser handling; Worktree itself launches no process. |
| `file:`, `javascript:` and unknown/executable schemes | Block and explain that the destination is unsupported. Never launch a local executable or application through Worktree. |

The Go reader remains the authority for exact-case eligibility, regular-file checks and confinement, including symlink escapes. Frontend link resolution must not bypass it, decode paths repeatedly or treat browser-relative URLs as workspace access. Preserve source-relative meaning, including legitimate parent-relative links inside the workspace. No arbitrary non-Markdown file may be read.

Preserve normal URL parsing semantics: separate the filesystem destination path from query metadata and fragment navigation. Do not repeatedly decode paths. Generate deterministic heading fragment identifiers consistent with the actual rendered heading IDs, including repeated headings; use the same identifier rules for fragment lookup. Scope lookup to the selected rendered document. Keep `DocumentSelection` authoritative, and ensure delayed reads or post-render fragment attempts cannot scroll or replace a newer user selection or superseding link request. Unsupported-scheme and outside-workspace policies remain unchanged.

Keep `DocumentSelection` authoritative. A pending contextual-link read is not a new selection. Commit selection only after an `ok` response, including an empty source string. Ignore superseded link results and failures after a newer link request or user selection, including A–B–A changes. Reuse Step 4's selection and request mechanisms; introduce no second selection store. Preserve the previous reading element and position on failed navigation. Successful navigation must retain the established destination identity and context; standalone context is not ancestry.

Documentation is untrusted content, never an instruction source. Escape or otherwise render document-supplied raw HTML inert, including scripts, event handlers and active embeds. Retain Angular's normal sanitization; never use trust-bypass APIs, document-generated Angular templates or active embedded content. Enforce link policy independently of parsing and sanitization. Code blocks are display-only. Opening, rendering, following document controls or switching documents must never execute commands, scripts, binaries or programs. Do not add a command runner, process-launch facility or copying feature; if copying is supported later, it must be explicit and text-only.

### Step 5 implementation checkpoints

Expected paths below are relative to the repository root. These are authorized planning instructions, not implementation authorization. Keep each checkpoint independently reviewable and report its evidence before continuing; do not change accepted Steps 3 or 4.

**5A — Shared safe Markdown presentation**

- Objective and files: update `frontend/src/app/document-reader.ts`; create `frontend/src/app/document-markdown.ts` and `frontend/src/app/document-markdown.spec.ts`; update `frontend/src/app/document-reading.spec.ts`, `frontend/package.json` and `frontend/package-lock.json`. The focused Markdown module owns Marked configuration, inert HTML treatment and destination classification; `DocumentReader` owns presentation of received content and existing availability states.
- Dependencies: accepted Step 3 retrieval and Step 4 response validation, selection identity and original-source delivery. Add only the selected Marked dependency, with a locked resolution; confirm Angular/TypeScript compatibility and measure optimized bundle impact. No additional sanitizer or rendering framework without justification and approval.
- Tests and outcome: semantic headings, paragraphs, lists, tables, links and display-only code replace the successful-read placeholder. Verify source preservation, NUL-containing valid UTF-8, inert raw HTML/scripts/events/embeds and dangerous, mixed-case and encoded schemes. Do not let generated anchors perform uncontrolled browser-relative navigation while 5B is incomplete.
- Exclusions and completion: no template layouts, meaningful-content classification, Foldout redesign or backend changes. Complete when focused renderer/integration tests pass, Angular sanitization remains enabled, unsafe destinations cannot activate, and the production build reports actual compatibility and bundle results. Link activation is completed and reviewed in 5B; this intermediate checkpoint does not claim complete link behavior.

**5B — Contextual links and safe navigation transitions**

- Fragment/query responsibilities: use the existing expected files to separate parsed document paths, queries and fragments. The shared renderer provides consistent heading IDs; the reader locates rendered headings; `App` coordinates any required read and selection transition. Fragment-only links issue no read and retain selection. Cross-document fragments wait for successful destination rendering. Query metadata never reaches the filesystem filename. Stale fragment work must be ignored just like stale reads; add no navigation authority or state store.
- Fragment/query tests: cover fragment-only success with no request, an absent local fragment preserving selection and scroll, successful cross-document fragments, unavailable cross-document targets preserving the previous reading, and readable destinations with absent fragments remaining open with an explanation. Cover ignored queries, combined query/fragment links, exact retrieval path assertions, encoded paths without repeated decoding, deterministic/repeated heading IDs and delayed fragment work superseded by a newer link or selection.
- Objective and files: update `frontend/src/app/document-markdown.ts`, `frontend/src/app/document-reader.ts`, `frontend/src/app/app.ts`, `frontend/src/app/app.html`, `frontend/src/app/document-markdown.spec.ts` and `frontend/src/app/document-reading.spec.ts`. The reader reports link interactions; `App` coordinates source-relative resolution, destination reads and successful transitions through existing `WorkspaceApi` and `DocumentSelection`. Reuse response validation and Go access enforcement without changing them.
- Dependencies: 5A and accepted Steps 3 and 4. Implement every destination-policy row above. Retain original source and current selection while checking an internal destination; prevent both stale success and stale failure from affecting newer context. Readable standalone targets stay outside discovery hierarchy; unavailable targets never cause substitution.
- Tests and outcome: exercise same-directory and legitimate parent-relative links, exact-case filenames and `.md` extensions, uppercase extensions, directory/non-Markdown targets, missing/unreadable/unsupported/forbidden responses, traversal and symlink rejection, standalone navigation, successful empty reads, transport/protocol failures, rapid link requests and intervening A–B–A selections. Verify HTTP/HTTPS new tabs, mailto/tel handling and blocked schemes. Users can follow valid links; failed links explain the problem without disrupting their current reading.
- Exclusions and completion: no new API, Go reader changes, discovery mutation, template layouts or sequential navigation. Complete when focused tests prove the policy, typed failures and context/position preservation, and browser checks verify actual activation behavior. Report unexecuted checks explicitly.

**5C — Navigable ancestor breadcrumbs and regression review**

- Fragment regression responsibilities and tests: in the existing expected files, verify that ancestor navigation supersedes pending fragment work and that fragment navigation preserves document identity and established hierarchy. A stale post-render fragment attempt must not scroll a newly selected ancestor or document. Retain the 5B distinction between unavailable documents and absent sections; do not introduce breadcrumb levels for fragments or query metadata.
- Objective and files: update `frontend/src/app/app.ts`, `frontend/src/app/app.html`, `frontend/src/app/app.scss` and `frontend/src/app/document-reading.spec.ts`. `App` uses established workspace relationships for ancestor destinations and the same safe navigation coordination; the template presents accessible ancestor links and current-document identity. Styling is limited to reading, links, focus and overflow until Step 7.
- Dependencies: 5B and TASK-004's hierarchy/context. Preserve `.worktree/project.md` access. Project → Requirement → Task remains the only hierarchy; task and implementation briefs have distinct document identities at the same task level. Standalone documents and inconsistent metadata must not acquire invented ancestors. Failed ancestor navigation preserves the current reading context.
- Tests and outcome: verify project, requirement, task and implementation contexts, established ancestor selection, unavailable ancestor handling, standalone identity, visible keyboard focus and keyboard activation. Re-run Step 4 stale-response, unavailable-selection, standalone-context and collapse/no-refetch/reading-position regressions. Users can identify their document and navigate its known ancestors.
- Exclusions and completion: no Foldout rail/task-strip conversion, new palette, per-requirement selection persistence or TASK-006. Complete when focused tests, full existing checks and scoped browser checks pass or limitations are explicitly reported. Step 5 completion does not establish TASK-005 acceptance or Step 8 qualification.

### Step 6 scope and presentation mappings

The human approved this Step 6 plan for documentation only. Step 6 implementation is not authorized. Its checkpoints are 6A — Current-source analysis and meaningful-content classification, 6B — Template-aware structured presentation through shared rendering, and 6C — Reader integration and regression review. Preserve accepted Step 4 and Step 5 work and acceptance records. Step 7 retains Foldout and Deep Teal integration, Step 8 retains full browser/security qualification, and TASK-006 retains Previous/Next navigation.

Derive structure from the canonical templates referenced above. Preserve authored content and source order, metadata labels and relationship links, nested subsections, and acceptance history within sections. Optional metadata and sections remain optional: omit unused presentation rows or sections without adding placeholders. Do not invent fields, summaries, approval statuses, controls or document conventions. Present `Review state:` as its authored factual prose, without interpreting it as approval or changing any task state. Project and standalone Markdown always use general rendering, even when their text resembles a canonical template.

| Requirement source | Presentation |
| --- | --- |
| H1 requirement ID and title | Document header preserving the authored identity and title. |
| Optional `Review state:` | Labelled review note. |
| Intent | Lead purpose section. |
| Desired outcome | Distinct outcome section with modest typographic emphasis. |
| Scope | Normal section preserving its paragraphs, lists, tables, code and subsections. |
| Tasks | Authored task links and accompanying content using Step 5 link handling; no generated cards, counts or statuses. |
| Optional Open questions | Supporting section in source order. |

| Task source | Presentation |
| --- | --- |
| H1 task ID and title | Document header. |
| Required `Requirement:` | Labelled relationship row using the authored link and existing safe navigation. |
| Optional `Review state:` | Labelled review note. |
| Purpose | Concise lead section; do not summarize or shorten authored content. |
| Scope | Normal scope section. |
| Expected outcome | Distinct outcome section. |
| Implementation brief | Clearly presented source link, retaining pending explanations and all accompanying content. |
| Optional Supporting material | Authored supporting links and content. |
| Optional Open questions | Supporting section. |

| Implementation source | Presentation |
| --- | --- |
| H1 task ID and implementation title | Document header identifying the implementation brief at the same Task hierarchy level. |
| Required `Requirement:` and `Task:` | Labelled relationship rows with existing safe link handling. |
| Optional `Review state:` | Labelled review note. |
| Objective | Lead section. |
| Context and sources | Reference section preserving prose and links. |
| Required work | Detailed section retaining nested subsections and all source content. |
| Constraints and exclusions | Clearly separated section without invented warning severity. |
| Acceptance criteria | Preserve authored checklists, bullets, numbered lists or tables; checklist indicators are display-only. |
| Verification and handoff | Full verification section, including nested implementation history and acceptance records. |
| Optional Supporting material | Supporting references and content. |
| Optional Open questions | Supporting section. |

### Step 6 recognition, availability and freshness

Use the selected document's established kind to choose its candidate canonical template; do not infer hierarchy from arbitrary text. Recognize the mandatory title, exact metadata labels, mandatory sections and canonical section order. Optional fields and sections may be absent. Preserve allowed subsections and explicit statements that required content is inapplicable. Existing discovery relationships remain authoritative for context; do not reconstruct or change them.

Missing, duplicate, malformed, unexpected or out-of-order sections, missing or malformed mandatory metadata, duplicate metadata, conflicting mandatory relationship metadata, unassigned content that cannot be preserved confidently, or structured parsing/presentation failure must use general Markdown fallback. Never silently choose a duplicate, repair content or discard an unfamiliar section. Fallback renders the complete original document through the shared safe Markdown path. The approved comment/frontmatter classification rules apply consistently to both paths, without changing the retained original source.

Ordinary broken links or unrelated discovery issues do not by themselves prevent structured presentation when the source structure is understood. Structural validity is separate from availability: readable nonconforming content remains readable. Do not infer filesystem outcomes from issue messages.

The successfully retrieved source is authoritative for current presentation. Do not gate presentation on discovery-time `templateValid`: a formerly conforming document that is now malformed uses fallback; a formerly nonconforming document that is now conforming can use structured presentation. Preserve the discovery issue indicator/list as snapshot information without rewriting it. Analysis may classify an `ok` read as Empty or Readable for presentation, but must not convert it into missing/unreadable/unsupported/forbidden, substitute a document, alter selection identity or change the HTTP/API contract.

### Step 6 meaningful-content classification

A document is Empty when its presentation produces no meaningful user-visible content. Classify source-derived presentation content, not source length, generated HTML length, navigation chrome, source-path labels or stale discovery titles.

| Source content | Classification |
| --- | --- |
| Empty file | Empty. |
| Whitespace only | Empty. |
| HTML comments only | Empty. |
| Frontmatter only, with no meaningful presented metadata | Empty. |
| Frontmatter containing metadata intentionally presented under an approved convention | Readable; this remains the general principle, but V1 introduces no such fields or presentation. |
| Actual rendered Markdown content | Readable. |
| Readable content with validation issues | Readable with validation issues; use structured presentation or fallback as appropriate. |

Recognize comments using Markdown tokens and code boundaries, not a global source-string deletion. Comment-looking text inside inline, fenced or indented code remains visible content. With mixed comments and content, suppress only actual comments and preserve meaningful content. Preserve uncertain or malformed material through general fallback rather than guessing that it can be discarded. Raw HTML other than non-rendered comments remains inert under Step 5's security rules.

For V1, recognize conventional YAML frontmatter delimiters for meaningful-content classification only. Introduce no frontmatter metadata fields or metadata presentation. Recognized frontmatter alone is Empty; recognized frontmatter followed by meaningful Markdown is Readable. Frontmatter syntax alone must not count as meaningful presented content. Malformed or unrecognized frontmatter must not be silently discarded: preserve it through complete general Markdown fallback. Retain original source in all cases. Future presented frontmatter metadata requires an explicit document convention and human approval; canonical Markdown metadata labels do not establish YAML fields.

Apply these exact V1 recognition rules:

- The opening `---` delimiter must occupy the first line of the document.
- A matching standalone `---` or `...` line closes the frontmatter.
- Support both LF and CRLF line endings without changing the retained source.
- Do not parse YAML or interpret metadata fields. This is delimiter recognition for meaningful-content classification only, not a YAML metadata feature.
- A later `---` must not independently establish frontmatter.
- An opening delimiter without a valid closing delimiter is malformed; preserve the entire original source through general Markdown fallback.
- Valid frontmatter alone is Empty; valid frontmatter followed by meaningful Markdown is Readable.

### Step 6 shared rendering integration

Keep one shared safe Markdown rendering path: retrieved source, Marked token analysis, then shared rendering organized into general or structured presentation. A small pure helper may recognize canonical regions and meaningful content; it must not render independently, fetch files, modify source or own selection.

Use one document-wide rendering context for heading identifiers and duplicate-heading counters, link metadata and destination indexes, source-order heading associations and fragment navigation. Do not render sections as independent Markdown documents. Structured layouts organize shared-renderer output into header, metadata and section regions while preserving source order and complete content. Retain global link associations and use the same destination policy for metadata links.

Maintain exact correspondence between source headings and rendered headings in either path. Do not insert layout headings into the source-heading sequence or restart identifier counters per section. The current reader assigns IDs by rendered heading order; preserve that correspondence or use explicit source-heading associations within the same presentation boundary. Equivalent source headings and fragments must retain their Step 5 identities across general and structured presentation.

Use static Angular presentation, never document-generated templates. Preserve inert raw HTML, Angular's normal sanitization, display-only code, non-loading image descriptions, the existing link policy, safe transitions, breadcrumbs and document identity. No trust bypasses, additional renderer, sanitizer, selection store, filesystem mechanism or API change is authorized.

### Step 6 implementation checkpoints

Expected paths below are relative to the repository root. These instructions define a plan only. After separate implementation authorization, report each checkpoint's exact diff and evidence for independent review; do not claim checks passed before execution.

**6A — Current-source analysis and meaningful-content classification**

- Objective and files: create `frontend/src/app/document-template.ts` and `frontend/src/app/document-template.spec.ts`; update `frontend/src/app/document-markdown.ts` and `frontend/src/app/document-markdown.spec.ts` only where shared token analysis requires integration. The helper recognizes canonical metadata/section regions, structural fallback and meaningful content; Marked remains the shared parser.
- Dependencies: canonical templates, approved classification/frontmatter rules, successfully retrieved original source and accepted Step 5 token/security behavior. Do not use discovery validity as a gate.
- Focused tests: all three canonical document types; optional metadata/sections present or absent; explicit inapplicability; missing, empty, duplicated, malformed, unexpected and out-of-order content; nested subsections and acceptance history; comments inside/outside inline, fenced and indented code; mixed comments/content; empty/whitespace input; ordinary presented Markdown metadata; valid frontmatter-only and frontmatter-plus-body cases; malformed/unrecognized frontmatter preserved by fallback; original source, line endings and valid UTF-8 containing NUL unchanged.
- Completion evidence: recognition/classification fixtures and actual focused test results demonstrate that no meaningful content is lost and no unknown metadata convention is invented. No layouts, backend changes, dependency additions or later-step features belong to this checkpoint.

**6B — Template-aware structured presentation through shared rendering**

- Objective and files: update `frontend/src/app/document-reader.ts`, `frontend/src/app/document-markdown.ts`, `frontend/src/app/document-markdown.spec.ts` and `frontend/src/app/document-reading.spec.ts`. Consume accepted 6A analysis without modifying `document-template.ts` or its tests. Keep DocumentReader as the presentation component, using static Angular wrappers for Requirement, Task and Implementation layouts and the approved mappings. The reader replaces whitespace-only content classification with the approved meaningful-content result. Project and standalone documents remain on the general path.
- Dependencies: 6A and accepted Steps 3–5. Reuse original-source delivery, response validation, availability states, selection and safe navigation unchanged.
- Shared render projection: use one shared Markdown rendering pipeline and one document-wide rendering context. Group rendered content into structured regions using accepted analysis associations. Do not re-lex individual source sections or reset heading IDs, duplicate-heading counters, link indexes or fragment associations. Preserve complete authored content and source order, including metadata prose and relationship links, optional sections, nested sections, lists, tables, code, display-only checklists and acceptance history. Documents that fail structural recognition use complete general Markdown fallback through the same shared rendering path.
- Presentation and security boundaries: preserve existing link handling, fragment navigation, Angular's normal sanitization and all Step 5 security restrictions. Keep API contracts, the Go backend, selection state, breadcrumbs and navigation coordination unchanged. Do not introduce a second renderer, new dependency or document-generated Angular templates.
- Exceptional rendering fallback: if source retrieval succeeds but analysis tokenization fails, attempt to render the original source through the shared renderer. If that also fails, show the original retrieved source as escaped plain text with a clear formatting-error message. Preserve successful-read identity; do not report the document as unreadable, discard or rewrite source, or substitute another document. Plain text must remain inert and preserve the complete original source.
- Implementation sequence: first implement shared render projection with focused renderer tests; then implement static structured layouts and focused reader tests. Keep broader reader integration and regression review in 6C. Each slice requires its exact incremental diff and actual verification results for review; this planning update does not authorize implementation.
- Focused tests: every canonical section and metadata value survives presentation; optional content stays optional; source order, nested subsections and history remain intact; checklists stay display-only; both paths preserve code, tables and links; heading/duplicate counters and link indexes remain global across sections; local/cross-document fragments and metadata links work; structural failures retain the complete general fallback; raw HTML, active content and executable-looking text remain inert in both paths.
- Exceptional fallback tests: simulate analysis tokenization failure and shared-renderer failure after a successful read; verify the formatting-error message, escaped complete original source, preserved line endings and valid UTF-8 containing NUL, unchanged successful-read identity and selection, and no unreadable state, substitute document or active content. Also verify that successful shared rendering after analysis failure uses general Markdown presentation.
- Completion evidence: fixture comparisons demonstrate richer document-specific layouts, consistent equivalent content, complete fallback and no source mutation. Run the production build and report actual results. No Foldout shell conversion, new palette, template repair, approval interpretation or sequential navigation is included.

**6C — Reader integration and regression review**

- Objective and files: update `frontend/src/app/document-reading.spec.ts` and only the preceding Step 6 implementation/test files when integration requires it. Verify current-source authority, availability and regressions without changing accepted reader/API or navigation contracts.
- Dependencies: 6B and accepted Step 4/5 integration. Test both stale-snapshot directions: `templateValid: true` with newly malformed source uses fallback, and `templateValid: false` with newly conforming source uses structured presentation. Preserve snapshot issue reporting.
- Focused tests: successful Empty and Readable states, readable content with validation issues, missing/unreadable/unsupported/forbidden/request-error states unchanged, no substitute selections, project and standalone general rendering, established breadcrumbs, safe and blocked links in both paths, failed-destination preservation, fragments, rapid requests and stale responses, collapse preserving reading context without refetch, and unchanged workspace source contents.
- Completion evidence: focused and full project check results, exact incremental diff, content-preservation comparisons, limitations and unmet criteria. Keep actual browser results separate from DOM/unit tests; Step 8 retains pending real-browser and full security qualification. Step 6 completion does not grant acceptance or authorize Step 7, Step 8 or TASK-006.

### Step 7 — Foldout and Deep Teal production integration

Integrate the human-accepted Foldout prototype into the production Angular application. Steps 5, 6A, 6B, and 6C are accepted. Step 7 requires separate explicit implementation authorization.

Use `frontend/prototypes/worktree/README.md`, `foldout.scss`, and `visual.scss` in the original checkout as the design reference. The accepted TASK-005 planning text governs where the static prototype differs from production behavior. Use the existing workspace snapshot, `App.select`, confirmed link and breadcrumb navigation, and `DocumentReader`. Keep Go, workspace discovery, retrieval contracts, document security, and authored Markdown intact. Exclude per-requirement selection memory, prototype fixtures and URL modes, palette and density controls, and TASK-006 sequential navigation. Use the existing Angular toolchain and the prototype’s locally bundled icons with their attribution and license. No new package is required.

| Slice | Changes | Verification |
| --- | --- | --- |
| 7A — Index and Foldout navigation | Update `frontend/src/app/app.ts`, `app.html`, and `app.scss`. Open a loaded workspace at the requirement index with direct requirement and task entry and access to the project document. In the workspace, connect the selected requirement rail to the reading surface and expose the requirement brief and discovered tasks in the task strip. Add index/workspace view state only. Use the existing selection model to open the requested requirement brief or task brief, preserve the requirement when switching tasks, and return to All requirements. Keep project and standalone documents reachable without inventing hierarchy. | Update `workspace-browsing.spec.ts` and affected setup in `document-reading.spec.ts`. Verify index entry and return, direct task entry, requirement switching, zero requirements, project access, unavailable selections, and absence of remembered selections when returning to a requirement. Re-run selection and stale-read regressions. |
| 7B — Reading surface and document controls | After 7A, integrate the compact Task brief / Implementation brief switcher into the reading surface using the existing document choice and selection handler. Keep breadcrumbs, current document identity, source path, availability messages and the accepted reader. Apply the accepted Deep Teal tokens in `frontend/src/styles.scss` and the app, document-choice and document-reader styles. Use the warm canvas, white paper, soft teal contextual selection, deep teal selected document control, and comfortable typography in both presentation paths. Keep the document at most 850 px including gutters and prose at most 70 characters wide. Style the existing non-blocking issue count and file/problem list with amber and dark text. | Verify both brief choices show the same selected treatment, use the exact requested document, and retain task context. Exercise both rendering paths, successful and unavailable documents, validation issues and zero issues. Re-run breadcrumb, link, fragment, and source-preservation regressions. |
| 7C — Responsive and reading-focus behavior | After 7B, implement the accepted wide vertical rail, four-column wrapping task strip at 980 px and below, two-column task strip and horizontal requirement rail at 700 px and below. Reading focus reduces the rail to IDs on wider screens and hides it on phones, with the requirement ribbon restoring context where the expanded tab no longer supplies it. Keep the reading scroll container mounted during collapse and expansion. Reset to the top for an ordinary source change while preserving the accepted destination-fragment scroll. Use native keyboard-operable controls, visible 2 px teal focus, accessible names, and appropriate current, pressed and expanded states. | Compare production against the prototype at 1440 × 900, 900 × 900, 768 × 900 and 390 × 844. Check the rail seam and alignment, long titles without clipping, keyboard activation, focus visibility, contrast, and no horizontal page overflow. Verify code and tables scroll within the reading surface. Measure reading position across collapse and expansion and assert stable selection, a mounted reader and no refetch. |

For 7B acceptance, the Task brief / Implementation brief switcher must allow either document to be explicitly selected even when it is missing or unreadable. The reader must display the selected document’s actual availability state and must never silently substitute the other brief. Verify this for each brief in both the missing and unreadable states.

Acceptance requires all three slices to pass their focused tests, the production build, and `make test`. Provide an incremental diff and results for each slice. For the final Step 7 review, include wide and narrow production screenshots and measured collapse/expand evidence. Distinguish browser observations from DOM tests and report any browser checks that could not run. Step 8 retains full browser and security qualification.

## Constraints and exclusions

- TASK-004 owns CLI workspace opening, the no-argument welcome screen, hierarchy discovery, workspace validation issues, and collapsible layout. Reuse its results; do not duplicate them or access the filesystem from Angular.
- TASK-006 owns sequential navigation and eligibility. A readable nonconforming document must still be renderable when reached by that navigation.
- Preserve hierarchy, identity, relationships, relative links, and source Markdown. Do not duplicate the full conventions or template definitions in product UI.
- Follow the agreed environment and selected Marked parser. Introduce no additional framework, sanitizer, component library, rendering architecture, state store or metadata schema without justification and approval. Keep the approach simple.
- Exclude editing, persistence, agent integrations, related-artifacts panels, and unrelated features. Do not change planning artifacts or approval states.
- This Step 5 planning update does not authorize implementation. Wait for separate explicit human implementation authorization. Preserve accepted Steps 3 and 4 and the Step 4 acceptance record; do not start TASK-006.

## Acceptance criteria

- Selected readable documents feel like polished webpages within Worktree, with document content, links, and meaning preserved; raw Markdown syntax is not the primary reading experience.
- Known conforming Worktree templates receive richer, document-specific layouts and appropriate UI elements informed by their structure and meaning.
- Missing fields, malformed sections, or structured parsing failure trigger a polished general Markdown fallback. Headings, paragraphs, lists, links, tables, and code blocks receive appropriate web-native presentation. Template-format failure alone never makes readable content unavailable or leaves the area blank.
- Template-aware and fallback presentations feel consistent within the same application, including typography, spacing, and treatment of equivalent content and links. Rendering and presentation never modify the original Markdown files.
- Breadcrumbs reflect the known Project → Requirement → Task hierarchy and navigate to ancestors. The current document is identifiable without creating a document hierarchy level.
- Valid internal artifact links resolve from their source directories and navigate to the intended content in both rendering modes while preserving context.
- Broken internal links display a clear unavailable-target message while the current document remains undisturbed. Every Step 5 destination-policy category is enforced, including external tabs, normal mailto/tel handling, blocked unsupported schemes and workspace confinement. Stale link responses never override a newer selection or link request.
- Reader integration works with TASK-004 selection and TASK-006 navigation without changing source artifacts or duplicating their responsibilities.
- Shared Markdown presentation makes raw HTML and active content inert, keeps code display-only and retains Angular sanitization without trust bypasses. Document interactions do not execute content or launch processes. Step 5 establishes the shared path; Steps 6–8 retain their assigned responsibilities.

## Verification and handoff

After approval and foundation availability, use applicable project checks and focused reading/navigation tests. Compare presented content, meaning, and link targets against source Markdown for conforming and nonconforming examples. Include missing metadata, missing sections, malformed section structure, and structured parsing failure; readable content must remain displayed through fallback.

Visually review both presentation paths in the approved application environment. Verify known templates use document-specific layouts reflecting their structure, and fallback examples containing headings, paragraphs, lists, links, tables, and code blocks read as polished webpages rather than raw Markdown previews. Compare typography, spacing, and equivalent content/link treatment across the paths for a consistent application experience. Check original file contents before and after presentation to confirm rendering makes no source changes.

Verify project, requirement, task-brief, and implementation-brief context, ancestor navigation, and source-relative internal links from different source directories. Exercise the same internal-link behavior in both rendering modes. Confirm task and implementation briefs share a task hierarchy position and that source files remain unchanged.

Test broken internal links in both presentation paths: show the unavailable-target message and preserve the current document. Verify every destination-policy category and retain typed read failures rather than inferring availability from issue text. Integrate with TASK-004 and, when separately authorized, TASK-006 rather than duplicating opening or ordering implementations. Report checks and results, unmet criteria, deviations and blockers; do not claim unexecuted interactions passed.

### Step 5 verification and requirement mapping

Step 5 addresses the first, third and fourth acceptance criteria through shared semantic presentation, general fallback and source preservation; template recognition and cross-layout comparison await Step 6. It addresses the fifth through established ancestor breadcrumbs, the sixth and seventh through source-relative links and the destination policy, and the eighth through regression coverage of accepted reader/selection integration. The second criterion remains Step 6 work. Final Foldout/Deep Teal presentation and full qualification remain Steps 7 and 8 respectively.

After implementation authorization, run focused Angular tests with `npm test -- --watch=false --include='src/app/document-markdown.spec.ts'` and `npm test -- --watch=false --include='src/app/document-reading.spec.ts'` from `frontend/`. Run `npm run build` there and compare optimized bundle output before and after Marked. Run `make test` from the root (production frontend build, Go race suite, `go vet` and Angular tests), then `git diff --check`. Preserve existing Go confinement tests as regression evidence; frontend tests must exercise typed forbidden outcomes without pretending mocked responses establish filesystem safety.

Step 5 browser checks cover rendered semantics, link/new-tab activation, mailto/tel browser handling, inert malicious fixtures, keyboard focus/activation, long table/code overflow and preservation of reading position on failure or navigation collapse. Use temporary fixtures, not destructive tests against project sources. Compare fixture contents before and after reads. Verify no execution capability or process-launch path is introduced; code review and tests must support this claim rather than relying only on an unchanged page. Record actual browser versions and results, pending checks and limitations. These scoped checks are required for Step 5 review; Step 8 performs broader end-to-end/security qualification across final layouts and integrated behavior. Do not claim Step 8 qualification from unit tests, a successful build or unexecuted browser checks.

### Step 6 verification and handoff

After explicit implementation authorization, run from `frontend/`:

```bash
npm test -- --watch=false --include=src/app/document-template.spec.ts
npm test -- --watch=false --include=src/app/document-markdown.spec.ts --include=src/app/document-reading.spec.ts
npm run build
```

Then run from the repository root:

```bash
make test
git diff --check
```

Report actual commands and results, exact changed-file lists and incremental diffs for each checkpoint. Include fixtures for all three presentation mappings and the meaningful-content matrix, malformed/optional sections and frontmatter, code/comment boundaries, stale discovery information, and cross-section heading/link/fragment consistency. Compare meaningful source content with both presentation paths and compare fixture contents before/after reads. Preserve source text, including line endings and valid UTF-8 containing NUL. Report any source mutation or missing content as a failure.

Re-run accepted selection, availability, breadcrumb, rendering, link and security regressions; do not substitute mocked frontend failures for Go confinement evidence. Keep visual observations and actual browser results distinct from unit/DOM tests. Pending real-browser qualification remains Step 8 work, and final Foldout/Deep Teal styling remains Step 7. Do not claim browser/security qualification, passing builds or task acceptance without evidence and the applicable human approval.

### Step 4 acceptance record — 2026-11-07

The human explicitly accepted Step 4 — Frontend reader integration after implementation review and the standalone selection-context correction. The implementation report and verification evidence remain preserved in the review history. This records acceptance of Step 4 only; TASK-005 is not complete. Step 5 and TASK-006 have not started, and this record does not authorize either.

### Step 5C and overall Step 5 acceptance record — 2026-11-08

The human formally accepted Step 5C — Navigable ancestor breadcrumbs and regression review on 2026-11-08. Acceptance covers the four reviewed files: `frontend/src/app/app.ts`, `frontend/src/app/app.html`, `frontend/src/app/app.scss` and `frontend/src/app/document-reading.spec.ts`. It also covers the reported automated verification: 107 focused Angular tests, 127 Angular tests in the full suite, the production frontend build, Go race tests, `go vet`, formatting and whitespace checks. Overall TASK-005 Step 5 implementation (5A, 5B and 5C) is now human-accepted; TASK-005 remains incomplete.

Real-browser qualification remains pending because the browser automation bridge was unavailable. This remains part of Step 8 qualification; automated verification does not establish real-browser qualification. Steps 6, 7 and TASK-006 have not been started or authorized. This acceptance grants no further implementation authorization. Earlier acceptance records and verification history remain unchanged.

### Final TASK-005 acceptance record — 2026-11-09

The human accepted TASK-005 after reviewing Step 8 browser and security qualification. TASK-005 is complete and accepted. This closes the previously pending browser qualification and follows the acceptance of Steps 5, 6A, 6B, 6C, and all of Step 7.

- Chrome 158.0.8127.18 and Firefox 159.0.1 passed at 1440 × 900, 900 × 900, 768 × 900, and 390 × 844. Collapse and expansion preserved the selected document and the 440 px reading position without another document request. Firefox keyboard checks passed in a foreground window.
- Live security checks verified inert raw HTML and executable content, blocked unsafe destinations, safe new tabs, and rejection of traversal, escaping symlinks, absolute host paths, and non-Markdown reads. All 12 fixture files remained byte-identical in each browser run.
- `make test` passed with 324 Angular tests, Go race tests, and `go vet`. `make build`, uncached server and workspace race tests, and `git diff --check` also passed. The existing `app.scss` budget warning was 6.10 kB against the 4.00 kB warning threshold.

Local qualification evidence is in the ignored build output: [Chrome results](../../../../../frontend/dist/step-8-evidence/chrome.json) and [Firefox results](../../../../../frontend/dist/step-8-evidence/firefox.json).

## Open questions

No remaining open decision for fragment or query handling: the human-approved behaviors are recorded in the Step 5 destination policy and checkpoint tests above. Implementation remains unauthorized pending separate explicit human instruction.
