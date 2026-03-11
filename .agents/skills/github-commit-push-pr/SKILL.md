---
name: github-commit-push-pr
description: Validate the current worktree, create a focused git commit, push the current branch, and create or update a GitHub pull request. Use when the user asks to "コミットして", "push して", "PR 作って", "commit and open a PR", or wants Codex to finish the current implementation branch with a clean commit and GitHub PR link.
---

# GitHub Commit Push PR

## Overview

Use this skill to finish current implementation work without hand-waving the release steps.
Inspect the branch state, run proportionate validation, make a deliberate commit, push safely, and create or reuse a GitHub PR with a concise title and body.

## Workflow

### 1. Inspect the repository state

Start by checking the branch, remote, and working tree.

Use commands such as:

```bash
git status --short
git branch --show-current
git remote -v
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef
```

Apply these rules:

- If the repo is dirty with unrelated changes, stop and align with the user before committing them.
- If `gh auth status` fails, explain the blocker instead of pretending PR creation succeeded.
- If the current branch is the default branch, create a feature branch first unless the user explicitly wants direct work on the default branch.
- If HEAD is detached, stop and fix the branch situation before continuing.

### 2. Review the diff and run validation

Inspect what will be committed and run the smallest validation that still gives confidence.

Prefer commands such as:

```bash
git diff --stat
git diff
git diff --cached
```

Validation should be proportionate:

- Run the repo's focused tests, typecheck, lint, or build steps that cover the changed area.
- If you cannot run a useful validation step, say so in the final report and in the PR body.
- Do not claim CI safety without evidence.

### 3. Stage intentionally

Stage only the files that belong in the commit.

Use commands such as:

```bash
git add <paths...>
git status --short
git diff --cached --stat
git diff --cached
```

Do not sweep in unrelated files just to make the worktree clean.
Do not revert user changes you did not make.

### 4. Write the commit

Write a commit message that matches the actual change.

Prefer a concise subject line and add a body only when it clarifies intent or validation.

Example:

```bash
git commit -m "Add provider:model routing for aipanel reviewers"
```

Avoid `--amend` unless the user explicitly asks for it.

### 5. Push safely

Push the current branch without force.

Use:

```bash
git push -u origin "$(git branch --show-current)"
```

If the branch already tracks a remote branch, plain `git push` is fine.
Do not force-push unless the user explicitly asks for it.

### 6. Create or reuse the pull request

Prefer the GitHub CLI.

First check whether a PR already exists for the branch:

```bash
gh pr view --json url,number,title
```

If a PR already exists, report that URL instead of creating a duplicate.

If no PR exists, create one with an explicit title and body:

```bash
gh pr create \
  --base <default-branch> \
  --head "$(git branch --show-current)" \
  --title "<concise title>" \
  --body "<summary, validation, risks>"
```

Build the PR body from:

- What changed
- Why it changed
- Validation run
- Remaining risks or follow-up work

### 7. Report the result

Always return:

- current branch name
- commit SHA and commit title
- validation commands actually run
- whether push succeeded
- PR URL, or the exact blocker if PR creation failed

## Safety Rules

- Refuse to hide failed validation.
- Refuse to silently commit unrelated changes.
- Refuse to pretend a push or PR succeeded without command evidence.
- Prefer creating a new feature branch over committing directly to the default branch.
- Use non-interactive git commands only.
