# Imports And Storage

## Export Map

The published package is currently CLI-first.

Public package exports:

- `aipanel` binary via `dist/bin/aipanel.js`
- `./package.json`

There is no supported TypeScript import surface for package consumers right now. If someone asks whether they can `import { AipanelApp } from "aipanel-cli"`, the safe answer is "not as a supported published API yet".

## Storage Layout

By default, data is stored under `./.aipanel`.

```text
.aipanel/
  sessions/
    <sessionId>.json
  runs/
    <runId>.json
  artifacts/
    <runId>/
      <artifactId>.json
      <artifactId>.artifact.json
```

Persistence categories:

- `sessions/`: `Session`, `SessionTurn`
- `runs/`: `Run`, `RunTask`, `TaskResult`, `RunContext`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport`
- `artifacts/`: run context, provider raw outputs, debug task outputs

`AIPANEL_STORAGE_ROOT` changes the storage root.

## Answering Tips

- When someone asks "Can I use this as a library?", answer that the current published package is CLI-first and does not expose a supported TypeScript import API yet.
- When someone asks "Where is state stored?", include the `.aipanel/` tree and mention `AIPANEL_STORAGE_ROOT`.
- When someone asks about exported APIs, avoid promising undocumented constructors or subpaths outside the current export map.
