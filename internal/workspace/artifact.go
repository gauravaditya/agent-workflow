package workspace

import (
	"net/url"
	"path"
	"regexp"
	"strings"
)

var (
	comments = regexp.MustCompile(`(?s)<!--.*?-->`)
	// Canonical Worktree links are inline Markdown links, optionally angle-wrapped.
	inlineLinks = regexp.MustCompile(`\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+"[^"\n]*")?\s*\)`)
	identity    = regexp.MustCompile(`^(REQ|TASK)-[0-9]+$`)
)

type artifact struct {
	Document
	text     string
	sections map[string]string
	headings []string
}

// prose excludes examples and authoring comments from structural interpretation.
func prose(source string) string {
	source = comments.ReplaceAllString(source, "")
	var lines []string
	fence := ""
	for _, line := range strings.Split(source, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "~~~") {
			marker := trimmed[:3]
			if fence == "" {
				fence = marker
			} else if marker == fence {
				fence = ""
			}
			continue
		}
		if fence == "" {
			lines = append(lines, line)
		}
	}
	return strings.Join(lines, "\n")
}

func parseArtifact(document Document, source string) artifact {
	a := artifact{Document: document, text: prose(source), sections: make(map[string]string)}
	section := ""
	for _, line := range strings.Split(a.text, "\n") {
		if strings.HasPrefix(line, "# ") && a.Title == "" {
			a.Title = strings.TrimSpace(strings.TrimPrefix(line, "# "))
		}
		if strings.HasPrefix(line, "## ") {
			section = strings.TrimSpace(strings.TrimPrefix(line, "## "))
			a.headings = append(a.headings, section)
		} else {
			a.sections[section] += line + "\n"
		}
	}
	return a
}

func links(text string) []string {
	text = maskInlineCode(text)
	var result []string
	for _, match := range inlineLinks.FindAllStringSubmatch(text, -1) {
		target := match[1]
		if target == "" {
			target = match[2]
		}
		result = append(result, target)
	}
	return result
}

// Code spans close with a backtick run of exactly the opening length. Mask
// matched spans rather than deleting them, so surrounding text cannot join into
// a synthetic link. Unmatched and escaped opening backticks remain literal.
func maskInlineCode(text string) string {
	masked := []byte(text)
	for start := 0; start < len(text); {
		if text[start] == '\\' {
			start += 2
			continue
		}
		if text[start] != '`' {
			start++
			continue
		}
		openingEnd := backtickEnd(text, start)
		next := openingEnd
		for closing := openingEnd; closing < len(text); {
			if text[closing] != '`' {
				closing++
				continue
			}
			closingEnd := backtickEnd(text, closing)
			if closingEnd-closing == openingEnd-start {
				for i := start; i < closingEnd; i++ {
					if masked[i] != '\n' {
						masked[i] = ' '
					}
				}
				next = closingEnd
				break
			}
			closing = closingEnd
		}
		start = next
	}
	return string(masked)
}

func backtickEnd(text string, start int) int {
	end := start
	for end < len(text) && text[end] == '`' {
		end++
	}
	return end
}

// resolveLink resolves within the project, never into the embedded asset FS or
// an arbitrary host path. External/outside-workspace interactions belong to TASK-005.
func resolveLink(source, target string) (string, bool) {
	u, err := url.Parse(target)
	if err != nil || u.IsAbs() || u.Host != "" || strings.Contains(u.Path, "\\") || strings.HasPrefix(u.Path, "/") {
		return "", false
	}
	if u.Path == "" {
		return source, true
	}
	resolved := path.Clean(path.Join(path.Dir(source), u.Path))
	return resolved, resolved != ".." && !strings.HasPrefix(resolved, "../")
}

func (a artifact) metadataLines(label string) []string {
	var result []string
	for _, line := range strings.Split(a.sections[""], "\n") {
		if strings.HasPrefix(line, label+":") {
			result = append(result, line)
		}
	}
	return result
}

func (a artifact) metadataLink(label string) string {
	lines := a.metadataLines(label)
	if len(lines) != 1 {
		return ""
	}
	found := links(lines[0])
	if len(found) == 1 {
		return found[0]
	}
	return ""
}
