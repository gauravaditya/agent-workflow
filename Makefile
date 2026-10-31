.PHONY: install frontend build test run

install:
	cd frontend && npm ci

frontend:
	cd frontend && npm run build

build: frontend
	mkdir -p bin
	go build -trimpath -o bin/worktree ./cmd/worktree

test: frontend
	go test -race ./...
	go vet ./...
	cd frontend && npm test -- --watch=false

run: build
	./bin/worktree
