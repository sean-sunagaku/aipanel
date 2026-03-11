SHELL := /bin/bash

DIAGRAM_SPEC := docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json
DIAGRAM_OUTPUT_DIR := docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
ARGS ?= providers --json
BASE ?= HEAD

.PHONY: install clean build run dev smoke worktree-add worktree-list lint lint-fix fmt fmt-check typecheck audit test test-unit test-integration test-e2e render-diagrams pack-dry-run pack verify-package publish-check publish

install:
	npm install

clean:
	npm run clean

build:
	npm run build

run: build
	node dist/bin/aipanel.js $(ARGS)

dev:
	npx tsx bin/aipanel.ts $(ARGS)

smoke: build
	node dist/bin/aipanel.js providers --json

worktree-add:
	@if [ -z "$(BRANCH)" ]; then echo "Usage: make worktree-add BRANCH=feature/foo [BASE=main]"; exit 1; fi
	node scripts/add-worktree.mjs "$(BRANCH)" --base "$(BASE)"

worktree-list:
	git worktree list

lint:
	npm run lint

lint-fix:
	npm run lint:fix

fmt:
	npm run fmt

fmt-check:
	npm run fmt:check

typecheck:
	npm run typecheck

audit:
	npm run audit

test:
	npm test

test-unit:
	npm run test:unit

test-integration:
	npm run test:integration

test-e2e:
	npm run test:e2e

render-diagrams:
	node scripts/architecture/render-diagram-bundle.mjs "$(DIAGRAM_SPEC)" "$(DIAGRAM_OUTPUT_DIR)"

pack-dry-run:
	npm run pack:dry-run

pack:
	npm pack

verify-package:
	npm run verify:package

publish-check:
	npm run publish:check

publish:
	npm run publish:public
