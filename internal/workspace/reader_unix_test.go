//go:build unix

package workspace_test

import (
	"os"
	"path/filepath"
	"syscall"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"worktree/internal/workspace"
)

func TestReaderRejectsNamedPipeWithoutOpeningItsContent(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, syscall.Mkfifo(filepath.Join(root, "pipe.md"), 0600))
	_, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })

	source, err := reader.Read("pipe.md")
	assert.Empty(t, source)
	var failure *workspace.ReadError
	require.ErrorAs(t, err, &failure)
	assert.Equal(t, workspace.ReadUnsupported, failure.Kind)
	info, err := os.Lstat(filepath.Join(root, "pipe.md"))
	require.NoError(t, err)
	assert.NotZero(t, info.Mode()&os.ModeNamedPipe)
}
