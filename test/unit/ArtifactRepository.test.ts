import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ArtifactRepository } from "../../src/artifact/ArtifactRepository.js";

type ArtifactIdGenerator = (prefix: string) => string;

test("ArtifactRepository writes artifacts into a run-scoped directory", async (t) => {
  const storageRoot = await mkdtemp(
    path.join(os.tmpdir(), "aipanel-artifact-repository-"),
  );
  t.after(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  let artifactSeq = 1;
  const artifactRepository = new ArtifactRepository({
    storageRoot,
    idGenerator: ((prefix: string): string => {
      return `${prefix}-${artifactSeq++}`;
    }) satisfies ArtifactIdGenerator,
  });

  const runScoped = await artifactRepository.writeTextArtifact({
    kind: "provider-response-text",
    content: "run-scoped artifact",
    runId: "run-42",
    extension: ".md",
  });
  const sharedScoped = await artifactRepository.writeTextArtifact({
    kind: "provider-response-text",
    content: "shared artifact",
  });
  const nullScoped = await artifactRepository.writeTextArtifact({
    kind: "provider-response-text",
    content: "null-scoped artifact",
    runId: null,
    extension: ".log",
  });

  assert.equal(
    runScoped.path,
    path.join(storageRoot, "artifacts", "run-42", "artifact-1.md"),
  );
  assert.equal(
    runScoped.metadataPath,
    path.join(storageRoot, "artifacts", "run-42", "artifact-1.artifact.json"),
  );
  assert.equal(
    sharedScoped.path,
    path.join(storageRoot, "artifacts", "_shared", "artifact-2.txt"),
  );
  assert.equal(
    nullScoped.path,
    path.join(storageRoot, "artifacts", "_shared", "artifact-3.log"),
  );

  const sharedStat = await stat(sharedScoped.path);
  const nullScopedMetaStat = await stat(
    path.join(storageRoot, "artifacts", "_shared", "artifact-3.artifact.json"),
  );
  assert.equal(sharedStat.isFile(), true);
  assert.equal(nullScopedMetaStat.isFile(), true);
});
