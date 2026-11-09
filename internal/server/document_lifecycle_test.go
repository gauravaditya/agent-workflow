package server_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"testing/fstest"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"worktree/internal/server"
	"worktree/internal/workspace"
)

func TestDocumentReaderRemainsOpenUntilHTTPDrainFinishes(t *testing.T) {
	checkDocumentReaderLifetime(t, false)
}

func TestDocumentReaderRemainsOpenUntilForcedHandlerExits(t *testing.T) {
	checkDocumentReaderLifetime(t, true)
}

func checkDocumentReaderLifetime(t *testing.T, forced bool) {
	t.Helper()
	root := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(root, "topic.md"), []byte("# Topic\n"), 0600))
	tree, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		assert.NoError(t, reader.Close())
		require.NoError(t, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	entered, release, finished := make(chan struct{}), make(chan struct{}), make(chan struct{})
	handlerExited := make(chan struct{})
	var releaseOnce sync.Once
	releaseRequest := func() { releaseOnce.Do(func() { close(release) }) }
	handler := server.Handler(fstest.MapFS{}, tree, reader)
	type readResult struct {
		source string
		err    error
	}
	readInsideHandler := make(chan readResult, 1)
	var serveErr error
	exitedBeforeCleanup := false
	go func() {
		serveErr = server.Serve(ctx, listener, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer close(handlerExited)
			close(entered)
			<-release
			source, err := reader.Read("topic.md")
			readInsideHandler <- readResult{source, err}
			handler.ServeHTTP(w, r)
		}))
		select {
		case <-handlerExited:
			exitedBeforeCleanup = true
		default:
		}
		serveErr = errors.Join(serveErr, reader.Close())
		close(finished)
	}()
	t.Cleanup(func() {
		cancel()
		releaseRequest()
		select {
		case <-finished:
			if forced {
				assert.ErrorIs(t, serveErr, context.DeadlineExceeded)
			} else {
				assert.NoError(t, serveErr)
			}
		case <-time.After(7 * time.Second):
			assert.Fail(t, "HTTP owner did not release the workspace reader")
		}
	})
	type exchange struct {
		code int
		body []byte
		err  error
	}
	result := make(chan exchange, 1)
	go func() {
		client := &http.Client{Timeout: 12 * time.Second}
		response, err := client.Get("http://" + listener.Addr().String() + "/api/document?path=topic.md")
		if err != nil {
			result <- exchange{err: err}
			return
		}
		body, readErr := io.ReadAll(response.Body)
		result <- exchange{response.StatusCode, body, errors.Join(readErr, response.Body.Close())}
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		require.FailNow(t, "document request did not enter the server")
	}
	cancel()
	if forced {
		// The five-second production drain deadline must close the connection
		// before the client timeout, while the handler is still blocked.
		select {
		case response := <-result:
			require.Error(t, response.err)
		case <-time.After(7 * time.Second):
			require.FailNow(t, "forced shutdown did not close the connection")
		}
	}
	select {
	case <-finished:
		require.FailNow(t, "server abandoned its active document request")
	case <-time.After(20 * time.Millisecond):
	}
	source, err := reader.Read("topic.md")
	require.NoError(t, err, "reader must remain open during drain")
	assert.Equal(t, "# Topic\n", source)
	releaseRequest()
	if !forced {
		select {
		case response := <-result:
			require.NoError(t, response.err)
			assert.Equal(t, http.StatusOK, response.code)
			var body map[string]any
			require.NoError(t, json.Unmarshal(response.body, &body))
			assert.Equal(t, "topic.md", body["path"])
			assert.Equal(t, "ok", body["status"])
			assert.Equal(t, "# Topic\n", body["source"])
		case <-time.After(3 * time.Second):
			require.FailNow(t, "document request did not finish")
		}
	}
	select {
	case read := <-readInsideHandler:
		require.NoError(t, read.err, "active handler must retain reader access after connection close")
		assert.Equal(t, "# Topic\n", read.source)
	case <-time.After(3 * time.Second):
		require.FailNow(t, "released handler did not finish reading")
	}
	select {
	case <-finished:
		require.True(t, exitedBeforeCleanup, "reader cleanup must follow handler exit")
		if forced {
			require.ErrorIs(t, serveErr, context.DeadlineExceeded)
		} else {
			require.NoError(t, serveErr)
		}
	case <-time.After(3 * time.Second):
		require.FailNow(t, "server did not finish draining")
	}
	_, err = reader.Read("topic.md")
	assert.ErrorIs(t, err, os.ErrClosed)
}
