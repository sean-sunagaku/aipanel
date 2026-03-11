import { spawn } from "node:child_process";

import type {
  ProviderAdapter,
  ProviderCallPlan,
  ProviderCallResult,
} from "./ProviderAdapter.js";

interface ClaudeJsonResponse {
  result?: string;
  model?: string;
  session_id?: string;
  subtype?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  duration_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Success Subtype を満たすか判定する。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 *
 * @param subtype 処理に渡す subtype。
 * @returns 条件を満たす場合は `true`。
 */
function isSuccessSubtype(subtype: string | undefined): boolean {
  return subtype === "success";
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
      plan.model ?? "sonnet",
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
 * Claude Code との入出力差分を吸収する。
 * 外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。
 */
export class ClaudeCodeAdapter implements ProviderAdapter {
  readonly name = "claude-code" as const;
  readonly defaultModel = "sonnet" as const;

  /**
   * call を担当する。
   * 外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。
   *
   * @param input この処理に渡す入力。
   * @returns ProviderCallResult を解決する Promise。
   */
  async call(input: ProviderCallPlan): Promise<ProviderCallResult> {
    const stdout = await runClaude(input);
    const parsed = JSON.parse(stdout) as ClaudeJsonResponse;
    const model = parsed.model ?? input.model ?? "sonnet";
    const subtype = parsed.subtype ?? null;
    const isError =
      parsed.is_error === true || !isSuccessSubtype(parsed.subtype);
    const externalRefs = parsed.session_id
      ? [
          {
            system: "claude-code",
            id: parsed.session_id,
            scope: "session",
          },
        ]
      : [];

    return {
      provider: this.name,
      model,
      rawText: parsed.result ?? "",
      rawJson: parsed,
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? null,
        outputTokens: parsed.usage?.output_tokens ?? null,
        costUsd: parsed.total_cost_usd ?? null,
        latencyMs: parsed.duration_ms ?? null,
      },
      externalRefs,
      citations: [],
      isError,
      subtype,
    };
  }
}
