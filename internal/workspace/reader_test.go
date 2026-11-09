package workspace_test

import (
	"crypto/sha256"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"worktree/internal/workspace"
)

func TestReaderPreservesSourcesAndHandlesConcurrentReads(t *testing.T) {
	root := t.TempDir()
	sources := map[string]string{
		"topic.md": "# Source\r\n<!-- original comment -->\r\n```sh\necho display-only\n```\n",
		"empty.md": "",
	}
	for name, source := range sources {
		require.NoError(t, os.WriteFile(filepath.Join(root, name), []byte(source), 0600))
	}
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })
	type readResult struct {
		name, source string
		err          error
	}
	results := make(chan readResult, 32)
	var workers sync.WaitGroup
	for range 16 {
		workers.Go(func() {
			for name := range sources {
				source, err := reader.Read(name)
				results <- readResult{name, source, err}
			}
		})
	}
	workers.Wait()
	close(results)
	for result := range results {
		require.NoError(t, result.err)
		assert.Equal(t, sources[result.name], result.source)
	}
	for name, original := range sources {
		current, err := os.ReadFile(filepath.Join(root, name))
		require.NoError(t, err)
		assert.Equal(t, sha256.Sum256([]byte(original)), sha256.Sum256(current), "source hash: %s", name)
	}
}

func TestReaderClosedRootIsUnreadable(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("source"), 0600))
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	require.NoError(t, reader.Close())

	source, err := reader.Read("topic.md")
	assert.Empty(t, source)
	var failure *workspace.ReadError
	require.ErrorAs(t, err, &failure)
	assert.Equal(t, workspace.ReadUnreadable, failure.Kind)
	assert.ErrorIs(t, err, fs.ErrClosed)
}

func TestReaderChecksSymlinkTargetCaseAndLoops(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, "notes"), 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "notes", "Topic.md"), []byte("# Topic\n"), 0600))
	for name, target := range map[string]string{
		"valid.md":      "notes/Topic.md",
		"wrong-case.md": "notes/topic.md",
		"loop.md":       "loop.md",
		"escape.md":     "missing/../../outside.md",
	} {
		require.NoError(t, os.Symlink(target, filepath.Join(root, name)))
	}
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })
	source, err := reader.Read("valid.md")
	require.NoError(t, err)
	assert.Equal(t, "# Topic\n", source)
	for _, tc := range []struct {
		name string
		kind workspace.ReadFailure
	}{
		{"wrong-case.md", workspace.ReadMissing},
		{"loop.md", workspace.ReadUnreadable},
		{"escape.md", workspace.ReadForbidden},
	} {
		t.Run(tc.name, func(t *testing.T) {
			source, err := reader.Read(tc.name)
			assert.Empty(t, source)
			var failure *workspace.ReadError
			require.ErrorAs(t, err, &failure)
			assert.Equal(t, tc.kind, failure.Kind)
			assert.NotContains(t, failure.Error(), root)
		})
	}
}

func TestReaderFollowsConfinedParentRelativeSymlinks(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "notes", "nested"), 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("# Topic\n"), 0600))
	require.NoError(t, os.Symlink("../../topic.md", filepath.Join(root, "notes", "nested", "alias.md")))
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })

	source, err := reader.Read("notes/nested/alias.md")
	require.NoError(t, err)
	assert.Equal(t, "# Topic\n", source)
}

func TestReaderFollowsAbsoluteSymlinkOnlyWithinRetainedRoot(t *testing.T) {
	fixture := t.TempDir()
	root := filepath.Join(fixture, "workspace")
	require.NoError(t, os.Mkdir(root, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("# Original\n"), 0600))
	require.NoError(t, os.Symlink(filepath.Join(root, "topic.md"), filepath.Join(root, "alias.md")))
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })

	source, err := reader.Read("alias.md")
	require.NoError(t, err)
	assert.Equal(t, "# Original\n", source)
	require.NoError(t, os.Rename(root, filepath.Join(fixture, "moved")))
	require.NoError(t, os.Mkdir(root, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("OUTSIDE_REPLACEMENT_ROOT"), 0600))
	source, err = reader.Read("alias.md")
	assert.Empty(t, source)
	var failure *workspace.ReadError
	require.ErrorAs(t, err, &failure)
	assert.Equal(t, workspace.ReadForbidden, failure.Kind)
}

func TestReaderRootRemainsAnchoredAfterRename(t *testing.T) {
	fixture := t.TempDir()
	root := filepath.Join(fixture, "workspace")
	require.NoError(t, os.Mkdir(root, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("# Original\n"), 0600))
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })
	require.NoError(t, os.Rename(root, filepath.Join(fixture, "moved")))
	require.NoError(t, os.Mkdir(root, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("REPLACEMENT_ROOT"), 0600))

	source, err := reader.Read("topic.md")
	require.NoError(t, err)
	assert.Equal(t, "# Original\n", source)
}

func TestReaderConfinesConcurrentDirectorySymlinkChanges(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("atomic symlink replacement fixture uses Unix rename semantics")
	}
	fixture := t.TempDir()
	root := filepath.Join(fixture, "workspace")
	inside, outside := filepath.Join(root, "inside"), filepath.Join(fixture, "outside")
	require.NoError(t, os.MkdirAll(inside, 0700))
	require.NoError(t, os.Mkdir(outside, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(inside, "topic.md"), []byte("# Inside\n"), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(outside, "topic.md"), []byte("OUTSIDE_SECRET"), 0600))
	require.NoError(t, os.Symlink("inside", filepath.Join(root, "switch")))
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })
	stop, done := make(chan struct{}), make(chan error, 1)
	go func() {
		for i := 0; ; i++ {
			select {
			case <-stop:
				done <- nil
				return
			default:
			}
			target := "inside"
			if i%2 == 0 {
				target = "../outside"
			}
			if err := os.Symlink(target, filepath.Join(root, "replacement")); err != nil {
				done <- err
				return
			}
			if err := os.Rename(filepath.Join(root, "replacement"), filepath.Join(root, "switch")); err != nil {
				done <- err
				return
			}
		}
	}()
	defer func() {
		close(stop)
		require.NoError(t, <-done)
	}()
	for range 200 {
		source, err := reader.Read("switch/topic.md")
		assert.NotContains(t, source, "OUTSIDE_SECRET")
		if err == nil {
			assert.Equal(t, "# Inside\n", source)
			continue
		}
		assert.Empty(t, source)
		var failure *workspace.ReadError
		require.ErrorAs(t, err, &failure)
		assert.True(t, failure.Kind == workspace.ReadForbidden || failure.Kind == workspace.ReadUnreadable || failure.Kind == workspace.ReadMissing)
		assert.NotContains(t, failure.Error(), fixture)
	}
}

func TestReaderRejectsInvalidPortableDestinations(t *testing.T) {
	_, reader, err := workspace.OpenWithReader(t.TempDir())
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })
	for _, tc := range []struct {
		path string
		kind workspace.ReadFailure
	}{
		{"C:\\outside.md", workspace.ReadForbidden},
		{"\\\\host\\share\\topic.md", workspace.ReadForbidden},
		{"notes\\topic.md", workspace.ReadUnsupported},
		{"notes/\x00.md", workspace.ReadUnsupported},
		{"mailto:user@example.com", workspace.ReadUnsupported},
		{"tel:123", workspace.ReadUnsupported},
		{"custom:topic.md", workspace.ReadUnsupported},
	} {
		t.Run(tc.path, func(t *testing.T) {
			source, err := reader.Read(tc.path)
			assert.Empty(t, source)
			var failure *workspace.ReadError
			require.ErrorAs(t, err, &failure)
			assert.Equal(t, tc.kind, failure.Kind)
		})
	}
}
