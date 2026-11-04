package server_test

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	"worktree/internal/server"
	"worktree/internal/workspace"
)

func TestWorkspaceAPIWithoutArgumentReturnsWelcomeState(t *testing.T) {
	response := httptest.NewRecorder()
	server.Handler(fstest.MapFS{}, nil).ServeHTTP(response, httptest.NewRequest("GET", "/api/workspace", nil))
	var body map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	value, exists := body["workspace"]
	if response.Code != 200 || !exists || value != nil {
		t.Fatalf("expected explicit no-workspace state: %d %s", response.Code, response.Body.String())
	}
}

func TestWorkspaceAPIServesIssuesWithoutReadingHostPathsFromRequests(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, ".worktree"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".worktree/project.md"), []byte("# Project\nPRIVATE_BODY_CONTENT"), 0600); err != nil {
		t.Fatal(err)
	}
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	handler := server.Handler(fstest.MapFS{"index.html": {Data: []byte("<html>Embedded only</html>")}}, tree)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("GET", "/api/workspace?path=/etc/passwd", nil))
	var result struct {
		Workspace workspace.Snapshot `json:"workspace"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if response.Code != 200 || result.Workspace.Name != "Project" || !result.Workspace.Document.Readable || len(result.Workspace.Issues) == 0 || strings.Contains(response.Body.String(), "PRIVATE_BODY_CONTENT") {
		t.Fatalf("unexpected workspace response: %d %s", response.Code, response.Body.String())
	}
	if response.Header().Get("Content-Type") != "application/json" || response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("unexpected API headers: %v", response.Header())
	}
	for _, tc := range []struct {
		method, target string
		status         int
	}{
		{"POST", "/api/workspace", 405},
		{"GET", "/api/workspace/missing", 404},
		{"GET", "/.worktree/project.md", 404},
	} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(tc.method, tc.target, nil))
		if response.Code != tc.status || strings.Contains(response.Body.String(), "PRIVATE_BODY_CONTENT") || strings.Contains(response.Body.String(), "<html>") {
			t.Fatalf("routing separation failed: %s %s: %d %s", tc.method, tc.target, response.Code, response.Body.String())
		}
	}
}
