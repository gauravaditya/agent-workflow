package frontend

import (
	"embed"
	"io/fs"
)

// production contains only build output. A missing index.html fails compilation.
//
//go:embed dist/frontend/browser/index.html dist/frontend/browser/*
var production embed.FS

// Assets exposes the embedded production frontend, never the host filesystem.
func Assets() fs.FS {
	assets, err := fs.Sub(production, "dist/frontend/browser")
	if err != nil {
		panic(err)
	} // The fixed embed path is a compile-time invariant.
	return assets
}
