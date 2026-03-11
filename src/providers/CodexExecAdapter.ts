/**
 * Codex Exec Adapter を定義する。
 * このファイルは、Codex CLI の jsonl 実行結果を共通 provider response へ変換し、debug / consult が Claude と同じ面で扱えるようにするために存在する。
 */

import { spawn } from "node:child_process";

import type {
  ProviderAdapter,
  ProviderCallPlan,
  ProviderCallResult,
} from "./ProviderAdapter.js";
import type { ProviderName } from "../shared/commands.js";

interface CodexJsonLine {
  type?: string;
  message?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
  item?: {
    id?: string;
    type?: string;
    text?: string;
  };
}

/**
 * Json Lines を内部表現へ解釈する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param stdout 処理対象のテキスト。
 * @returns 収集した CodexJsonLine の一覧。
 */
function parseJsonLines(stdout: string): CodexJsonLine[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

/**
 * Last Agent Message から必要な情報だけを取り出す。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param events 処理に渡す events。
 * @returns 生成または整形した文字列。
 */
function pickLastAgentMessage(events: CodexJsonLine[]): string {
  const messages = events
    .filter((event) => event.type === "item.completed")
    .map((event) => event.item)
    .filter((item): item is NonNullable<CodexJsonLine["item"]> => Boolean(item))
    .filter((item) => item.type === "agent_message")
    .map((item) => item.text?.trim())
    .filter((text): text is string => Boolean(text));

  return messages.at(-1) ?? "";
}

/**
 * Usage から必要な情報だけを取り出す。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param events 処理に渡す events。
 * @returns CodexJsonLine["usage"] | null。
 */
function pickUsage(events: CodexJsonLine[]): CodexJsonLine["usage"] | null {
  return events.find((event) => event.type === "turn.completed")?.usage ?? null;
}

/**
 * Error Message から必要な情報だけを取り出す。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param events 処理に渡す events。
 * @returns string | null。
 */
function pickErrorMessage(events: CodexJsonLine[]): string | null {
  const eventError =
    events.find((event) => event.type === "turn.failed")?.error?.message ??
    events.find((event) => event.type === "error")?.message;

  return eventError?.trim() ? eventError.trim() : null;
}

/**
 * Codex を実行して結果を受け取る。
 * 外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。
 *
 * @param plan 処理に渡す plan。
 * @returns string を解決する Promise。
 */
async function runCodex(plan: ProviderCallPlan): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "exec",
      "--json",
      "--skip-git-repo-check",
      "-C",
      plan.cwd,
      "-s",
      "read-only",
      "-c",
      'approval_policy="never"',
    ];

    if (plan.model) {
      args.push("-m", plan.model);
    }

    args.push(plan.prompt);

    const child = spawn("codex", args, {
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
        reject(new Error(`Codex exec timed out after ${plan.timeoutMs}ms.`));
        return;
      }

      if (code !== 0) {
        const details = [
          `Codex exec exited with code ${code}${signal ? ` (signal: ${signal})` : ""}.`,
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
 * Codex Exec provider 境界を実装する。
 * Claude Code と Codex の CLI 差分を provider 境界で吸収し、上位層が共通 contract だけを見れば済むようにする。
 */
export class CodexExecAdapter implements ProviderAdapter {
  readonly name: ProviderName = "codex";

  /**
   * call を担当する。
   * 外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。
   *
   * @param plan 処理に渡す plan。
   * @returns ProviderCallResult を解決する Promise。
   */
  async call(plan: ProviderCallPlan): Promise<ProviderCallResult> {
    const stdout = await runCodex(plan);
    const events = parseJsonLines(stdout);
    const rawText = pickLastAgentMessage(events);
    const errorMessage = pickErrorMessage(events);
    const usage = pickUsage(events);
    const isError = Boolean(errorMessage);

    return {
      provider: this.name,
      rawText: rawText || errorMessage || "",
      rawJson: events,
      usage: {
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        costUsd: null,
        latencyMs: null,
      },
      citations: [],
      isError,
      subtype: isError ? "failed" : "success",
    };
  }
}
