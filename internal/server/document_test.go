package server_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"worktree/internal/server"
	"worktree/internal/workspace"
)

func TestDocumentAPIOriginalSource(t *testing.T) {
	const requirement = "# REQ-001 — Reader contract\n\n## Intent\nRead sources.\n\n## Desired outcome\nPreserve content.\n\n## Scope\nRead only.\n\n## Tasks\n- [TASK-001](tasks/TASK-001/task.md)\n"
	const task = "# TASK-001 — Read sources\n\nRequirement: [REQ-001](../../req.md)\n\n## Purpose\nRead sources.\n\n## Scope\nRead only.\n\n## Expected outcome\nOriginal source.\n\n## Implementation brief\n[Implementation brief](implementation.md)\n"
	const implementation = "# TASK-001 — Implementation brief: Read sources\n\nRequirement: [REQ-001](../../req.md)\n\nTask: [TASK-001](task.md)\n\n## Objective\nRead sources.\n\n## Context and sources\nOriginal Markdown.\n\n## Required work\nPreserve content.\n\n## Constraints and exclusions\nRead only.\n\n## Acceptance criteria\nExact source.\n\n## Verification and handoff\nCompare bytes.\n"
	cases := []struct {
		name, path, source string
	}{
		{"project", ".worktree/project.md", "# Contract workspace\n"},
		{"requirement", ".worktree/requirements/REQ-001/req.md", requirement},
		{"task", ".worktree/requirements/REQ-001/tasks/TASK-001/task.md", task},
		{"implementation", ".worktree/requirements/REQ-001/tasks/TASK-001/implementation.md", implementation},
		{"standalone", "notes/topic.md", "# Standalone\nNot in the discovery hierarchy.\n"},
		{"empty successful read", "notes/empty.md", ""},
		{"NUL is valid UTF-8 source", "notes/nul.md", "# Before\x00after\n"},
		{"comments and fenced examples", "notes/examples.md", "<!-- keep original source -->\n```sh\necho display-only\n```\n"},
		{"readable despite template issues", ".worktree/requirements/REQ-002/req.md", "Missing canonical headings but readable.\n"},
		{"case spaces and UTF-8", "notes/Topic café.md", "# Café\n"},
		{"decode query once", "notes/%2e%2e.md", "Literal percent-encoded filename.\n"},
		{"confined parent-relative target", "notes/../notes/parent.md", "Parent-relative stays in the workspace.\n"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			writeDocumentFixture(t, root, tc.path, tc.source)
			handler := documentContractHandler(t, root)

			response := documentRequest(handler, "GET", "path="+url.QueryEscape(tc.path))
			assertDocumentResponse(t, response, 200, &tc.path, "ok", &tc.source)
			unchanged, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(tc.path)))
			require.NoError(t, err)
			assert.Equal(t, tc.source, string(unchanged), "source changed after read")
		})
	}
}

func TestDocumentAPIRequestFailures(t *testing.T) {
	root := t.TempDir()
	writeDocumentFixture(t, root, "notes/topic.md", "# Content\n")
	writeDocumentFixture(t, root, "notes/invalid.md", string([]byte{0xff, 0xfe}))
	require.NoError(t, os.Mkdir(filepath.Join(root, "directory.md"), 0700))
	handler := documentContractHandler(t, root)
	cases := []struct {
		name, path, status string
		code               int
	}{
		{"missing", "notes/missing.md", "missing", 404},
		{"wrong path case", "Notes/topic.md", "missing", 404},
		{"wrong filename case", "notes/Topic.md", "missing", 404},
		{"unreadable as UTF-8", "notes/invalid.md", "unreadable", 500},
		{"uppercase extension", "notes/topic.MD", "unsupported", 400},
		{"mixed extension", "notes/topic.Md", "unsupported", 400},
		{"other Markdown extension", "notes/topic.markdown", "unsupported", 400},
		{"script", "notes/run.sh", "unsupported", 400},
		{"executable", "notes/run.exe", "unsupported", 400},
		{"directory", "directory.md", "unsupported", 400},
		{"URL", "https://example.com/topic.md", "unsupported", 400},
		{"file URI", "file:///tmp/topic.md", "unsupported", 400},
		{"executable URI", "javascript:alert(1)", "unsupported", 400},
		{"parent escape", "../outside.md", "forbidden", 403},
		{"absolute path", filepath.Join(t.TempDir(), "outside.md"), "forbidden", 403},
		{"escape before extension check", "../outside.sh", "forbidden", 403},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			response := documentRequest(handler, "GET", "path="+url.QueryEscape(tc.path))
			assertDocumentResponse(t, response, tc.code, &tc.path, tc.status, nil)
		})
	}
}

func TestDocumentAPIMalformedRequestsAndMethods(t *testing.T) {
	handler := documentContractHandler(t, t.TempDir())
	path := "notes/topic.md"
	cases := []struct {
		name, method, query string
		path                *string
		code                int
	}{
		{"missing parameter", "GET", "", nil, 400},
		{"empty parameter", "GET", "path=", nil, 400},
		{"duplicate parameter", "GET", "path=a.md&path=b.md", nil, 400},
		{"duplicate identical parameter", "GET", "path=a.md&path=a.md", nil, 400},
		{"malformed encoding", "GET", "path=%ZZ", nil, 400},
		{"invalid UTF-8 identity", "GET", "path=%FF.md", nil, 400},
		{"unsupported method", "POST", "path=" + path, &path, 405},
		{"unsupported method without identity", "POST", "", nil, 405},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			response := documentRequest(handler, tc.method, tc.query)
			assertDocumentResponse(t, response, tc.code, tc.path, "unsupported", nil)
			if tc.code == 405 {
				assert.Equal(t, "GET", response.Header().Get("Allow"))
			}
		})
	}
}

func TestDocumentAPIWithoutWorkspace(t *testing.T) {
	path := "notes/topic.md"
	response := documentRequest(server.Handler(fstest.MapFS{}, nil, nil), "GET", "path="+path)
	assertDocumentResponse(t, response, 403, &path, "forbidden", nil)
}

func TestDocumentAPIPermissionDenied(t *testing.T) {
	root := t.TempDir()
	path := "notes/private.md"
	writeDocumentFixture(t, root, path, "private content must not leak")
	handler := documentContractHandler(t, root)
	file := filepath.Join(root, filepath.FromSlash(path))
	require.NoError(t, os.Chmod(file, 0))
	t.Cleanup(func() {
		assert.NoError(t, os.Chmod(file, 0600))
	})
	if _, err := os.ReadFile(file); err == nil {
		t.Skip("current user/filesystem does not enforce file permission denial")
	} else {
		require.ErrorIs(t, err, os.ErrPermission, "permission fixture")
	}

	response := documentRequest(handler, "GET", "path="+path)
	assertDocumentResponse(t, response, 403, &path, "unreadable", nil)
}

func TestDocumentAPISymlinkDestinations(t *testing.T) {
	root := t.TempDir()
	outside := t.TempDir()
	source := "# Confined source\n"
	writeDocumentFixture(t, root, "notes/topic.md", source)
	writeDocumentFixture(t, outside, "outside.md", "outside content must not leak")
	links := []struct {
		path, target string
	}{
		{"alias.md", "notes/topic.md"},
		{"escape.md", filepath.Join(outside, "outside.md")},
		{"alias.sh", "notes/topic.md"},
	}
	for _, link := range links {
		require.NoError(t, os.Symlink(link.target, filepath.Join(root, link.path)), "create symlink fixture")
	}
	handler := documentContractHandler(t, root)
	for _, tc := range []struct {
		path, status string
		code         int
		source       *string
	}{
		{"alias.md", "ok", 200, &source},
		{"escape.md", "forbidden", 403, nil},
		{"alias.sh", "unsupported", 400, nil},
	} {
		t.Run(tc.path, func(t *testing.T) {
			response := documentRequest(handler, "GET", "path="+url.QueryEscape(tc.path))
			assertDocumentResponse(t, response, tc.code, &tc.path, tc.status, tc.source)
		})
	}
}

func TestDocumentAPIDoesNotReadNonMarkdownSymlinkTargets(t *testing.T) {
	root := t.TempDir()
	writeDocumentFixture(t, root, "run.sh", "UNSUPPORTED_SCRIPT_CONTENT")
	require.NoError(t, os.Symlink("run.sh", filepath.Join(root, "alias.md")))
	handler := documentContractHandler(t, root)
	path := "alias.md"

	response := documentRequest(handler, "GET", "path="+path)
	assertDocumentResponse(t, response, 400, &path, "unsupported", nil)
	assert.NotContains(t, response.Body.String(), "UNSUPPORTED_SCRIPT_CONTENT")
}

func TestDocumentAPIReadsCurrentFilesWithoutChangingDiscovery(t *testing.T) {
	root := t.TempDir()
	handler := documentContractHandler(t, root)
	path := "notes/late.md"
	before := httptest.NewRecorder()
	handler.ServeHTTP(before, httptest.NewRequest("GET", "/api/workspace", nil))
	assertDocumentResponse(t, documentRequest(handler, "GET", "path="+path), 404, &path, "missing", nil)

	source := "# Created after discovery\n<!-- source stays intact -->\n"
	writeDocumentFixture(t, root, path, source)
	assertDocumentResponse(t, documentRequest(handler, "GET", "path="+path), 200, &path, "ok", &source)
	source = "# Updated after discovery\n"
	writeDocumentFixture(t, root, path, source)
	assertDocumentResponse(t, documentRequest(handler, "GET", "path="+path), 200, &path, "ok", &source)
	require.NoError(t, os.Remove(filepath.Join(root, filepath.FromSlash(path))))
	assertDocumentResponse(t, documentRequest(handler, "GET", "path="+path), 404, &path, "missing", nil)
	require.NoError(t, os.Mkdir(filepath.Join(root, filepath.FromSlash(path)), 0700))
	assertDocumentResponse(t, documentRequest(handler, "GET", "path="+path), 400, &path, "unsupported", nil)

	after := httptest.NewRecorder()
	handler.ServeHTTP(after, httptest.NewRequest("GET", "/api/workspace", nil))
	assert.Equal(t, before.Body.String(), after.Body.String(), "reader must not add standalone documents to discovery")
}

func TestDocumentAPIUnreadableParentIsNotMissing(t *testing.T) {
	root := t.TempDir()
	path := "private/topic.md"
	writeDocumentFixture(t, root, path, "PRIVATE_CONTENT")
	handler := documentContractHandler(t, root)
	directory := filepath.Join(root, "private")
	require.NoError(t, os.Chmod(directory, 0))
	t.Cleanup(func() { assert.NoError(t, os.Chmod(directory, 0700)) })
	if _, err := os.ReadDir(directory); err == nil {
		t.Skip("current user/filesystem does not enforce directory permission denial")
	} else {
		require.ErrorIs(t, err, os.ErrPermission)
	}

	response := documentRequest(handler, "GET", "path="+path)
	assertDocumentResponse(t, response, 403, &path, "unreadable", nil)
	assert.Contains(t, strings.ToLower(response.Body.String()), "permission")
	assert.NotContains(t, response.Body.String(), root, "errors must not disclose host paths")
	assert.NotContains(t, response.Body.String(), "PRIVATE_CONTENT")
}

func TestDocumentAPISymlinkRetargetedAfterDiscovery(t *testing.T) {
	fixture := t.TempDir()
	root := filepath.Join(fixture, "workspace")
	require.NoError(t, os.Mkdir(root, 0700))
	source := "# In workspace\n"
	writeDocumentFixture(t, root, "topic.md", source)
	writeDocumentFixture(t, fixture, "outside.md", "OUTSIDE_CONTENT")
	link := filepath.Join(root, "alias.md")
	require.NoError(t, os.Symlink("topic.md", link))
	handler := documentContractHandler(t, root)
	path := "alias.md"
	assertDocumentResponse(t, documentRequest(handler, "GET", "path="+path), 200, &path, "ok", &source)

	require.NoError(t, os.Remove(link))
	require.NoError(t, os.Symlink("../outside.md", link))
	response := documentRequest(handler, "GET", "path="+path)
	assertDocumentResponse(t, response, 403, &path, "forbidden", nil)
	assert.NotContains(t, response.Body.String(), "OUTSIDE_CONTENT")
	assert.NotContains(t, response.Body.String(), fixture)
}

func documentContractHandler(t *testing.T, root string) http.Handler {
	t.Helper()
	tree, reader, err := workspace.OpenWithReader(root)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, reader.Close()) })
	return server.Handler(fstest.MapFS{
		"index.html": {Data: []byte("<html>frontend must never replace API JSON</html>")},
	}, tree, reader)
}

func writeDocumentFixture(t *testing.T, root, path, source string) {
	t.Helper()
	file := filepath.Join(root, filepath.FromSlash(path))
	require.NoError(t, os.MkdirAll(filepath.Dir(file), 0700))
	require.NoError(t, os.WriteFile(file, []byte(source), 0600))
}

func documentRequest(handler http.Handler, method, query string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, "/api/document?"+query, nil)
	request.Header.Set("Accept", "text/html")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func assertDocumentResponse(t *testing.T, response *httptest.ResponseRecorder, code int, path *string, status string, source *string) {
	t.Helper()
	assert.Equal(t, code, response.Code, "body: %s", response.Body.String())
	assert.Equal(t, "application/json", response.Header().Get("Content-Type"))
	assert.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	var body map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body), "expected API JSON, not frontend HTML")
	require.Contains(t, body, "path")
	var actualPath *string
	require.NoError(t, json.Unmarshal(body["path"], &actualPath), "path must be a JSON string or explicit null")
	if path == nil {
		assert.Nil(t, actualPath)
	} else {
		require.NotNil(t, actualPath, "path must preserve the requested identity")
		assert.Equal(t, *path, *actualPath)
	}
	var actualStatus string
	require.NoError(t, json.Unmarshal(body["status"], &actualStatus))
	assert.Equal(t, status, actualStatus)
	if source != nil {
		var actualSource *string
		require.NoError(t, json.Unmarshal(body["source"], &actualSource), "source must be a JSON string")
		require.NotNil(t, actualSource, "source must be a JSON string, including for an empty read")
		assert.Equal(t, *source, *actualSource)
		assert.NotContains(t, body, "error", "successful read must not include error")
	} else {
		var reason string
		require.NoError(t, json.Unmarshal(body["error"], &reason))
		assert.NotEmpty(t, strings.TrimSpace(reason), "failure must have a nonempty error string")
		assert.NotContains(t, body, "source", "failed read must not include source")
	}
}
