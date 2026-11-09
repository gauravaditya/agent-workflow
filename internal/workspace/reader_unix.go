//go:build unix

package workspace

import (
	"os"
	"syscall"
)

const documentReadFlags = os.O_RDONLY | syscall.O_NONBLOCK
