package workspace

// ReadFailure is a machine-readable document access outcome, not a validation issue.
type ReadFailure string

const (
	ReadMissing     ReadFailure = "missing"
	ReadUnreadable  ReadFailure = "unreadable"
	ReadUnsupported ReadFailure = "unsupported"
	ReadForbidden   ReadFailure = "forbidden"
)

const maxDocumentSymlinks = 40
