import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const skillDir = ".agent/skills/aipanel-diagrams";
const requiredFiles = [
  `${skillDir}/SKILL.md`,
  `${skillDir}/agents/openai.yaml`,
  `${skillDir}/references/00_overview.md`,
  `${skillDir}/references/01_generation-workflow.md`,
  `${skillDir}/references/02_source-map.md`,
  `${skillDir}/references/03_subagent-workflow.md`,
  `${skillDir}/references/04_diagram-bundle-template.json`,
  `${skillDir}/references/05_subagent-prompt-template.md`,
  `${skillDir}/references/subagents/drawio-diagrammer.yaml`,
  "AGENTS.md",
  "scripts/architecture/render-diagram-bundle.mjs",
];
const forbiddenPaths = [
  "docs/skills/aipanel-diagrams",
  "skills/aipanel-diagrams",
];
const staleReferencePatterns = [
  "docs/skills/aipanel-diagrams",
  "/.codex/skills/aipanel-diagrams",
  "/.agents/skills/aipanel-diagrams",
  "/Users/babashunsuke/.codex/skills/aipanel-diagrams",
  "/Users/babashunsuke/.agents/skills/aipanel-diagrams",
];

function resolveFromRoot(relativePath) {
  return path.resolve(rootDir, relativePath);
}

function readUtf8(relativePath) {
  return readFileSync(resolveFromRoot(relativePath), "utf8");
}

function collectFiles(relativePath) {
  const absolutePath = resolveFromRoot(relativePath);
  const entries = readdirSync(absolutePath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childRelativePath = path.posix.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(childRelativePath));
      continue;
    }

    files.push(childRelativePath);
  }

  return files;
}

function assertIncludes(text, snippet, errors, label) {
  if (!text.includes(snippet)) {
    errors.push(`${label} must include \`${snippet}\`.`);
  }
}

function assertExcludes(text, snippet, errors, label) {
  if (text.includes(snippet)) {
    errors.push(`${label} must not include stale reference \`${snippet}\`.`);
  }
}

const errors = [];

for (const relativePath of requiredFiles) {
  if (!existsSync(resolveFromRoot(relativePath))) {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

for (const relativePath of forbiddenPaths) {
  if (existsSync(resolveFromRoot(relativePath))) {
    errors.push(`Forbidden path still exists: ${relativePath}`);
  }
}

if (errors.length === 0) {
  const skillMarkdown = readUtf8(`${skillDir}/SKILL.md`);
  const openAiConfig = readUtf8(`${skillDir}/agents/openai.yaml`);
  const agentsMarkdown = readUtf8("AGENTS.md");
  const bundleTemplate = readUtf8(
    `${skillDir}/references/04_diagram-bundle-template.json`,
  );

  assertIncludes(
    skillMarkdown,
    "Prefer a sub-agent to draft the bundle spec JSON",
    errors,
    `${skillDir}/SKILL.md`,
  );
  assertIncludes(
    skillMarkdown,
    "node scripts/architecture/render-diagram-bundle.mjs",
    errors,
    `${skillDir}/SKILL.md`,
  );
  assertIncludes(
    openAiConfig,
    'display_name: "AIPanel Diagrams"',
    errors,
    `${skillDir}/agents/openai.yaml`,
  );
  assertIncludes(
    openAiConfig,
    "sub-agent",
    errors,
    `${skillDir}/agents/openai.yaml`,
  );
  assertIncludes(
    agentsMarkdown,
    "`skills/` は公開用・配布用の Skill だけに使う。",
    errors,
    "AGENTS.md",
  );
  assertIncludes(
    agentsMarkdown,
    "repo-private な Codex Skill は `.agent/skills/` 配下に置く。",
    errors,
    "AGENTS.md",
  );
  assertIncludes(
    agentsMarkdown,
    "`npm run check:agent-skills`",
    errors,
    "AGENTS.md",
  );
  assertIncludes(
    agentsMarkdown,
    "`scripts/architecture/` は draw.io/SVG の renderer",
    errors,
    "AGENTS.md",
  );

  try {
    JSON.parse(bundleTemplate);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(
      `Invalid JSON in ${skillDir}/references/04_diagram-bundle-template.json: ${message}`,
    );
  }

  for (const relativePath of collectFiles(skillDir)) {
    const extension = path.extname(relativePath);

    if (![".md", ".yaml", ".yml", ".json"].includes(extension)) {
      continue;
    }

    const content = readUtf8(relativePath);

    for (const pattern of staleReferencePatterns) {
      assertExcludes(content, pattern, errors, relativePath);
    }
  }
}

if (errors.length > 0) {
  process.stderr.write("Agent skill validation failed.\n");

  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }

  process.exit(1);
}

process.stdout.write(
  [
    "Agent skill validation passed.",
    `- checked required files under ${skillDir}`,
    "- confirmed deprecated docs/skills and skills paths are absent",
    "- confirmed AGENTS.md documents placement and validation rules",
    "- confirmed diagram bundle template JSON parses cleanly",
  ].join("\n") + "\n",
);
