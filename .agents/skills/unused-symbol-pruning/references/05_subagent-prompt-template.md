# Sub-Agent Prompt Template

Use this as the starting point and customize the role name, roots, and evidence files.

```text
Audit unused symbols in this repository with the role described below.

role:
- <ROLE NAME>

goal:
- <ROLE-SPECIFIC GOAL>

scope:
- repo root: <ROOT>
- runtime roots: <RUNTIME ROOTS>
- test roots: <TEST ROOTS>
- docs and metadata: <DOC FILES>

policy:
- tests count as runtime usage: <yes/no>
- README or docs count as runtime usage: <yes/no>
- breaking public API is allowed: <yes/no>
- CLI-only or CI-only narrowing is allowed: <yes/no>

inputs:
- inventory JSON from `.agents/skills/unused-symbol-pruning/scripts/inventory-unused-symbols.mjs`
- role contract from `.agents/skills/unused-symbol-pruning/references/subagents/<ROLE FILE>.yaml`
- any repo files needed for this role only

output:
- concise findings only
- no code changes
- no patch suggestions unless the role contract explicitly asks for batches

guardrails:
- prefer evidence over guesses
- do not assume exports are used
- do not protect validators or checkers by default
- do not treat test-only or README-only references as runtime usage unless instructed
- do not preserve package import surfaces if the policy says CLI-only or CI-only
```
