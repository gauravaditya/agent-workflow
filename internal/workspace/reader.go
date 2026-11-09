package workspace

import (
	"errors"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

// Reader borrows no discovery state. Its retained OS root confines every read,
// including when directory entries or symlinks change after discovery.
// The owner must Close it after HTTP requests have drained.
type Reader struct {
	root     *os.Root
	rootPath string
}

// ReadError classifies an access failure independently of its human-readable
// reason. Error omits filesystem paths; Unwrap retains the underlying cause.
type ReadError struct {
	Kind ReadFailure
	err  error
}

func (e *ReadError) Error() string {
	err := e.err
	for {
		switch cause := err.(type) {
		case *fs.PathError:
			err = cause.Err
		case *os.LinkError:
			err = cause.Err
		default:
			return err.Error()
		}
	}
}

func (e *ReadError) Unwrap() error { return e.err }

// Close releases the workspace root. It does not change any workspace file.
func (r *Reader) Close() error { return r.root.Close() }

// Read returns original UTF-8 Markdown, including an empty successful string.
// The caller retains the requested identity; resolved paths stay internal.
func (r *Reader) Read(name string) (source string, err error) {
	if absoluteDocumentPath(name) || escapingDocumentPath(name) {
		return "", &ReadError{ReadForbidden, errors.New("destination is outside the selected workspace")}
	}
	if name == "" || strings.ContainsAny(name, "\\\x00") || hasURIScheme(name) {
		return "", &ReadError{ReadUnsupported, errors.New("unsupported document destination")}
	}
	if path.Ext(name) != ".md" {
		return "", &ReadError{ReadUnsupported, errors.New("only regular .md files are supported (case-sensitive extension)")}
	}
	target, info, err := r.resolve(name)
	if err != nil {
		return "", err
	}
	if path.Ext(target) != ".md" || !info.Mode().IsRegular() {
		return "", &ReadError{ReadUnsupported, errors.New("destination is not a regular Markdown file")}
	}
	// Nonblocking open on Unix also prevents a concurrent replacement with a
	// FIFO from hanging the request. Check the opened descriptor before reading.
	file, err := r.root.OpenFile(target, documentReadFlags, 0)
	if err != nil {
		return "", accessFailure(err)
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil && err == nil {
			source, err = "", accessFailure(closeErr)
		}
	}()
	opened, err := file.Stat()
	if err != nil {
		return "", accessFailure(err)
	}
	if !opened.Mode().IsRegular() {
		return "", &ReadError{ReadUnsupported, errors.New("destination is not a regular Markdown file")}
	}
	// Recheck exact spelling and resolved identity after open. The OS root, not
	// this check, is the security boundary against concurrent symlink escapes.
	currentTarget, current, err := r.resolve(name)
	if err != nil {
		return "", err
	}
	if path.Ext(currentTarget) != ".md" {
		return "", &ReadError{ReadUnsupported, errors.New("destination is not a regular Markdown file")}
	}
	if !os.SameFile(info, opened) || !os.SameFile(opened, current) {
		return "", &ReadError{ReadUnreadable, errors.New("document changed while opening; try again")}
	}
	content, err := io.ReadAll(file)
	if err != nil {
		return "", accessFailure(err)
	}
	if !utf8.Valid(content) {
		return "", &ReadError{ReadUnreadable, errors.New("document is not readable UTF-8 Markdown")}
	}
	return string(content), nil
}

// resolve checks actual entry names, including relative symlink targets, even
// on case-insensitive filesystems. It reads metadata only. Root operations keep
// all intermediate lookups confined if entries change during the walk.
func (r *Reader) resolve(name string) (string, fs.FileInfo, error) {
	pending := strings.Split(name, "/")
	resolved := []string{}
	links := 0
	for len(pending) > 0 {
		part := pending[0]
		pending = pending[1:]
		switch part {
		case "", ".":
			continue
		case "..":
			if len(resolved) == 0 {
				return "", nil, &ReadError{ReadForbidden, errors.New("destination is outside the selected workspace")}
			}
			resolved = resolved[:len(resolved)-1]
			continue
		}
		parent := path.Join(append([]string{"."}, resolved...)...)
		entries, err := fs.ReadDir(r.root.FS(), parent)
		if err != nil {
			return "", nil, accessFailure(err)
		}
		found := false
		for _, entry := range entries {
			if entry.Name() == part {
				found = true
				break
			}
		}
		if !found {
			return "", nil, accessFailure(fs.ErrNotExist)
		}
		candidate := path.Join(parent, part)
		info, err := r.root.Lstat(candidate)
		if err != nil {
			return "", nil, accessFailure(err)
		}
		if info.Mode()&fs.ModeSymlink != 0 {
			links++
			if links > maxDocumentSymlinks {
				return "", nil, &ReadError{ReadUnreadable, errors.New("too many symbolic links")}
			}
			target, err := r.root.Readlink(candidate)
			if err != nil {
				return "", nil, accessFailure(err)
			}
			targetParent := parent
			if absoluteDocumentPath(target) {
				target, err = r.confinedAbsoluteLink(target)
				if err != nil {
					return "", nil, err
				}
				resolved = nil
				targetParent = "."
			}
			target = filepath.ToSlash(target)
			if escapingDocumentPath(path.Join(append([]string{targetParent, target}, pending...)...)) {
				return "", nil, &ReadError{ReadForbidden, errors.New("symbolic link destination is outside the selected workspace")}
			}
			pending = append(strings.Split(target, "/"), pending...)
			continue
		}
		if len(pending) > 0 && !info.IsDir() {
			return "", nil, &ReadError{ReadUnsupported, errors.New("a destination parent is not a directory")}
		}
		resolved = append(resolved, part)
	}
	target := path.Join(append([]string{"."}, resolved...)...)
	info, err := r.root.Stat(target)
	if err != nil {
		return "", nil, accessFailure(err)
	}
	return target, info, nil
}

// Translate an absolute link only when its spelling is inside the selected
// root and that name still identifies the retained directory. All subsequent
// access uses the OS root, never the absolute target or a reopened root.
func (r *Reader) confinedAbsoluteLink(target string) (string, error) {
	relative, err := filepath.Rel(r.rootPath, target)
	if err != nil || !filepath.IsLocal(relative) {
		return "", &ReadError{ReadForbidden, errors.New("symbolic link destination is outside the selected workspace")}
	}
	current, err := os.Stat(r.rootPath)
	if err != nil {
		return "", accessFailure(err)
	}
	retained, err := r.root.Stat(".")
	if err != nil {
		return "", accessFailure(err)
	}
	if !os.SameFile(current, retained) {
		return "", &ReadError{ReadForbidden, errors.New("absolute symbolic link no longer refers to the selected workspace")}
	}
	return filepath.ToSlash(relative), nil
}

func accessFailure(err error) *ReadError {
	// Go's root-escape sentinel is private, with no public classification API.
	// A native rejection during a filesystem race cannot reliably be separated
	// from other access errors here. Keep the unreadable fallback rather than
	// guessing from message text; genuine permission causes remain wrapped.
	kind := ReadUnreadable
	if errors.Is(err, fs.ErrNotExist) {
		kind = ReadMissing
	}
	return &ReadError{kind, err}
}

func absoluteDocumentPath(name string) bool {
	return filepath.IsAbs(name) || strings.HasPrefix(name, "\\") ||
		(len(name) >= 3 && name[1] == ':' && (name[2] == '/' || name[2] == '\\'))
}

func escapingDocumentPath(name string) bool {
	clean := path.Clean(name)
	return clean == ".." || strings.HasPrefix(clean, "../")
}

func hasURIScheme(name string) bool {
	colon := strings.IndexByte(name, ':')
	if colon <= 0 {
		return false
	}
	for i, c := range name[:colon] {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(i > 0 && ((c >= '0' && c <= '9') || c == '+' || c == '-' || c == '.')) {
			continue
		}
		return false
	}
	return true
}
