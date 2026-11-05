package server

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"worktree/internal/workspace"
)

// Handler keeps embedded assets separate from startup-discovered workspace
// metadata. No HTTP request supplies an arbitrary host filesystem path.
func Handler(assets fs.FS, tree *workspace.Snapshot) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if !safePath(r.URL.Path) {
			http.Error(w, "invalid path", http.StatusBadRequest)
			return
		}
		if r.URL.Path == "/api" || strings.HasPrefix(r.URL.Path, "/api/") {
			serveAPI(w, r, tree)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" || name == "index.html" {
			if !acceptsHTML(r.Header.Get("Accept")) {
				http.Error(w, "not acceptable", http.StatusNotAcceptable)
				return
			}
			name = "index.html"
		}
		data, err := fs.ReadFile(assets, name)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		if contentType := mime.TypeByExtension(path.Ext(name)); contentType != "" {
			w.Header().Set("Content-Type", contentType)
		}
		http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(data))
	})
}

func serveAPI(w http.ResponseWriter, r *http.Request, tree *workspace.Snapshot) {
	if r.URL.Path != "/api/example" && r.URL.Path != "/api/workspace" {
		writeJSON(w, http.StatusNotFound, "error", "not found")
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSON(w, http.StatusMethodNotAllowed, "error", "method not allowed")
		return
	}
	if r.URL.Path == "/api/workspace" {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		// This fixed metadata structure contains only JSON-encodable values.
		data, _ := json.Marshal(struct {
			Workspace *workspace.Snapshot `json:"workspace"`
		}{tree})
		_, _ = w.Write(append(data, '\n'))
		return
	}
	writeJSON(w, http.StatusOK, "message", "Connected to Go.")
}

func writeJSON(w http.ResponseWriter, status int, key, value string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// All values here are strings; encoding into memory cannot fail.
	data, _ := json.Marshal(map[string]string{key: value})
	_, _ = w.Write(append(data, '\n'))
}

func safePath(value string) bool {
	if !strings.HasPrefix(value, "/") || strings.ContainsAny(value, "\\%\x00") {
		return false
	}
	if value == "/" {
		return true
	}
	return fs.ValidPath(strings.TrimPrefix(value, "/"))
}

// A more specific media range wins over a wildcard, including an explicit q=0.
func acceptsHTML(accept string) bool {
	if accept == "" {
		return true
	}
	best, quality := -1, 0.0
	for _, item := range strings.Split(accept, ",") {
		mediaType, params, err := mime.ParseMediaType(strings.TrimSpace(item))
		if err != nil {
			continue
		}
		specificity := -1
		switch mediaType {
		case "text/html":
			specificity = 2
		case "text/*":
			specificity = 1
		case "*/*":
			specificity = 0
		}
		q := 1.0
		if raw, ok := params["q"]; ok {
			q, err = strconv.ParseFloat(raw, 64)
			if err != nil || q < 0 || q > 1 {
				continue
			}
		}
		if specificity > best || (specificity == best && q > quality) {
			best, quality = specificity, q
		}
	}
	return best >= 0 && quality > 0
}
