SHELL := /bin/bash

DIAGRAM_SPEC := docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams/source/current-implementation-diagrams.spec.json
DIAGRAM_OUTPUT_DIR := docs/rearchitecture/content_rearchitecture_2026-03-10/12_current-implementation-diagrams
ARGS ?= providers --json
BASE ?= origin/main
AI_PROVIDER ?= codex
AI_TIMEOUT ?= 600000

.PHONY: install clean build run dev smoke worktree-add worktree-list lint lint-fix fmt fmt-check typecheck audit test test-unit test-integration test-e2e render-diagrams pack-dry-run pack verify-package publish-check publish hooks-install ai-review ai-review-deep ai-plan ai-followup

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

# ── aipanel self-review targets ──────────────────────────────────────────────

hooks-install:
	git config core.hooksPath .githooks
	@echo "Git hooks installed from .githooks/"

ai-review:
	@git diff --cached --quiet && echo "No staged changes." && exit 0 || true
	@git diff --cached > /tmp/aipanel-staged.patch
	aipanel consult "この差分をレビューして。重大なバグ・回帰リスク・設計上の問題だけ指摘して。先頭行は REVIEW_VERDICT: pass|warn|block" \
		--provider $(AI_PROVIDER) --diff /tmp/aipanel-staged.patch --timeout $(AI_TIMEOUT) --json

ai-review-deep:
	@git diff $(BASE)...HEAD > /tmp/aipanel-branch.patch
	aipanel debug "このブランチの変更全体をレビューして。根本的な設計問題・テスト不足・回帰リスクを分析して" \
		--provider $(AI_PROVIDER) --diff /tmp/aipanel-branch.patch --timeout $(AI_TIMEOUT) --json

ai-plan:
	@test -n "$(FILE)" || (echo "Usage: make ai-plan FILE=path/to/plan.md"; exit 1)
	aipanel consult "この実装計画を添削して。抜けている前提・順序ミス・検証不足・ロールバック不足・観測性不足を指摘し、最後に PLAN_VERDICT: good|revise で判定して" \
		--provider $(AI_PROVIDER) --file $(FILE) --timeout $(AI_TIMEOUT) --json

ai-followup:
	@test -n "$(SESSION)" || (echo "Usage: make ai-followup SESSION=session_xxx QUESTION='...'" ; exit 1)
	@test -n "$(QUESTION)" || (echo "Usage: make ai-followup SESSION=session_xxx QUESTION='...'" ; exit 1)
	aipanel followup --session $(SESSION) "$(QUESTION)" \
		--provider $(AI_PROVIDER) --timeout $(AI_TIMEOUT) --json
