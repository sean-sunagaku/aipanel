SHELL := /bin/bash

DIAGRAM_SPEC := docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json
DIAGRAM_OUTPUT_DIR := docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
ARGS ?= providers --json
BASE ?= HEAD

.PHONY: install clean build run dev smoke worktree-add worktree-list lint lint-fix fmt fmt-check typecheck audit test test-unit test-integration test-e2e render-diagrams pack-dry-run pack verify-package publish-check publish

install:
	pnpm install

clean:
	pnpm run clean

build:
	pnpm run build

run: build
	node dist/bin/aipanel.js $(ARGS)

dev:
	pnpm run dev $(ARGS)

smoke: build
	node dist/bin/aipanel.js providers --json

worktree-add:
	@if [ -z "$(BRANCH)" ]; then echo "Usage: make worktree-add BRANCH=feature/foo [BASE=main]"; exit 1; fi
	node scripts/add-worktree.mjs "$(BRANCH)" --base "$(BASE)"

worktree-list:
	git worktree list

lint:
	pnpm run lint

lint-fix:
	pnpm run lint:fix

fmt:
	pnpm run fmt

fmt-check:
	pnpm run fmt:check

typecheck:
	pnpm run typecheck

audit:
	pnpm run audit

test:
	pnpm test

test-unit:
	pnpm run test:unit

test-integration:
	pnpm run test:integration

test-e2e:
	pnpm run test:e2e

render-diagrams:
	node scripts/architecture/render-diagram-bundle.mjs "$(DIAGRAM_SPEC)" "$(DIAGRAM_OUTPUT_DIR)"

pack-dry-run:
	pnpm run pack:dry-run

pack:
	pnpm pack

verify-package:
	pnpm run verify:package

publish-check:
	pnpm run publish:check

publish:
	pnpm run publish:public
