#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { AipanelApp, CommandRouter } from "../app/index.js";

export async function runCli(
  argv: string[] = process.argv.slice(2),
  output: Pick<typeof process, "stdout" | "stderr"> = process,
): Promise<number> {
  const app = new AipanelApp();
  const router = new CommandRouter(app);

  try {
    const result = await router.route(argv);
    output.stdout.write(
      result.output.endsWith("\n") ? result.output : `${result.output}\n`,
    );
    return result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.stderr.write(`${message}\n`);
    return 1;
  }
}

async function main(): Promise<number> {
  return runCli();
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];
  if (!entryPoint) {
    return false;
  }

  return import.meta.url === pathToFileURL(entryPoint).href;
}

if (isDirectExecution()) {
  const exitCode = await main();
  process.exit(exitCode);
}
