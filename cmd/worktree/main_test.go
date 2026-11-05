package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// The subprocess exercises real main/error/exit behavior without binding a test
// listener or sharing process-global command-line flags with other tests.
func TestCLIProcess(t *testing.T) {
	if os.Getenv("WORKTREE_CLI_TEST_PROCESS") != "1" {
		return
	}
	for i, arg := range os.Args {
		if arg == "--" {
			os.Args = append([]string{"worktree"}, os.Args[i+1:]...)
			main()
			os.Exit(0)
		}
	}
}

func TestCLIRejectsInvalidWorkspaceBeforeStartingServer(t *testing.T) {
	root := t.TempDir()
	file := filepath.Join(root, "file")
	if err := os.WriteFile(file, []byte("file"), 0600); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name string
		args []string
		want string
	}{
		{"missing directory", []string{"--workspace", filepath.Join(root, "missing")}, "cannot open workspace"},
		{"regular file", []string{"--workspace", file}, "not a directory"},
		{"empty path", []string{"--workspace="}, "must name a project directory"},
		{"missing flag value", []string{"--workspace"}, "flag needs an argument"},
		{"unknown flag", []string{"--unknown"}, "flag provided but not defined"},
		{"positional path", []string{root}, "use --workspace"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			args := append([]string{"-test.run=^TestCLIProcess$", "--"}, tc.args...)
			command := exec.CommandContext(ctx, os.Args[0], args...)
			command.Env = append(os.Environ(), "WORKTREE_CLI_TEST_PROCESS=1")
			output, err := command.CombinedOutput()
			if err == nil || ctx.Err() != nil || !strings.Contains(string(output), tc.want) || strings.Contains(string(output), "Worktree listening") {
				t.Fatalf("CLI result err=%v context=%v output=%s", err, ctx.Err(), output)
			}
		})
	}
}

func TestCLIRejectsUnreadableDirectoryBeforeStartingServer(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix permission fixture; Windows ACL coverage needs Windows")
	}
	root := t.TempDir()
	if err := os.Chmod(root, 0000); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(root, 0700) })
	if _, err := os.ReadDir(root); err == nil {
		t.Skip("test user bypasses permissions")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, os.Args[0], "-test.run=^TestCLIProcess$", "--", "--workspace", root)
	command.Env = append(os.Environ(), "WORKTREE_CLI_TEST_PROCESS=1")
	output, err := command.CombinedOutput()
	if err == nil || ctx.Err() != nil || !strings.Contains(string(output), "permissions") || strings.Contains(string(output), "Worktree listening") {
		t.Fatalf("expected inaccessible-path failure before serving: %v %s", err, output)
	}
}
