package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"sync"
)

// Serve owns listener and allows requests to drain until the shutdown timeout.
// On expiry it closes connections, then waits for admitted handlers to exit
// before returning. Callers may release handler resources only after it returns.
func Serve(ctx context.Context, listener net.Listener, handler http.Handler) error {
	var handlers sync.WaitGroup
	var admission sync.Mutex
	stopped := false
	tracked := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		admission.Lock()
		if stopped {
			admission.Unlock()
			// Abort a late connection without invoking the application handler
			// or inventing an API response after resource cleanup has begun.
			panic(http.ErrAbortHandler)
		}
		handlers.Add(1)
		admission.Unlock()
		defer handlers.Done()
		handler.ServeHTTP(w, r)
	})
	defer func() {
		// The gate prevents Add racing a zero-count Wait: a late callback may
		// not enter the application after this wait has completed.
		admission.Lock()
		stopped = true
		admission.Unlock()
		handlers.Wait()
	}()
	host := &http.Server{Handler: tracked, ReadHeaderTimeout: readHeaderTimeout}
	finished := make(chan error, 1)
	go func() { finished <- host.Serve(listener) }()
	select {
	case err := <-finished:
		return fmt.Errorf("serve HTTP: %w", errors.Join(err, host.Close()))
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := host.Shutdown(shutdownCtx); err != nil {
		closeErr := host.Close()
		<-finished
		return fmt.Errorf("graceful shutdown: %w", errors.Join(err, closeErr))
	}
	if err := <-finished; !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("serve HTTP: %w", err)
	}
	return nil
}
