# Policy Decisions

Lock these decisions before the first sub-agent runs.

## Required Decisions

1. Which directories count as runtime roots
2. Whether `test/` references count as runtime usage
3. Whether README or docs count as runtime usage
4. Whether breaking public package APIs is allowed
5. Whether the target mode is CLI-only, CI-only, or reusable-library mode
6. Which verification commands are mandatory before the cleanup is considered done

## Recommended Defaults

- Runtime roots: `src`, `scripts`, `bin`, `cli`, `app`
- `test/` references: supporting evidence only
- README and docs: supporting evidence only
- Public API breaking: allowed only if the user says yes
- Product mode: keep current mode unless the user explicitly wants CLI-only or CI-only narrowing

## Aggressive CLI-Only Or CI-Only Profile

Use this profile when the user explicitly says that only CLI or CI tooling matters and importable module surfaces do not need to survive.

- Treat root `src/index.ts` and subpath `index.ts` barrels as removable unless they are required by the CLI
- Treat `package.json` `main`, `types`, and `exports` as removable or reducible
- Treat README import examples as stale surface that must be deleted or rewritten
- Treat install verification scripts that import the package as stale if the package is no longer meant to be imported
- Preserve only the command surfaces that the CLI, CI, or package verification actually needs

## When To Stop And Escalate

- External consumers cannot be inferred from the repo and the user did not approve breaking changes
- The repo uses dynamic loading or framework conventions that make local evidence unreliable
- The cleanup would remove commands or files that release automation still expects
