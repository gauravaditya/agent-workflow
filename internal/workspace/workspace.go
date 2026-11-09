// Package workspace discovers read-only Worktree artifacts beneath one project.
package workspace

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

// Snapshot contains navigation metadata, never document source or file handles.
type Snapshot struct {
	Name         string        `json:"name"`
	Document     Document      `json:"document"`
	Requirements []Requirement `json:"requirements"`
	Issues       []Issue       `json:"issues"`
}

// Document describes an artifact at a workspace-relative source path.
type Document struct {
	Path          string `json:"path"`
	Kind          string `json:"kind"`
	Title         string `json:"title"`
	Readable      bool   `json:"readable"`
	TemplateValid bool   `json:"templateValid"`
}

// Requirement and Task preserve directory identities and physical containment.
type Requirement struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Document  Document `json:"document"`
	Tasks     []Task   `json:"tasks"`
	TaskOrder []string `json:"taskOrder"`
}

type Task struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Documents []Document `json:"documents"`
}

// Issue identifies source problems without preventing use of other artifacts.
type Issue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

// Open checks the supplied directory before discovering its artifacts.
func Open(directory string) (*Snapshot, error) {
	tree, reader, err := OpenWithReader(directory)
	if err != nil {
		return nil, err
	}
	if err := reader.Close(); err != nil {
		return nil, fmt.Errorf("close workspace: %w", err)
	}
	return tree, nil
}

// OpenWithReader performs the existing startup discovery and retains the same
// confined root for request-time reads. The caller owns the returned Reader.
func OpenWithReader(directory string) (*Snapshot, *Reader, error) {
	info, err := os.Stat(directory)
	if err != nil {
		return nil, nil, fmt.Errorf("cannot open workspace %q: %w; check the path and directory permissions", directory, err)
	}
	if !info.IsDir() {
		return nil, nil, fmt.Errorf("workspace %q is not a directory; supply a project folder with --workspace", directory)
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return nil, nil, fmt.Errorf("cannot open workspace %q: %w; check directory permissions", directory, err)
	}
	if _, err := fs.ReadDir(root.FS(), "."); err != nil {
		closeErr := root.Close()
		return nil, nil, fmt.Errorf("cannot read workspace %q: %w; check read and search permissions", directory, errors.Join(err, closeErr))
	}
	absolute, err := filepath.Abs(directory)
	if err != nil {
		closeErr := root.Close()
		return nil, nil, fmt.Errorf("resolve workspace %q: %w", directory, errors.Join(err, closeErr))
	}
	return discover(root.FS(), filepath.Base(absolute)), &Reader{root: root, rootPath: absolute}, nil
}
