package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
)

// Serve owns listener and drains requests on cancellation, bounded by the
// shutdown timeout. A failed drain forcibly closes connections and is reported.
func Serve(ctx context.Context, listener net.Listener, handler http.Handler) error {
	host := &http.Server{Handler: handler, ReadHeaderTimeout: readHeaderTimeout}
	finished := make(chan error, 1)
	go func() { finished <- host.Serve(listener) }()
	select {
	case err := <-finished:
		return fmt.Errorf("serve HTTP: %w", err)
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
