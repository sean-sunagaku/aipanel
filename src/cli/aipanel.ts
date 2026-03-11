#!/usr/bin/env node
/**
 * aipanel CLI entrypoint を定義する。
 * このファイルは、Node CLI の最外周で argv・標準入出力・exit code を扱い、app 本体を端末実行詳細から切り離すために存在する。
 */

import { pathToFileURL } from "node:url";

import { AipanelApp } from "../app/AipanelApp.js";
import { CommandRouter } from "../app/CommandRouter.js";

/**
 * Cli を実行して結果を受け取る。
 * argv 解釈と標準入出力の責務を CLI 層へ閉じ込め、app / usecase を端末実行詳細から切り離す。
 *
 * @param argv 処理に渡す argv。
 * @param streams 処理に渡す streams。
 * @returns number を解決する Promise。
 * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
 */
export async function runCli(
  argv: string[] = process.argv.slice(2),
  streams: Pick<typeof process, "stdout" | "stderr"> = process,
): Promise<number> {
  const app = new AipanelApp();
  const router = new CommandRouter(app);

  try {
    const result = await router.route(argv);
    const responseText = result.responseText;
    streams.stdout.write(
      responseText.endsWith("\n") ? responseText : `${responseText}\n`,
    );
    return result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    streams.stderr.write(`${message}\n`);
    return 1;
  }
}

/**
 * main を担当する。
 * argv 解釈と標準入出力の責務を CLI 層へ閉じ込め、app / usecase を端末実行詳細から切り離す。
 *
 * @returns number を解決する Promise。
 */
async function main(): Promise<number> {
  return runCli();
}

/**
 * Direct Execution を満たすか判定する。
 * argv 解釈と標準入出力の責務を CLI 層へ閉じ込め、app / usecase を端末実行詳細から切り離す。
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
