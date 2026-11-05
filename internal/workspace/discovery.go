package workspace

import (
	"bytes"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"
	"unicode/utf8"
)

type discovery struct {
	files     fs.FS
	tree      *Snapshot
	documents map[string]artifact
	issues    map[Issue]bool
	taskIDs   map[string]string
}

func discover(files fs.FS, name string) *Snapshot {
	d := &discovery{
		files:     files,
		tree:      &Snapshot{Name: name, Requirements: []Requirement{}, Issues: []Issue{}},
		documents: make(map[string]artifact), issues: make(map[Issue]bool), taskIDs: make(map[string]string),
	}
	project := d.read(".worktree/project.md", "project", "")
	d.tree.Document = project.Document
	if project.Title != "" {
		d.tree.Name = project.Title
	}
	for _, id := range d.directories(".worktree/requirements", "REQ-") {
		requirement := d.requirement(id)
		d.tree.Requirements = append(d.tree.Requirements, requirement)
		if project.Readable && !hasLink(project, project.text, requirement.Document.Path) {
			d.issue(requirement.Document.Path, "Requirement is not linked from project.md; its physical location remains browsable")
		}
	}
	for _, a := range d.documents {
		if !a.Readable {
			continue
		}
		for _, target := range links(a.text) {
			resolved, internal := resolveLink(a.Path, target)
			if !internal {
				continue
			}
			if _, err := d.statExact(resolved); err != nil {
				d.issue(a.Path, fmt.Sprintf("Link target %q is unavailable: %v", target, err))
			}
		}
	}
	sort.Slice(d.tree.Issues, func(i, j int) bool {
		a, b := d.tree.Issues[i], d.tree.Issues[j]
		if a.Path == b.Path {
			return a.Message < b.Message
		}
		return a.Path < b.Path
	})
	return d.tree
}

func (d *discovery) issue(source, message string) {
	i := Issue{Path: source, Message: message}
	if !d.issues[i] {
		d.tree.Issues = append(d.tree.Issues, i)
		d.issues[i] = true
	}
}

func (d *discovery) directories(source, prefix string) []string {
	if _, err := d.statExact(source); err != nil {
		d.issue(source, fmt.Sprintf("Cannot discover artifacts: %v", err))
		return nil
	}
	entries, err := fs.ReadDir(d.files, source)
	if err != nil {
		d.issue(source, fmt.Sprintf("Cannot discover artifacts: %v", err))
		return nil
	}
	var result []string
	for _, entry := range entries {
		if !strings.HasPrefix(entry.Name(), prefix) {
			continue
		}
		full := path.Join(source, entry.Name())
		info, err := d.statExact(full)
		if err != nil || !info.IsDir() {
			d.issue(full, "Expected an accessible artifact directory")
			continue
		}
		if !identity.MatchString(entry.Name()) {
			d.issue(full, "Directory does not use an established requirement/task ID")
			continue
		}
		result = append(result, entry.Name())
	}
	return result
}

func (d *discovery) read(source, kind, id string) artifact {
	doc := Document{Path: source, Kind: kind}
	info, err := d.statExact(source)
	if err != nil {
		d.issue(source, fmt.Sprintf("Document is unavailable: %v", err))
		return artifact{Document: doc}
	}
	if !info.Mode().IsRegular() {
		d.issue(source, "Expected a regular Markdown file")
		return artifact{Document: doc}
	}
	content, err := fs.ReadFile(d.files, source)
	if err != nil {
		d.issue(source, fmt.Sprintf("Cannot read document: %v", err))
		return artifact{Document: doc}
	}
	if !utf8.Valid(content) || bytes.ContainsRune(content, 0) {
		d.issue(source, "Document is not readable UTF-8 Markdown")
		return artifact{Document: doc}
	}
	doc.Readable = true
	a := parseArtifact(doc, string(content))
	a.TemplateValid = d.validate(a, id)
	d.documents[source] = a
	return a
}

// Native macOS/Windows filesystems may ignore case. The Markdown workspace
// contract does not: check actual directory entries before reading a path.
func (d *discovery) statExact(source string) (fs.FileInfo, error) {
	if source == "." {
		return fs.Stat(d.files, source)
	}
	parent := "."
	if !fs.ValidPath(source) {
		return nil, &fs.PathError{Op: "stat", Path: source, Err: fs.ErrInvalid}
	}
	for _, part := range strings.Split(source, "/") {
		entries, err := fs.ReadDir(d.files, parent)
		if err != nil {
			return nil, err
		}
		found := false
		for _, entry := range entries {
			found = found || entry.Name() == part
		}
		if !found {
			return nil, &fs.PathError{Op: "stat (exact case)", Path: source, Err: fs.ErrNotExist}
		}
		parent = path.Join(parent, part)
	}
	return fs.Stat(d.files, source)
}

func (d *discovery) validate(a artifact, id string) bool {
	valid := true
	problem := func(message string) { valid = false; d.issue(a.Path, message) }
	if a.Title == "" {
		problem("Missing document title (# heading)")
	} else if id != "" && !strings.HasPrefix(a.Title, id+" — ") {
		problem("Title ID does not match directory identity " + id)
	}
	var required []string
	switch a.Kind {
	case "requirement":
		required = []string{"Intent", "Desired outcome", "Scope", "Tasks"}
	case "task":
		required = []string{"Purpose", "Scope", "Expected outcome", "Implementation brief"}
	case "implementation":
		required = []string{"Objective", "Context and sources", "Required work", "Constraints and exclusions", "Acceptance criteria", "Verification and handoff"}
	}
	previous := -1
	allowed := map[string]bool{"Open questions": true}
	if a.Kind == "task" || a.Kind == "implementation" {
		allowed["Supporting material"] = true
	}
	for _, heading := range required {
		allowed[heading] = true
	}
	if a.Kind != "project" {
		for _, heading := range a.headings {
			if !allowed[heading] {
				problem("Unexpected section outside the canonical template: " + heading)
			}
		}
	}
	for _, heading := range required {
		position := -1
		for i, actual := range a.headings {
			if actual == heading {
				if position != -1 {
					problem("Repeated required section: " + heading)
				}
				position = i
			}
		}
		if position == -1 {
			problem("Missing required section: " + heading)
		} else {
			if position < previous {
				problem("Required section is out of order: " + heading)
			}
			previous = position
			if strings.TrimSpace(a.sections[heading]) == "" {
				problem("Required section is empty: " + heading)
			}
		}
	}
	for _, label := range []string{"Requirement", "Task", "Review state"} {
		if len(a.metadataLines(label)) > 1 {
			problem("Duplicate metadata field: " + label)
		}
	}
	if (a.Kind == "task" || a.Kind == "implementation") && len(a.metadataLines("Requirement")) <= 1 {
		if len(a.metadataLines("Requirement")) == 0 {
			problem("Missing canonical Requirement: metadata field; use the exact label Requirement:")
		} else {
			parent := path.Clean(path.Join(path.Dir(a.Path), "../../req.md"))
			link := a.metadataLink("Requirement")
			target, ok := resolveLink(a.Path, link)
			if link == "" || !ok || target != parent {
				problem("Invalid Requirement: metadata; expected a Markdown link to the containing requirement's req.md (../../req.md)")
			}
		}
	}
	if a.Kind == "implementation" && len(a.metadataLines("Task")) <= 1 {
		target, ok := resolveLink(a.Path, a.metadataLink("Task"))
		if a.metadataLink("Task") == "" || !ok || target != path.Join(path.Dir(a.Path), "task.md") {
			problem("Task metadata must link to this task's task.md")
		}
	}
	if a.Kind == "task" {
		if !hasLink(a, a.sections["Implementation brief"], path.Join(path.Dir(a.Path), "implementation.md")) {
			problem("Implementation brief section must link to this task's implementation.md")
		}
	}
	return valid
}

func hasLink(a artifact, text, expected string) bool {
	for _, link := range links(text) {
		target, ok := resolveLink(a.Path, link)
		if ok && target == expected {
			return true
		}
	}
	return false
}

func (d *discovery) requirement(id string) Requirement {
	base := path.Join(".worktree/requirements", id)
	a := d.read(path.Join(base, "req.md"), "requirement", id)
	r := Requirement{ID: id, Title: a.Title, Document: a.Document, Tasks: []Task{}}
	known := make(map[string]Task)
	ids := d.directories(path.Join(base, "tasks"), "TASK-")
	for _, taskID := range ids {
		folder := path.Join(base, "tasks", taskID)
		if other, exists := d.taskIDs[taskID]; exists {
			d.issue(folder, "Duplicate task identity; also found at "+other)
			d.issue(other, "Duplicate task identity; also found at "+folder)
		}
		d.taskIDs[taskID] = folder
		task := d.read(path.Join(folder, "task.md"), "task", taskID)
		implementation := d.read(path.Join(folder, "implementation.md"), "implementation", taskID)
		known[taskID] = Task{ID: taskID, Title: task.Title, Documents: []Document{task.Document, implementation.Document}}
	}
	// Navigation display includes unlisted physical tasks so usable files are not
	// hidden. Only TaskOrder carries source-authoritative sequence; nil means the
	// ordering source was missing or ambiguous. No sequential navigation is built.
	order, ordered := d.taskOrder(a, known)
	if ordered {
		r.TaskOrder = order
	} else {
		order = nil
	}
	shown := make(map[string]bool)
	for _, taskID := range order {
		r.Tasks = append(r.Tasks, known[taskID])
		shown[taskID] = true
	}
	for _, taskID := range ids {
		if !shown[taskID] {
			d.issue(path.Join(base, "tasks", taskID, "task.md"), "Task is not unambiguously listed in the requirement's Tasks section; no sequential position is inferred")
			r.Tasks = append(r.Tasks, known[taskID])
		}
	}
	return r
}

func (d *discovery) taskOrder(a artifact, known map[string]Task) ([]string, bool) {
	order := []string{}
	count := 0
	for _, heading := range a.headings {
		if heading == "Tasks" {
			count++
		}
	}
	if !a.Readable || count != 1 || strings.TrimSpace(a.sections["Tasks"]) == "" {
		return order, false
	}
	taskLinks := links(a.sections["Tasks"])
	if len(taskLinks) == 0 {
		d.issue(a.Path, "Tasks section contains no recognized task links; authoritative ordering is unknown")
		return order, false
	}
	seen := make(map[string]bool)
	valid := true
	for _, link := range taskLinks {
		target, ok := resolveLink(a.Path, link)
		taskID := path.Base(path.Dir(target))
		expected := path.Join(path.Dir(a.Path), "tasks", taskID, "task.md")
		task, exists := known[taskID]
		if !ok || target != expected || !exists || !task.Documents[0].Readable || seen[taskID] {
			d.issue(a.Path, "Tasks section contains an unavailable, noncanonical, or duplicate task link: "+link)
			valid = false
			continue
		}
		seen[taskID] = true
		order = append(order, taskID)
	}
	return order, valid
}
