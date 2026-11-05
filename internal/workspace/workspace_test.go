package workspace_test

import (
	"crypto/sha256"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"worktree/internal/workspace"
)

func write(t *testing.T, root, name, content string) {
	t.Helper()
	full := filepath.Join(root, filepath.FromSlash(name))
	if err := os.MkdirAll(filepath.Dir(full), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(full, []byte(content), 0600); err != nil {
		t.Fatal(err)
	}
}

func TestReadableRootOpensDespiteMissingArtifacts(t *testing.T) {
	root := t.TempDir()
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if tree.Document.Readable || len(tree.Issues) < 2 || tree.Requirements == nil {
		t.Fatalf("expected empty hierarchy and non-blocking missing artifact issues: %+v", tree)
	}
}

func TestDiscoveryPreservesTaskLinkOrderAndMalformedReadableContent(t *testing.T) {
	root := t.TempDir()
	req := ".worktree/requirements/REQ-002/req.md"
	first := ".worktree/requirements/REQ-002/tasks/TASK-004/"
	second := ".worktree/requirements/REQ-002/tasks/TASK-005/"
	write(t, root, ".worktree/project.md", "# Example\n\n[Requirement](requirements/REQ-002/req.md)\n")
	write(t, root, req, "# REQ-002 — Browsing\n\n## Intent\nintent\n## Desired outcome\noutcome\n## Scope\nscope\n## Tasks\n- [Second](tasks/TASK-005/task.md)\n- [First](tasks/TASK-004/task.md)\n")
	write(t, root, first+"task.md", "# Free-form task\nReadable **content**.\n[Broken](missing.md)\n")
	write(t, root, second+"task.md", "# TASK-005 — Reading\n\nRequirement: [Parent](../../req.md)\n\n## Purpose\npurpose\n## Scope\nscope\n## Expected outcome\noutcome\n## Implementation brief\n[Implementation](implementation.md)\n")
	write(t, root, second+"implementation.md", "Readable non-template implementation\n")
	before := fileHashes(t, root)
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if tree.Name != "Example" || len(tree.Requirements) != 1 {
		t.Fatalf("unexpected hierarchy: %+v", tree)
	}
	r := tree.Requirements[0]
	if strings.Join(r.TaskOrder, ",") != "TASK-005,TASK-004" || r.Tasks[0].ID != "TASK-005" {
		t.Fatalf("lost source link order: %+v", r)
	}
	if !r.Tasks[0].Documents[0].TemplateValid || !r.Tasks[1].Documents[0].Readable || r.Tasks[1].Documents[0].TemplateValid || r.Tasks[1].Documents[1].Readable {
		t.Fatalf("did not distinguish format from availability: %+v", r.Tasks)
	}
	if len(tree.Issues) < 3 {
		t.Fatalf("missing malformed/broken/missing issues: %+v", tree.Issues)
	}
	after := fileHashes(t, root)
	if len(before) != len(after) {
		t.Fatal("discovery created or deleted source files")
	}
	for path, hash := range before {
		if after[path] != hash {
			t.Fatalf("discovery changed %s", path)
		}
	}
}

func fileHashes(t *testing.T, root string) map[string][32]byte {
	t.Helper()
	result := make(map[string][32]byte)
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() {
			content, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			result[path] = sha256.Sum256(content)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func TestOpenRejectsInaccessibleRoots(t *testing.T) {
	root := t.TempDir()
	file := filepath.Join(root, "file")
	if err := os.WriteFile(file, []byte("not a directory"), 0600); err != nil {
		t.Fatal(err)
	}
	for _, directory := range []string{filepath.Join(root, "missing"), file} {
		t.Run(filepath.Base(directory), func(t *testing.T) {
			_, err := workspace.Open(directory)
			if err == nil || !strings.Contains(err.Error(), directory) {
				t.Fatalf("expected actionable path error, got %v", err)
			}
		})
	}
}

func TestOpenRejectsUnreadableDirectory(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix permission fixture; Windows ACL behavior needs a Windows environment")
	}
	root := t.TempDir()
	if err := os.Chmod(root, 0000); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(root, 0700) })
	if _, err := os.ReadDir(root); err == nil {
		t.Skip("test user bypasses directory read permissions")
	}
	if _, err := workspace.Open(root); err == nil || !strings.Contains(err.Error(), "permissions") {
		t.Fatalf("expected permission guidance, got %v", err)
	}
}

func TestDiscoveryDoesNotFollowWorkspaceEscapingSymlink(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(t.TempDir(), "project.md")
	if err := os.WriteFile(outside, []byte("# Outside secret"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(root, ".worktree"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(root, ".worktree/project.md")); err != nil {
		t.Skipf("symlink fixture unavailable: %v", err)
	}
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if tree.Document.Readable || tree.Name == "Outside secret" || len(tree.Issues) == 0 {
		t.Fatalf("workspace escaped its root: %+v", tree)
	}
}

func TestAmbiguousTaskOrderAndDuplicateIDsAreReported(t *testing.T) {
	root := t.TempDir()
	for _, id := range []string{"REQ-001", "REQ-002"} {
		base := ".worktree/requirements/" + id + "/"
		write(t, root, base+"req.md", "# "+id+" — Example\n## Tasks\n[Task](tasks/TASK-001/task.md)\n[Duplicate](tasks/TASK-001/task.md)\n")
		write(t, root, base+"tasks/TASK-001/task.md", "# TASK-001 — Readable\n")
	}
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	for _, requirement := range tree.Requirements {
		if requirement.TaskOrder != nil || !requirement.Tasks[0].Documents[0].Readable {
			t.Fatalf("invented task sequence or hid readable content: %+v", requirement)
		}
	}
	found := false
	for _, issue := range tree.Issues {
		found = found || strings.Contains(issue.Message, "Duplicate task identity")
	}
	if !found {
		t.Fatalf("duplicate identity not reported: %+v", tree.Issues)
	}
}

func TestDiscoveryIgnoresAuthoringCommentsAndFencedExamples(t *testing.T) {
	root := t.TempDir()
	write(t, root, ".worktree/project.md", "# Project\n<!-- [Not a real link](missing-comment.md) -->\n```markdown\n[Example](missing-example.md)\n```\n")
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	for _, issue := range tree.Issues {
		if strings.Contains(issue.Message, "missing-comment") || strings.Contains(issue.Message, "missing-example") {
			t.Fatalf("reported an illustrative link as live: %+v", issue)
		}
	}
}

func TestMissingProjectRelationshipAndInvalidMetadataAreIssuesNotRejections(t *testing.T) {
	root := t.TempDir()
	write(t, root, ".worktree/project.md", "# Project\n")
	base := ".worktree/requirements/REQ-001/"
	write(t, root, base+"req.md", "# REQ-001 — Requirement\n## Intent\nIntent\n## Desired outcome\nOutcome\n## Scope\nScope\n## Tasks\n[Task](tasks/TASK-001/task.md)\n")
	write(t, root, base+"tasks/TASK-001/task.md", "# TASK-001 — Task\nRequirement: [Wrong parent](../../../../project.md)\n## Purpose\nPurpose\n## Scope\nScope\n## Expected outcome\nOutcome\n## Implementation brief\n[Brief](implementation.md)\n## Invented section\nExtra\n")
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if !tree.Requirements[0].Tasks[0].Documents[0].Readable || tree.Requirements[0].Tasks[0].Documents[0].TemplateValid {
		t.Fatalf("invalid metadata should not hide readable content: %+v", tree)
	}
	for _, expected := range []string{"not linked from project.md", "Invalid Requirement: metadata", "Unexpected section"} {
		found := false
		for _, issue := range tree.Issues {
			found = found || strings.Contains(issue.Message, expected)
		}
		if !found {
			t.Errorf("missing %q issue: %+v", expected, tree.Issues)
		}
	}
}

func TestCanonicalWorkspaceCanBeDiscoveredWithReadOnlySourceFiles(t *testing.T) {
	root := t.TempDir()
	base := ".worktree/requirements/REQ-001/"
	folder := base + "tasks/TASK-001/"
	write(t, root, ".worktree/project.md", "# Project\n[Requirement](requirements/REQ-001/req.md)\n")
	write(t, root, base+"req.md", "# REQ-001 — Requirement\n## Intent\nIntent\n## Desired outcome\nOutcome\n## Scope\nScope\n## Tasks\n[Task](tasks/TASK-001/task.md)\n")
	write(t, root, folder+"task.md", "# TASK-001 — Task\nRequirement: [Parent](../../req.md)\n## Purpose\nPurpose\n## Scope\nScope\n## Expected outcome\nOutcome\n## Implementation brief\n[Brief](implementation.md)\n")
	write(t, root, folder+"implementation.md", "# TASK-001 — Implementation brief: Task\nRequirement: [Parent](../../req.md)\nTask: [Task](task.md)\n## Objective\nObjective\n## Context and sources\nContext\n## Required work\nWork\n## Constraints and exclusions\nConstraints\n## Acceptance criteria\nCriteria\n## Verification and handoff\nVerification\n")
	before := fileHashes(t, root)
	for file := range before {
		if err := os.Chmod(file, 0444); err != nil {
			t.Fatal(err)
		}
	}
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(tree.Issues) != 0 || !tree.Requirements[0].Tasks[0].Documents[1].TemplateValid {
		t.Fatalf("canonical sources were rejected: %+v", tree)
	}
	after := fileHashes(t, root)
	if len(before) != len(after) {
		t.Fatal("source paths changed")
	}
	for file, hash := range before {
		if after[file] != hash {
			t.Fatalf("source bytes changed: %s", file)
		}
	}
}

func TestUnreadableAndNonUTF8DocumentsRemainDistinctFromTemplateProblems(t *testing.T) {
	root := t.TempDir()
	write(t, root, ".worktree/project.md", string([]byte{0xff, 0x00}))
	tree, err := workspace.Open(root)
	if err != nil || tree.Document.Readable {
		t.Fatalf("binary document should not be selectable: %v %+v", err, tree)
	}
	if runtime.GOOS == "windows" {
		t.Skip("Unix permission fixture")
	}
	write(t, root, ".worktree/project.md", "# Readable title\n")
	file := filepath.Join(root, ".worktree/project.md")
	if err := os.Chmod(file, 0000); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(file, 0600) })
	if _, err := os.ReadFile(file); err == nil {
		t.Skip("test user bypasses file permissions")
	}
	tree, err = workspace.Open(root)
	if err != nil || tree.Document.Readable {
		t.Fatalf("unreadable document must not block root opening or be selectable: %v %+v", err, tree)
	}
}

func TestCanonicalFilenamesUseExactCaseEvenOnCaseInsensitiveFilesystems(t *testing.T) {
	root := t.TempDir()
	write(t, root, ".worktree/Project.md", "# Wrong-case filename\n")
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if tree.Document.Readable {
		t.Fatal("Project.md must not silently become canonical project.md")
	}
}

func TestTaskOrderIsUnknownWithoutRecognizedTaskLinks(t *testing.T) {
	root := t.TempDir()
	base := ".worktree/requirements/REQ-001/"
	write(t, root, base+"req.md", "# REQ-001 — Example\n## Tasks\nTasks have not been linked yet.\n")
	write(t, root, base+"tasks/TASK-001/task.md", "# TASK-001 — Still discoverable\n")
	tree, err := workspace.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	r := tree.Requirements[0]
	if r.TaskOrder != nil || len(r.Tasks) != 1 || !r.Tasks[0].Documents[0].Readable {
		t.Fatalf("unknown ordering must not hide the physical task: %+v", r)
	}
	assertIssue(t, tree, base+"req.md", "no recognized task links")
}

func TestTaskOrderRequiresReadableTaskBrief(t *testing.T) {
	for _, mode := range []string{"missing", "unreadable"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			base := ".worktree/requirements/REQ-001/"
			folder := base + "tasks/TASK-001/"
			write(t, root, base+"req.md", "# REQ-001 — Example\n## Tasks\n[Task](tasks/TASK-001/task.md)\n")
			write(t, root, folder+"implementation.md", "Readable implementation stays discoverable\n")
			if mode == "unreadable" {
				if runtime.GOOS == "windows" {
					t.Skip("Unix permission fixture; Windows ACL behavior needs Windows")
				}
				write(t, root, folder+"task.md", "# TASK-001 — Unreadable\n")
				file := filepath.Join(root, filepath.FromSlash(folder+"task.md"))
				if err := os.Chmod(file, 0000); err != nil {
					t.Fatal(err)
				}
				t.Cleanup(func() { _ = os.Chmod(file, 0600) })
				if _, err := os.ReadFile(file); err == nil {
					t.Skip("test user bypasses file permissions")
				}
			}
			tree, err := workspace.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			r := tree.Requirements[0]
			if r.TaskOrder != nil || len(r.Tasks) != 1 || r.Tasks[0].Documents[0].Readable || !r.Tasks[0].Documents[1].Readable {
				t.Fatalf("directory alone must not establish ordering: %+v", r)
			}
			assertIssue(t, tree, base+"req.md", "unavailable")
		})
	}
}

func assertIssue(t *testing.T, tree *workspace.Snapshot, source, message string) {
	t.Helper()
	for _, issue := range tree.Issues {
		if issue.Path == source && strings.Contains(issue.Message, message) {
			return
		}
	}
	t.Errorf("expected issue for %s containing %q: %+v", source, message, tree.Issues)
}

func TestOptionalSectionsAreSpecificToDocumentType(t *testing.T) {
	requirement := "# REQ-001 — Example\n## Intent\nIntent\n## Desired outcome\nOutcome\n## Scope\nScope\n## Tasks\n[Task](tasks/TASK-001/task.md)\n"
	task := "# TASK-001 — Example\nRequirement: [Parent](../../req.md)\n## Purpose\nPurpose\n## Scope\nScope\n## Expected outcome\nOutcome\n## Implementation brief\n[Brief](implementation.md)\n"
	implementation := "# TASK-001 — Implementation brief: Example\nRequirement: [Parent](../../req.md)\nTask: [Task](task.md)\n## Objective\nObjective\n## Context and sources\nContext\n## Required work\nWork\n## Constraints and exclusions\nConstraints\n## Acceptance criteria\nCriteria\n## Verification and handoff\nVerification\n"
	for _, tc := range []struct {
		name, kind, heading string
		valid               bool
	}{
		{"requirement open questions", "requirement", "Open questions", true},
		{"requirement supporting material", "requirement", "Supporting material", false},
		{"task supporting material", "task", "Supporting material", true},
		{"task open questions", "task", "Open questions", true},
		{"implementation supporting material", "implementation", "Supporting material", true},
		{"implementation open questions", "implementation", "Open questions", true},
		{"requirement rejects task section", "requirement", "Purpose", false},
		{"task rejects requirement section", "task", "Intent", false},
		{"implementation rejects task section", "implementation", "Expected outcome", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			base := ".worktree/requirements/REQ-001/"
			folder := base + "tasks/TASK-001/"
			paths := map[string]string{"requirement": base + "req.md", "task": folder + "task.md", "implementation": folder + "implementation.md"}
			contents := map[string]string{"requirement": requirement, "task": task, "implementation": implementation}
			contents[tc.kind] += "## " + tc.heading + "\nOptional content\n"
			for kind, content := range contents {
				write(t, root, paths[kind], content)
			}
			tree, err := workspace.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			r := tree.Requirements[0]
			documents := map[string]workspace.Document{"requirement": r.Document, "task": r.Tasks[0].Documents[0], "implementation": r.Tasks[0].Documents[1]}
			document := documents[tc.kind]
			if !document.Readable || document.TemplateValid != tc.valid {
				t.Fatalf("optional sections misclassified: %+v, issues=%+v", document, tree.Issues)
			}
			if !tc.valid {
				assertIssue(t, tree, paths[tc.kind], "Unexpected section outside the canonical template: "+tc.heading)
			}
		})
	}
}

func TestDuplicateMetadataIsReportedWithoutChoosingAnOccurrence(t *testing.T) {
	for _, tc := range []struct {
		name, filename, label, metadata string
	}{
		{"task same parent twice", "task.md", "Requirement", "Requirement: [Parent](../../req.md)\nRequirement: [Parent again](../../req.md)\n"},
		{"task conflicting parents", "task.md", "Requirement", "Requirement: [Parent](../../req.md)\nRequirement: [Other](../../../../project.md)\n"},
		{"implementation same task twice", "implementation.md", "Task", "Requirement: [Parent](../../req.md)\nTask: [Task](task.md)\nTask: [Task again](task.md)\n"},
		{"implementation conflicting tasks", "implementation.md", "Task", "Requirement: [Parent](../../req.md)\nTask: [Task](task.md)\nTask: [Other](implementation.md)\n"},
		{"implementation duplicate parents", "implementation.md", "Requirement", "Requirement: [Parent](../../req.md)\nRequirement: [Parent again](../../req.md)\nTask: [Task](task.md)\n"},
		{"duplicate optional review note", "task.md", "Review state", "Requirement: [Parent](../../req.md)\nReview state: First note\nReview state: Second note\n"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			base := ".worktree/requirements/REQ-001/"
			folder := base + "tasks/TASK-001/"
			write(t, root, base+"req.md", "# REQ-001 — Example\n## Tasks\n[Task](tasks/TASK-001/task.md)\n")
			body := "## Purpose\nPurpose\n## Scope\nScope\n## Expected outcome\nOutcome\n## Implementation brief\n[Brief](implementation.md)\n"
			if tc.filename == "implementation.md" {
				write(t, root, folder+"task.md", "# TASK-001 — Task\n")
				body = "## Objective\nObjective\n## Context and sources\nContext\n## Required work\nWork\n## Constraints and exclusions\nConstraints\n## Acceptance criteria\nCriteria\n## Verification and handoff\nVerification\n"
			}
			write(t, root, folder+tc.filename, "# TASK-001 — Example\n"+tc.metadata+body)
			before := fileHashes(t, root)
			tree, err := workspace.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			for _, document := range tree.Requirements[0].Tasks[0].Documents {
				if document.Path == folder+tc.filename && (!document.Readable || document.TemplateValid) {
					t.Fatalf("duplicate metadata must invalidate format, not readability: %+v", document)
				}
			}
			assertIssue(t, tree, folder+tc.filename, "Duplicate metadata field: "+tc.label)
			after := fileHashes(t, root)
			if len(before) != len(after) {
				t.Fatal("source paths changed")
			}
			for file, hash := range before {
				if after[file] != hash {
					t.Fatalf("source bytes changed: %s", file)
				}
			}
		})
	}
}

func TestInlineCodeDoesNotCreateLiveMarkdownLinks(t *testing.T) {
	for _, tc := range []struct{ name, source string }{
		{"single backticks", "`[Example](not-a-live-link.md)`"},
		{"double backticks", "``[Example](not-a-live-link.md) and `literal` ticks``"},
		{"multiline span", "`An example\n[Example](not-a-live-link.md)\nends here`"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			write(t, root, ".worktree/project.md", "# Project\n"+tc.source+"\n")
			tree, err := workspace.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			for _, issue := range tree.Issues {
				if issue.Path == ".worktree/project.md" {
					t.Fatalf("inline code produced an issue: %+v", issue)
				}
			}
		})
	}
}

func TestGenuineLinksArePreservedBesideInlineCode(t *testing.T) {
	for _, tc := range []struct{ name, source string }{
		{"adjacent spans", "[Before](before.md)`[Example](ignored.md)`[After](after.md)"},
		{"code in link label", "[`Label`](before.md) `[Example](ignored.md)` [After](after.md)"},
		{"unclosed backtick is literal", "`unfinished [Before](before.md) [After](after.md)"},
		{"escaped backticks are literal", "\\`[Before](before.md)\\` [After](after.md)"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			write(t, root, ".worktree/project.md", "# Project\n"+tc.source+"\n")
			tree, err := workspace.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			for _, target := range []string{"before.md", "after.md"} {
				assertIssue(t, tree, ".worktree/project.md", "Link target \""+target+"\" is unavailable")
			}
			for _, issue := range tree.Issues {
				if strings.Contains(issue.Message, "ignored.md") {
					t.Fatalf("code example treated as a link: %+v", issue)
				}
			}
		})
	}
}

func TestRequirementMetadataDistinguishesMissingFieldsFromInvalidLinks(t *testing.T) {
	for _, tc := range []struct {
		name, metadata, expected string
		valid                    bool
	}{
		{"missing", "", "Missing canonical Requirement: metadata field", false},
		{"unrecognized alias", "Parent requirement: [Parent](../../req.md)\n", "Missing canonical Requirement: metadata field", false},
		{"present without link", "Requirement: REQ-001\n", "Invalid Requirement: metadata", false},
		{"present with code example", "Requirement: `[Parent](../../req.md)`\n", "Invalid Requirement: metadata", false},
		{"wrong parent", "Requirement: [Other](../../../../project.md)\n", "Invalid Requirement: metadata", false},
		{"outside workspace", "Requirement: [Other](../../../../../../outside.md)\n", "Invalid Requirement: metadata", false},
		{"valid relative parent", "Requirement: [Parent](../../req.md)\n", "", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			base := ".worktree/requirements/REQ-001/"
			folder := base + "tasks/TASK-001/"
			write(t, root, base+"req.md", "# REQ-001 — Example\n## Tasks\n[Task](tasks/TASK-001/task.md)\n")
			write(t, root, folder+"task.md", "# TASK-001 — Example\n"+tc.metadata+"## Purpose\nPurpose\n## Scope\nScope\n## Expected outcome\nOutcome\n## Implementation brief\n[Brief](implementation.md)\n")
			before := fileHashes(t, root)
			tree, err := workspace.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			document := tree.Requirements[0].Tasks[0].Documents[0]
			if !document.Readable || document.TemplateValid != tc.valid {
				t.Fatalf("incorrect metadata classification: %+v", document)
			}
			if !tc.valid {
				assertIssue(t, tree, folder+"task.md", tc.expected)
			}
			for _, issue := range tree.Issues {
				if issue.Path == folder+"task.md" {
					if strings.HasPrefix(issue.Message, "Missing canonical Requirement:") && tc.expected != "Missing canonical Requirement: metadata field" {
						t.Errorf("present field reported missing: %+v", issue)
					}
					if strings.HasPrefix(issue.Message, "Invalid Requirement:") && tc.expected != "Invalid Requirement: metadata" {
						t.Errorf("missing field reported as invalid link: %+v", issue)
					}
				}
			}
			after := fileHashes(t, root)
			if len(before) != len(after) {
				t.Fatal("source paths changed")
			}
			for file, hash := range before {
				if after[file] != hash {
					t.Fatalf("source bytes changed: %s", file)
				}
			}
		})
	}
}
