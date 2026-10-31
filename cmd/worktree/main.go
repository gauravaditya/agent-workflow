package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"worktree/frontend"
	"worktree/internal/server"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "worktree:", err)
		os.Exit(1)
	}
}

func run() error {
	// Workspace arguments and their UI belong to TASK-004. Reject rather than
	// silently pretend that a workspace was opened by this foundation.
	if len(os.Args) != 1 {
		return fmt.Errorf("workspace arguments are not implemented in this foundation")
	}
	listener, err := net.Listen("tcp", "127.0.0.1:8080")
	if err != nil {
		return fmt.Errorf("listen on 127.0.0.1:8080: %w", err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	fmt.Fprintf(os.Stdout, "Worktree listening at http://%s\n", listener.Addr())
	return server.Serve(ctx, listener, server.Handler(frontend.Assets()))
}
