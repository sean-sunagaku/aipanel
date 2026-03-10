import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function createFakeClaudeBinary(binDirectory: string): Promise<string> {
  await mkdir(binDirectory, { recursive: true });

  const binaryPath = path.join(binDirectory, "claude");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
const prompt = args.at(-1) ?? "";
const modelIndex = args.indexOf("--model");
const model = modelIndex >= 0 ? args[modelIndex + 1] ?? "sonnet" : "sonnet";
const taskFocus = prompt.match(/Task focus: ([^\\n]+)/)?.[1] ?? null;
const currentQuestion =
  prompt.match(/Current question:\\n([\\s\\S]+)/)?.[1]?.trim() ??
  prompt.match(/Debug question:\\n([\\s\\S]+)/)?.[1]?.trim() ??
  "No question";
const result = taskFocus
  ? [
      taskFocus,
      "Model used: " + model,
      "- identify the strongest signal first",
      "- validate assumptions against logs and diffs",
      "Consider verifying the proposed fix with a focused test.",
    ].join("\\n")
  : [
      "Practical answer for: " + currentQuestion,
      "Model used: " + model,
      "- first actionable finding",
      "- second actionable finding",
      "Consider verifying the change before merging.",
    ].join("\\n");

const response = {
  result,
  model,
  session_id: "fake-claude-session",
  subtype: "success",
  is_error: false,
  total_cost_usd: 0.001,
  duration_ms: 12,
  usage: {
    input_tokens: 32,
    output_tokens: 64,
  },
};

process.stdout.write(JSON.stringify(response) + "\\n");
`;

  await writeFile(binaryPath, script, "utf8");
  await chmod(binaryPath, 0o755);
  return binaryPath;
}
