package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorkspaceArgsRetainsReaderForSelectedDirectory(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("# Topic\n"), 0600))
	tree, reader, err := workspaceFromArgs([]string{"--workspace", root})
	require.NoError(t, err)
	require.NotNil(t, tree)
	require.NotNil(t, reader)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })

	source, err := reader.Read("topic.md")
	require.NoError(t, err, "discovery must not close the retained reader")
	assert.Equal(t, "# Topic\n", source)
}

func TestWorkspaceArgsWithoutSelectionDoesNotCreateReader(t *testing.T) {
	tree, reader, err := workspaceFromArgs(nil)
	require.NoError(t, err)
	assert.Nil(t, tree)
	assert.Nil(t, reader)
}
