package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"os"
	"os/signal"
	"syscall"

	"worktree/frontend"
	"worktree/internal/server"
	"worktree/internal/workspace"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "worktree:", err)
		os.Exit(1)
	}
}

func run() (err error) {
	tree, reader, err := workspaceFromArgs(os.Args[1:])
	if err != nil {
		return err
	}
	if reader != nil {
		// Serve returns after draining requests, including on shutdown. Also
		// release the root when listener initialization fails.
		defer func() {
			if closeErr := reader.Close(); closeErr != nil {
				err = errors.Join(err, fmt.Errorf("close workspace reader: %w", closeErr))
			}
		}()
	}
	listener, err := net.Listen("tcp", "127.0.0.1:8080")
	if err != nil {
		return fmt.Errorf("listen on 127.0.0.1:8080: %w", err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	fmt.Fprintf(os.Stdout, "Worktree listening at http://%s\n", listener.Addr())
	return server.Serve(ctx, listener, server.Handler(frontend.Assets(), tree, reader))
}

// All CLI and root-access checks finish before acquiring the HTTP listener.
func workspaceFromArgs(args []string) (*workspace.Snapshot, *workspace.Reader, error) {
	flags := flag.NewFlagSet("worktree", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	directory := flags.String("workspace", "", "path to the project directory")
	if err := flags.Parse(args); err != nil {
		return nil, nil, fmt.Errorf("%w; usage: worktree --workspace /path/to/project", err)
	}
	if flags.NArg() != 0 {
		return nil, nil, fmt.Errorf("unexpected positional arguments; use --workspace /path/to/project")
	}
	provided := false
	flags.Visit(func(f *flag.Flag) { provided = provided || f.Name == "workspace" })
	if !provided {
		return nil, nil, nil
	}
	if *directory == "" {
		return nil, nil, fmt.Errorf("--workspace must name a project directory; usage: worktree --workspace /path/to/project")
	}
	return workspace.OpenWithReader(*directory)
}
