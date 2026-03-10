import { spawn } from "node:child_process";

import type { ProviderAdapter, ProviderCallPlan, ProviderCallResult } from "./ProviderAdapter.js";

interface ClaudeJsonResponse {
  result?: string;
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

function isSuccessSubtype(subtype: string | undefined): boolean {
  return subtype === "success";
}

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

export class ClaudeCodeAdapter implements ProviderAdapter {
  readonly name = "claude-code" as const;

  async call(input: ProviderCallPlan): Promise<ProviderCallResult> {
    const stdout = await runClaude(input);
    const parsed = JSON.parse(stdout) as ClaudeJsonResponse;
    const subtype = parsed.subtype ?? null;
    const isError = parsed.is_error === true || !isSuccessSubtype(parsed.subtype);
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
