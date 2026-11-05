// Package workspace discovers read-only Worktree artifacts beneath one project.
package workspace

import (
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
	info, err := os.Stat(directory)
	if err != nil {
		return nil, fmt.Errorf("cannot open workspace %q: %w; check the path and directory permissions", directory, err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("workspace %q is not a directory; supply a project folder with --workspace", directory)
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return nil, fmt.Errorf("cannot open workspace %q: %w; check directory permissions", directory, err)
	}
	defer root.Close()
	if _, err := fs.ReadDir(root.FS(), "."); err != nil {
		return nil, fmt.Errorf("cannot read workspace %q: %w; check read and search permissions", directory, err)
	}
	absolute, err := filepath.Abs(directory)
	if err != nil {
		return nil, fmt.Errorf("resolve workspace %q: %w", directory, err)
	}
	return discover(root.FS(), filepath.Base(absolute)), nil
}
