.PHONY: install frontend build dist test run

install:
	cd frontend && npm ci

frontend:
	cd frontend && npm run build

build: frontend
	mkdir -p bin
	go build -trimpath -o bin/worktree ./cmd/worktree

dist: frontend
	mkdir -p bin/dist
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -buildvcs=false -o bin/dist/worktree-linux-amd64 ./cmd/worktree
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -buildvcs=false -o bin/dist/worktree-linux-arm64 ./cmd/worktree
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -trimpath -buildvcs=false -o bin/dist/worktree-darwin-amd64 ./cmd/worktree
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -trimpath -buildvcs=false -o bin/dist/worktree-darwin-arm64 ./cmd/worktree
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -buildvcs=false -o bin/dist/worktree-windows-amd64.exe ./cmd/worktree

test: frontend
	go test -race ./...
	go vet ./...
	cd frontend && npm test -- --watch=false

run: build
	./bin/worktree
