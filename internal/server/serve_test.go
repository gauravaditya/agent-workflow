package server_test

import (
	"context"
	"io"
	"net"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"worktree/internal/server"
)

func TestShutdownReportsDeadlineAndClosesBlockedConnection(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer listener.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	entered, release := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	releaseHandler := func() { releaseOnce.Do(func() { close(release) }) }
	defer releaseHandler()
	finished := make(chan error, 1)
	go func() {
		finished <- server.Serve(ctx, listener, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			close(entered)
			<-release
		}))
	}()
	requestDone := make(chan error, 1)
	go func() {
		client := &http.Client{Timeout: 12 * time.Second}
		response, err := client.Get("http://" + listener.Addr().String())
		if err == nil {
			response.Body.Close()
		}
		requestDone <- err
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		require.FailNow(t, "request did not start")
	}
	cancel()
	// The five-second budget still bounds connection shutdown. Returning from
	// Serve must additionally wait for the application handler to exit.
	select {
	case err := <-requestDone:
		require.Error(t, err, "blocked connection was not closed")
	case <-time.After(7 * time.Second):
		require.FailNow(t, "connection shutdown exceeded its bound")
	}
	select {
	case <-finished:
		require.FailNow(t, "Serve returned before its active handler exited")
	case <-time.After(20 * time.Millisecond):
	}
	releaseHandler()
	select {
	case err := <-finished:
		assert.ErrorIs(t, err, context.DeadlineExceeded)
	case <-time.After(3 * time.Second):
		require.FailNow(t, "Serve did not return after its handler exited")
	}
}

func TestShutdownDrainsActiveRequestAndReleasesListener(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	entered, release := make(chan struct{}), make(chan struct{})
	defer func() {
		select {
		case <-release:
		default:
			close(release)
		}
	}()
	finished := make(chan error, 1)
	go func() {
		finished <- server.Serve(ctx, listener, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			close(entered)
			<-release
			_, _ = io.WriteString(w, "finished")
		}))
	}()
	result := make(chan error, 1)
	go func() {
		client := &http.Client{Timeout: 3 * time.Second}
		response, err := client.Get("http://" + listener.Addr().String())
		if err != nil {
			result <- err
			return
		}
		defer response.Body.Close()
		data, err := io.ReadAll(response.Body)
		if err == nil && string(data) != "finished" {
			err = io.ErrUnexpectedEOF
		}
		result <- err
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("request did not start")
	}
	cancel()
	select {
	case err := <-finished:
		t.Fatalf("shutdown abandoned active request: %v", err)
	case <-time.After(30 * time.Millisecond):
	}
	close(release)
	select {
	case err := <-result:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("request did not finish")
	}
	select {
	case err := <-finished:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("shutdown did not finish")
	}
	connection, err := net.DialTimeout("tcp", listener.Addr().String(), time.Second)
	if err == nil {
		connection.Close()
		t.Fatal("listener remained open")
	}
}
