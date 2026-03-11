# Imports And Storage

## Root Imports

The root package exports:

- `runCli`
- `AipanelApp`
- `CommandRouter`
- `ProfileLoader`
- all exports from `artifact`, `compare`, `context`, `domain`, `output`, `providers`, `run`, `session`, and `usecases`

Typical root import example:

```ts
import { AipanelApp, Session, runCli } from "aipanel-cli";
import { Run } from "aipanel-cli/domain";
```

## TypeScript Examples

Instantiate the app and list providers:

```ts
import { AipanelApp } from "aipanel-cli";

const app = new AipanelApp();
const providers = await app.listProvidersUseCase.execute();
console.log(providers.providers);
```

Call the CLI programmatically:

```ts
import { runCli } from "aipanel-cli";

await runCli(["providers", "--json"]);
```

Create entities directly:

```ts
import { Session } from "aipanel-cli";
import { Run } from "aipanel-cli/domain";

const session = Session.create({ title: "Imported session" });
const run = Run.create({
  sessionId: session.sessionId,
  command: "consult",
  mode: "direct",
});
```

## Supported Subpath Imports

Use these subpaths when the user wants a narrower import:

- `aipanel-cli/app`
- `aipanel-cli/artifact`
- `aipanel-cli/cli`
- `aipanel-cli/compare`
- `aipanel-cli/context`
- `aipanel-cli/domain`
- `aipanel-cli/output`
- `aipanel-cli/providers`
- `aipanel-cli/run`
- `aipanel-cli/session`
- `aipanel-cli/shared`
- `aipanel-cli/usecases`
- `aipanel-cli/package.json`

If a user asks whether a subpath is supported, answer from this list rather than guessing.

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

- `sessions/`: `Session`, `SessionTurn`, `ProviderRef`
- `runs/`: `Run`, `RunTask`, `TaskResult`, `ContextBundle`, `ProviderResponse`, `NormalizedResponse`, `ComparisonReport`
- `artifacts/`: context bundles, provider raw outputs, debug task outputs

`AIPANEL_STORAGE_ROOT` changes the storage root.

## Answering Tips

- When someone asks "Can I use this as a library?", answer yes and show both root imports and one focused subpath import.
- When someone asks "Where is state stored?", include the `.aipanel/` tree and mention `AIPANEL_STORAGE_ROOT`.
- When someone asks about exported APIs, avoid promising undocumented constructors or subpaths outside the current export map.
