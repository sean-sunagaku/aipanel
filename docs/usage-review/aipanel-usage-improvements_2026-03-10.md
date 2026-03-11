# AIPanel Usage Improvement Notes

## Context

This note captures improvements discovered while using `aipanel` itself to validate the CLI `--model` plumbing for `claude-code`.

## Confirmed Good Changes

- `--model` now flows from the CLI through `consult`, `followup`, and `debug`
- provider default selection is resolved from CLI args and adapter defaults; `profile.yml` is not used in phase 1
- JSON output now shows the resolved `model`
- persisted `Run` records now keep `providerResponses[].model`

## Suggested Next Improvements

### 1. Make `providers --json` richer

Current output only returns provider names. It would be easier to operate `aipanel` if `providers --json` also returned:

- default model per provider
- whether native resume is supported
- phase or stability hint

This would let users discover valid `--model` choices without opening docs.

### 2. Clarify `debug --timeout` semantics in the CLI itself

While validating with real `aipanel debug`, the command took longer than expected because the timeout applies per provider task, not to the full orchestrated run.

Two possible improvements:

- print a short note in `help` output or `README`
- add a separate `--run-timeout` in the future if total budget control matters

### 3. Add provider bootstrap guidance

`providers --json` に default model / native resume 支援情報を含めると、初回利用時の設定判断がやりやすくなる。  
phase 1 では専用 bootstrap コマンドは未導入。

### 4. Show requested vs resolved model in debug mode

The current output shows the resolved model, which is already helpful. For troubleshooting, it may be even better to expose both:

- requested model
- resolved model

This becomes more valuable once multiple providers or provider-side aliases are introduced.

### 5. Add a smaller single-shot review command

`debug` is useful, but it is intentionally heavier because it fans out into multiple role-based calls. A lighter `review`-style command or mode could be useful for:

- quick implementation review
- docs review
- edge-case review

without paying the full orchestrated cost every time.

## Evidence From Real Usage

- real `consult --model sonnet` completed successfully and returned `model: "sonnet"` in JSON output
- real `debug` runs exposed that orchestrated review is more expensive and slower than direct checks, which makes timeout behavior especially important to explain well
