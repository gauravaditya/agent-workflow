package server

import "time"

const (
	// Five seconds bounds graceful draining. On expiry Serve closes remaining
	// connections, then waits for active handlers before returning the error.
	shutdownTimeout   = 5 * time.Second
	readHeaderTimeout = 5 * time.Second
)
