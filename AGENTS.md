# Project agent instructions

Before creating, reviewing, updating, or implementing work described in `.worktree/`, read and follow the [workspace contract](.worktree/AGENTS.md). This includes implementing project code for a workspace task, even when editing outside `.worktree/`; do not assume your agent tool loads the contract automatically.

The workspace contract supplements applicable project instructions. Preserve existing project instructions when adding or updating workspace guidance.

## Test assertions

For all new Go tests and assertions added or updated in existing tests, use Testify's `github.com/stretchr/testify/assert` and `github.com/stretchr/testify/require` packages.

- Use `require` for setup and prerequisites that must pass before continuing, including successful decoding and non-nil checks before dereferencing.
- Use `assert` for independent comparisons so a test can report multiple failures.
- Prefer these assertions over manual `if` checks calling `t.Error`, `t.Errorf`, `t.Fatal` or `t.Fatalf`. Keep standard testing controls such as `t.Run`, `t.Helper`, `t.Cleanup` and `t.Skip` where appropriate.

Frontend tests continue to use the existing test framework's `expect` assertions.
