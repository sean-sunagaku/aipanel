# Verification Checklist

## Minimum Checks Per Batch

1. `npm run lint` if the repo has a lint script
2. `npm run typecheck`
3. Run the most relevant focused tests if the repo has them
4. Run the broader test suite if the batch touches public surface, CLI, serializers, or repositories

## Stronger Checks For Public Surface Changes

1. `npm run typecheck`
2. `npm test`
3. `npm run verify:package` if the repo has packaged install smoke tests
4. `npm run pack:dry-run` for published packages
5. Update README or import examples in the same patch if they mention deleted symbols

## Stronger Checks For CLI-Only Or CI-Only Narrowing

1. Verify the intended CLI commands still work from the built package or tarball
2. Remove or rewrite package import verification that no longer matches the product mode
3. Re-run package smoke tests after `package.json` surface changes

## Stronger Checks For Tooling Or Validator Changes

1. Re-run the checker or validator if it still exists after the patch
2. Re-run any package or repo health command that depends on the deleted tooling
3. Remove stale npm scripts or docs if they referenced the deleted validator

## Checks For Skill Updates

1. `npm run check:agent-skills` when the repo defines it
2. If the skill bundles scripts, run at least one representative command from the updated skill

## Batch Size Guidance

- Prefer 1-5 closely related symbols per batch.
- Keep grouped deletions together.
- Separate risky public-surface deletions from simple internal dead-code removals.
- Avoid parallel verification commands that mutate `dist`, tarballs, or shared temp outputs.
