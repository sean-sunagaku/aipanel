import { spawn } from "node:child_process";

import type {
  ProviderAdapter,
  ProviderCallPlan,
  ProviderCallResult,
} from "./ProviderAdapter.js";

interface CodexJsonLine {
  type?: string;
  thread_id?: string;
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

function parseJsonLines(stdout: string): CodexJsonLine[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CodexJsonLine);
}

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

function pickThreadId(events: CodexJsonLine[]): string | null {
  return (
    events.find((event) => event.type === "thread.started")?.thread_id ?? null
  );
}

function pickUsage(events: CodexJsonLine[]): CodexJsonLine["usage"] | null {
  return events.find((event) => event.type === "turn.completed")?.usage ?? null;
}

function pickErrorMessage(events: CodexJsonLine[]): string | null {
  const eventError =
    events.find((event) => event.type === "turn.failed")?.error?.message ??
    events.find((event) => event.type === "error")?.message;

  return eventError?.trim() ? eventError.trim() : null;
}

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

export class CodexExecAdapter implements ProviderAdapter {
  readonly name = "codex" as const;

  async call(plan: ProviderCallPlan): Promise<ProviderCallResult> {
    const stdout = await runCodex(plan);
    const events = parseJsonLines(stdout);
    const rawText = pickLastAgentMessage(events);
    const errorMessage = pickErrorMessage(events);
    const usage = pickUsage(events);
    const threadId = pickThreadId(events);
    const isError = Boolean(errorMessage);

    return {
      provider: this.name,
      model: plan.model ?? "configured-default",
      rawText: rawText || errorMessage || "",
      rawJson: events,
      usage: {
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        costUsd: null,
        latencyMs: null,
      },
      externalRefs: threadId
        ? [
            {
              system: "codex",
              id: threadId,
              scope: "session",
            },
          ]
        : [],
      citations: [],
      isError,
      subtype: isError ? "failed" : "success",
    };
  }
}
