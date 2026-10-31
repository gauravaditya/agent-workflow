package server

import "time"

const (
	// Five seconds bounds local shutdown while allowing small foundation requests
	// to drain. On expiry Serve closes remaining connections and returns an error.
	shutdownTimeout   = 5 * time.Second
	readHeaderTimeout = 5 * time.Second
)
