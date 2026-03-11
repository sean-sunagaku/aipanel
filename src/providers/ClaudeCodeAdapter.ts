/**
 * Claude Code Adapter を定義する。
 * このファイルは、Claude Code CLI の実行方法と JSON 解析差分を provider adapter に閉じ込め、上位層が共通 contract だけで扱えるようにするために存在する。
 */

import { spawn } from "node:child_process";
import { match } from "ts-pattern";

import type {
  ProviderAdapter,
  ProviderCallPlan,
  ProviderCallResult,
  ProviderCallSubtype,
} from "./ProviderAdapter.js";
import type { ProviderName } from "../shared/commands.js";

const CLAUDE_CODE_MODEL = "sonnet";

/**
 * Subtype から必要な情報だけを取り出す。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param value 処理に渡す value。
 * @returns ProviderCallSubtype | null。
 */
function pickSubtype(value: unknown): ProviderCallSubtype | null {
  return match(value)
    .returnType<ProviderCallSubtype | null>()
    .with("success", () => "success")
    .with("failed", () => "failed")
    .otherwise(() => null);
}

/**
 * Claude を実行して結果を受け取る。
 * 外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。
 *
 * @param plan 処理に渡す plan。
 * @returns string を解決する Promise。
 */
async function runClaude(plan: ProviderCallPlan): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      "--tools",
      "",
      "--model",
      plan.model ?? CLAUDE_CODE_MODEL,
      "--output-format",
      "json",
      plan.prompt,
    ];

    const child = spawn("claude", args, {
      cwd: plan.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let didTimeout = false;

    const timeoutHandle = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, plan.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timeoutHandle);

      if (didTimeout) {
        reject(new Error(`Claude Code timed out after ${plan.timeoutMs}ms.`));
        return;
      }

      if (code !== 0) {
        const details = [
          `Claude Code exited with code ${code}${signal ? ` (signal: ${signal})` : ""}.`,
        ];
        if (stderr.trim()) {
          details.push(stderr.trim());
        }
        if (stdout.trim()) {
          details.push(stdout.trim());
        }
        reject(new Error(details.join("\n\n")));
        return;
      }

      resolve(stdout);
    });
  });
}

/**
 * Claude Code provider 境界を実装する。
 * Claude Code と Codex の CLI 差分を provider 境界で吸収し、上位層が共通 contract だけを見れば済むようにする。
 */
export class ClaudeCodeAdapter implements ProviderAdapter {
  readonly name: ProviderName = "claude-code";

  /**
   * call を担当する。
   * 外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。
   *
   * @param input この処理に渡す入力。
   * @returns ProviderCallResult を解決する Promise。
   */
  async call(input: ProviderCallPlan): Promise<ProviderCallResult> {
    const stdout = await runClaude(input);
    const parsed = JSON.parse(stdout);
    const subtype = pickSubtype(parsed.subtype);
    const isErrorBySubtype = match(subtype)
      .with("success", () => false)
      .otherwise(() => true);
    const hasFailure = parsed.is_error === true || isErrorBySubtype;
    return {
      provider: this.name,
      rawText: parsed.result ?? "",
      rawJson: parsed,
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? null,
        outputTokens: parsed.usage?.output_tokens ?? null,
        costUsd: parsed.total_cost_usd ?? null,
        latencyMs: parsed.duration_ms ?? null,
      },
      citations: [],
      isError: hasFailure,
      subtype,
    };
  }
}
