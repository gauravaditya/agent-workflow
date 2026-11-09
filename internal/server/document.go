package server

import (
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"net/url"
	"unicode/utf8"

	"worktree/internal/workspace"
)

type documentResponse struct {
	Path   *string `json:"path"`
	Status string  `json:"status"`
	Source *string `json:"source,omitempty"`
	Error  string  `json:"error,omitempty"`
}

func serveDocument(w http.ResponseWriter, r *http.Request, reader *workspace.Reader) {
	query, parseErr := url.ParseQuery(r.URL.RawQuery)
	paths := query["path"]
	var requested *string
	if parseErr == nil && len(paths) == 1 && paths[0] != "" && utf8.ValidString(paths[0]) {
		requested = &paths[0]
	}
	response := documentResponse{Path: requested, Status: "unsupported"}
	code := http.StatusBadRequest
	switch {
	case r.Method != http.MethodGet:
		w.Header().Set("Allow", "GET")
		code, response.Error = http.StatusMethodNotAllowed, "Method not allowed; use GET"
	case requested == nil:
		response.Error = "Supply exactly one nonempty, correctly encoded path parameter"
	case reader == nil:
		code, response.Status, response.Error = http.StatusForbidden, "forbidden", "No workspace selected"
	default:
		source, err := reader.Read(*requested)
		if err == nil {
			code, response.Status, response.Source = http.StatusOK, "ok", &source
		} else {
			var failure *workspace.ReadError
			code, response.Status, response.Error = http.StatusInternalServerError, "unreadable", "Unable to read document"
			if errors.As(err, &failure) {
				response.Status, response.Error = string(failure.Kind), failure.Error()
				switch failure.Kind {
				case workspace.ReadMissing:
					code = http.StatusNotFound
				case workspace.ReadUnsupported:
					code = http.StatusBadRequest
				case workspace.ReadForbidden:
					code = http.StatusForbidden
				case workspace.ReadUnreadable:
					if errors.Is(failure, fs.ErrPermission) {
						code = http.StatusForbidden
					}
				}
			}
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	// The envelope contains only strings and pointers to strings.
	data, _ := json.Marshal(response)
	_, _ = w.Write(append(data, '\n'))
}
