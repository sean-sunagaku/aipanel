# Install And Verify

## When To Read This

Read this file when the user wants to start using `aipanel`, confirm that the CLI is runnable, or perform a safe first verification.

## Baseline Setup

Run these from the repository root:

```bash
npm install
npm run build
node dist/bin/aipanel.js providers --json
```

Quick shortcuts:

```bash
npm start -- providers --json
npm run dev -- providers --json
```

If the repo uses the provided `Makefile`, this is equivalent:

```bash
make install
make build
make smoke
node dist/bin/aipanel.js providers --json
```

Expected result:

- install succeeds
- `dist/bin/aipanel.js` exists
- `providers --json` returns `claude-code`
- `npm start -- providers --json` works after build
- `npm run dev -- providers --json` works from source

## Preferred Verification Ladder

Use this order unless the user asks for something narrower:

```bash
npm run build
node dist/bin/aipanel.js providers --json
npm test
```

With `Makefile`:

```bash
make build
node dist/bin/aipanel.js providers --json
make test
```

## Real Provider Smoke

Use isolated storage unless the user wants shared history:

```bash
AIPANEL_STORAGE_ROOT="$(mktemp -d)" node dist/bin/aipanel.js consult "Reply with exactly: ready" --model sonnet --json --timeout 30000
```

If that succeeds, a safe next verification is:

```bash
AIPANEL_STORAGE_ROOT="<same-dir>" node dist/bin/aipanel.js followup --session "<sessionId>" "Reply with exactly: still ready" --model sonnet --json --timeout 30000
```

For orchestrated mode:

```bash
AIPANEL_STORAGE_ROOT="$(mktemp -d)" node dist/bin/aipanel.js debug "Diagnose in one short sentence." --model sonnet --json --timeout 30000
```

## Notes

- `consult` is the cheapest real smoke for actual tool usage
- `debug` fans out into multiple provider calls, so it is slower and costlier
- if the user needs stable model selection, suggest `.aipanel/profile.yml` `defaultModel` or an explicit `--model`
- if real Claude Code is not configured, fall back to `npm test` and say that provider wiring was validated only with the fake `claude` binary

## Package Verification

When the user asks whether `aipanel` is installable as a package, use this check:

```bash
tarball="$(npm pack)"
tmpdir="$(mktemp -d)"
npm install --prefix "$tmpdir" "./${tarball}"
"$tmpdir/node_modules/.bin/aipanel" providers --json
```

For the published npm package:

```bash
tmpdir="$(mktemp -d)"
npm install --prefix "$tmpdir" aipanel-cli
"$tmpdir/node_modules/.bin/aipanel" providers --json
```

For import verification:

```bash
tmpdir="$(mktemp -d)"
npm install --prefix "$tmpdir" aipanel-cli
(
  cd "$tmpdir"
  node --input-type=module -e 'const root = await import("aipanel-cli"); const domain = await import("aipanel-cli/domain"); console.log(Boolean(root.AipanelApp), Boolean(domain.Session));'
)
```

Preferred shortcut:

```bash
make verify-package
```

Expected result:

- the tarball is created
- install succeeds
- the packaged binary responds to `providers --json`
- package root can be imported
- `aipanel-cli/domain` can be imported
