package server_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"worktree/internal/server"
)

func TestJSONExchange(t *testing.T) {
	handler := server.Handler(fstest.MapFS{})
	request := httptest.NewRequest(http.MethodGet, "/api/example", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/json" || response.Body.String() != "{\"message\":\"Connected to Go.\"}\n" {
		t.Fatalf("unexpected exchange: %d %v %s", response.Code, response.Header(), response.Body.String())
	}
}

func TestRoutesKeepAPIAssetsAndNavigationSeparate(t *testing.T) {
	assets := fstest.MapFS{
		"index.html": {Data: []byte("<html>Worktree</html>")},
		"main.js":    {Data: []byte("console.log('local')")},
	}
	cases := []struct {
		name, method, target, accept string
		status                       int
		contentType, body            string
	}{
		{"navigation", "GET", "/", "text/html", 200, "text/html", "<html>"},
		{"entry document", "GET", "/index.html", "text/html", 200, "text/html", "<html>"},
		{"navigation head", "HEAD", "/", "text/html", 200, "text/html", ""},
		{"script", "GET", "/main.js", "*/*", 200, "javascript", "console.log"},
		{"unknown API", "GET", "/api/missing", "text/html", 404, "application/json", "not found"},
		{"API root", "GET", "/api", "text/html", 404, "application/json", "not found"},
		{"API method", "POST", "/api/example", "*/*", 405, "application/json", "method not allowed"},
		{"missing asset", "GET", "/missing.js", "text/html", 404, "text/plain", "not found"},
		{"unknown frontend route", "GET", "/unknown", "text/html", 404, "text/plain", "not found"},
		{"navigation method", "POST", "/", "text/html", 405, "text/plain", "method not allowed"},
		{"navigation JSON", "GET", "/", "application/json", 406, "text/plain", "not acceptable"},
		{"HTML explicitly refused", "GET", "/", "text/html;q=0, */*;q=1", 406, "text/plain", "not acceptable"},
		{"traversal", "GET", "/../go.mod", "text/html", 400, "text/plain", "invalid path"},
		{"encoded traversal", "GET", "/%2e%2e/go.mod", "*/*", 400, "text/plain", "invalid path"},
		{"double encoded traversal", "GET", "/%252e%252e/go.mod", "*/*", 400, "text/plain", "invalid path"},
		{"encoded separator", "GET", "/..%5cgo.mod", "*/*", 400, "text/plain", "invalid path"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.target, nil)
			request.Header.Set("Accept", tc.accept)
			response := httptest.NewRecorder()
			server.Handler(assets).ServeHTTP(response, request)
			if response.Code != tc.status || !strings.Contains(response.Header().Get("Content-Type"), tc.contentType) || !strings.Contains(response.Body.String(), tc.body) {
				t.Fatalf("got %d %v %q", response.Code, response.Header(), response.Body.String())
			}
			if tc.method == "HEAD" && response.Body.Len() != 0 {
				t.Fatal("HEAD returned a body")
			}
		})
	}
}
