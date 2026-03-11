import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const skillConfigs = [
  {
    skillDir: ".agents/skills/aipanel-diagrams",
    requiredFiles: [
      "SKILL.md",
      "agents/openai.yaml",
      "references/00_overview.md",
      "references/01_generation-workflow.md",
      "references/02_source-map.md",
      "references/03_subagent-workflow.md",
      "references/04_diagram-bundle-template.json",
      "references/05_subagent-prompt-template.md",
      "references/subagents/drawio-diagrammer.yaml",
    ],
    forbiddenPaths: ["docs/skills/aipanel-diagrams", "skills/aipanel-diagrams"],
    staleReferencePatterns: [
      "docs/skills/aipanel-diagrams",
      "/.agent/skills/aipanel-diagrams",
      "/.codex/skills/aipanel-diagrams",
      "/Users/babashunsuke/.codex/skills/aipanel-diagrams",
      "/Users/babashunsuke/.agents/skills/aipanel-diagrams",
    ],
    jsonFiles: ["references/04_diagram-bundle-template.json"],
    contentChecks: [
      {
        relativePath: "SKILL.md",
        includes: [
          "Prefer a sub-agent to draft the bundle spec JSON",
          "node scripts/architecture/render-diagram-bundle.mjs",
        ],
      },
      {
        relativePath: "agents/openai.yaml",
        includes: ['display_name: "AIPanel Diagrams"', "sub-agent"],
      },
    ],
  },
  {
    skillDir: ".agents/skills/unused-symbol-pruning",
    requiredFiles: [
      "SKILL.md",
      "agents/openai.yaml",
      "references/00_overview.md",
      "references/01_workflow.md",
      "references/02_subagent-roles.md",
      "references/03_classification-rules.md",
      "references/04_verification-checklist.md",
      "references/05_subagent-prompt-template.md",
      "references/06_policy-decisions.md",
      "references/07_second-pass-patterns.md",
      "references/subagents/batch-planner.yaml",
      "references/subagents/candidate-extractor.yaml",
      "references/subagents/module-export-auditor.yaml",
      "references/subagents/public-surface-auditor.yaml",
      "references/subagents/refuter.yaml",
      "references/subagents/runtime-usage-auditor.yaml",
      "references/subagents/surface-closure-auditor.yaml",
      "references/subagents/symmetry-auditor.yaml",
      "scripts/inventory-unused-symbols.mjs",
    ],
    forbiddenPaths: [
      "docs/skills/unused-symbol-pruning",
      "skills/unused-symbol-pruning",
    ],
    staleReferencePatterns: [
      "docs/skills/unused-symbol-pruning",
      "/.agent/skills/unused-symbol-pruning",
      "/.codex/skills/unused-symbol-pruning",
      "/Users/babashunsuke/.codex/skills/unused-symbol-pruning",
      "/Users/babashunsuke/.agents/skills/unused-symbol-pruning",
    ],
    jsonFiles: [],
    contentChecks: [
      {
        relativePath: "SKILL.md",
        includes: [
          "node .agents/skills/unused-symbol-pruning/scripts/inventory-unused-symbols.mjs",
          "references/06_policy-decisions.md",
          "references/07_second-pass-patterns.md",
        ],
      },
      {
        relativePath: "agents/openai.yaml",
        includes: [
          'display_name: "Unused Symbol Pruning"',
          "dead code and surface pruning",
        ],
      },
    ],
  },
];
const requiredRootFiles = [
  "AGENTS.md",
  "scripts/architecture/render-diagram-bundle.mjs",
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

for (const relativePath of requiredRootFiles) {
  if (!existsSync(resolveFromRoot(relativePath))) {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

for (const config of skillConfigs) {
  for (const requiredFile of config.requiredFiles) {
    const relativePath = path.posix.join(config.skillDir, requiredFile);

    if (!existsSync(resolveFromRoot(relativePath))) {
      errors.push(`Missing required file: ${relativePath}`);
    }
  }

  for (const relativePath of config.forbiddenPaths) {
    if (existsSync(resolveFromRoot(relativePath))) {
      errors.push(`Forbidden path still exists: ${relativePath}`);
    }
  }
}

if (errors.length === 0) {
  const agentsMarkdown = readUtf8("AGENTS.md");

  assertIncludes(
    agentsMarkdown,
    "`skills/` は公開用・配布用の Skill だけに使う。",
    errors,
    "AGENTS.md",
  );
  assertIncludes(
    agentsMarkdown,
    "repo-private な Codex Skill は `.agents/skills/` 配下に置く。",
    errors,
    "AGENTS.md",
  );
  assertIncludes(
    agentsMarkdown,
    "`.agents/skills/aipanel-diagrams/`",
    errors,
    "AGENTS.md",
  );
  assertIncludes(
    agentsMarkdown,
    "`.agents/skills/unused-symbol-pruning/`",
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

  for (const config of skillConfigs) {
    for (const check of config.contentChecks) {
      const relativePath = path.posix.join(config.skillDir, check.relativePath);
      const content = readUtf8(relativePath);

      for (const snippet of check.includes) {
        assertIncludes(content, snippet, errors, relativePath);
      }
    }

    for (const jsonFile of config.jsonFiles) {
      const relativePath = path.posix.join(config.skillDir, jsonFile);

      try {
        JSON.parse(readUtf8(relativePath));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Invalid JSON in ${relativePath}: ${message}`);
      }
    }

    for (const relativePath of collectFiles(config.skillDir)) {
      const extension = path.extname(relativePath);

      if (![".md", ".yaml", ".yml", ".json"].includes(extension)) {
        continue;
      }

      const content = readUtf8(relativePath);

      for (const pattern of config.staleReferencePatterns) {
        assertExcludes(content, pattern, errors, relativePath);
      }
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
    ...skillConfigs.map(
      (config) => `- checked required files under ${config.skillDir}`,
    ),
    "- confirmed deprecated docs/skills and legacy .agent paths are absent",
    "- confirmed AGENTS.md documents placement and validation rules",
    "- confirmed required JSON reference files parse cleanly",
  ].join("\n") + "\n",
);
