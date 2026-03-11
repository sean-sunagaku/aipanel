import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function createFakeClaudeBinary(
  binDirectory: string,
): Promise<string> {
  await mkdir(binDirectory, { recursive: true });

  const binaryPath = path.join(binDirectory, "claude");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
const prompt = args.at(-1) ?? "";
const modelIndex = args.indexOf("--model");
const model = modelIndex >= 0 ? args[modelIndex + 1] ?? "sonnet" : "sonnet";
const taskFocus = prompt.match(/Task focus: ([^\\n]+)/)?.[1] ?? null;
const conversation =
  prompt.match(/Conversation so far:\\n([\\s\\S]+?)(?=\\n\\nCurrent question:)/)?.[1]?.trim() ??
  null;
const planDoc =
  prompt.match(/Plan document:\\n([\\s\\S]+?)(?=\\n\\n(?:Previous analysis:|User request:))/)?.[1]?.trim() ??
  null;
const transcriptPlanDoc =
  conversation?.match(/Plan document:\\n([\\s\\S]+?)(?=\\n\\n(?:USER|ASSISTANT):|$)/)?.[1]?.trim() ??
  null;
const currentQuestion =
  prompt.match(/Current question:\\n([\\s\\S]+?)(?=\\n\\nReply|$)/)?.[1]?.trim() ??
  prompt.match(/Debug question:\\n([\\s\\S]+?)(?=\\n\\nReply|$)/)?.[1]?.trim() ??
  prompt.match(/User request:\\n([\\s\\S]+?)(?=\\n\\nReply|$)/)?.[1]?.trim() ??
  "No question";
const planVerdict =
  taskFocus?.includes("PLAN_VERDICT")
    ? prompt.includes("FORCE_PLAN_REVISE")
      ? "revise"
      : "good"
    : null;
const result = taskFocus
  ? [
      taskFocus,
      "Model used: " + model,
      "Question: " + currentQuestion,
      ...(planDoc ? ["Plan reviewed: " + planDoc.slice(0, 20)] : []),
      "- identify the strongest signal first",
      "- validate assumptions against logs and diffs",
      "Consider verifying the proposed fix with a focused test.",
      ...(planVerdict ? ["PLAN_VERDICT: " + planVerdict] : []),
    ].join("\\n")
  : [
      "Practical answer for: " + currentQuestion,
      "Model used: " + model,
      ...(transcriptPlanDoc ? ["Transcript reviewed: " + transcriptPlanDoc.slice(0, 20)] : []),
      "- first actionable finding",
      "- second actionable finding",
      "Consider verifying the change before merging.",
    ].join("\\n");

const response = {
  result,
  model,
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
