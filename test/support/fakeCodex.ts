import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function createFakeCodexBinary(
  binDirectory: string,
): Promise<string> {
  await mkdir(binDirectory, { recursive: true });

  const binaryPath = path.join(binDirectory, "codex");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
const command = args[0];

if (command !== "exec") {
  process.stderr.write("fake codex only supports exec\\n");
  process.exit(1);
}

const modelIndex = args.indexOf("-m");
const model =
  modelIndex >= 0 ? args[modelIndex + 1] ?? "configured-default" : "configured-default";
const prompt = args.at(-1) ?? "";
const taskFocus = prompt.match(/Task focus: ([^\\n]+)/)?.[1] ?? null;
const currentQuestion =
  prompt.match(/Current question:\\n([\\s\\S]+)/)?.[1]?.trim() ??
  prompt.match(/Debug question:\\n([\\s\\S]+)/)?.[1]?.trim() ??
  "No question";

const result = taskFocus
  ? [
      taskFocus,
      "Model used: " + model,
      "- inspect the most relevant repository evidence",
      "- call out the highest-risk assumption",
      "Recommend a targeted verification step.",
    ].join("\\n")
  : [
      "Codex answer for: " + currentQuestion,
      "Model used: " + model,
      "- inspect the relevant files before concluding",
      "- keep the response grounded in the available context",
      "Recommend validating the conclusion with one focused check.",
    ].join("\\n");

const events = [
  { type: "turn.started" },
  {
    type: "item.completed",
    item: {
      id: "item_0",
      type: "agent_message",
      text: result,
    },
  },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 21,
      output_tokens: 34,
    },
  },
];

process.stdout.write(events.map((event) => JSON.stringify(event)).join("\\n") + "\\n");
`;

  await writeFile(binaryPath, script, "utf8");
  await chmod(binaryPath, 0o755);
  return binaryPath;
}
