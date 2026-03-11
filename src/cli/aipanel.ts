#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { AipanelApp } from "../app/AipanelApp.js";
import { CommandRouter } from "../app/CommandRouter.js";

/**
 * Cli を実行して結果を受け取る。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 *
 * @param argv 処理に渡す argv。
 * @param output 処理に渡す output。
 * @returns number を解決する Promise。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
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

/**
 * main を担当する。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 *
 * @returns number を解決する Promise。
 */
async function main(): Promise<number> {
  return runCli();
}

/**
 * Direct Execution を満たすか判定する。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 *
 * @returns 条件を満たす場合は `true`。
 */
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
