import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createFakeClaudeBinary } from "./fakeClaude.js";
import { createFakeCodexBinary } from "./fakeCodex.js";

export interface CliSandbox {
  sandboxRoot: string;
  workspace: string;
  storageRoot: string;
  fakeBin: string;
  env: NodeJS.ProcessEnv;
  cleanup(): Promise<void>;
}

export async function createCliSandbox(prefix: string): Promise<CliSandbox> {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  const workspace = path.join(sandboxRoot, "workspace");
  const storageRoot = path.join(sandboxRoot, "storage");
  const fakeBin = path.join(sandboxRoot, "fake-bin");

  await mkdir(workspace, { recursive: true });
  await mkdir(storageRoot, { recursive: true });
  await createFakeClaudeBinary(fakeBin);
  await createFakeCodexBinary(fakeBin);

  return {
    sandboxRoot,
    workspace,
    storageRoot,
    fakeBin,
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
      AIPANEL_STORAGE_ROOT: storageRoot,
    },
    async cleanup() {
      await rm(sandboxRoot, { recursive: true, force: true });
    },
  };
}
