import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

function usage(exitCode = 1) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(
    [
      "Usage:",
      "  node scripts/add-worktree.mjs <branch> [--base <ref>] [--path <relative-path>]",
      "",
      "Examples:",
      "  node scripts/add-worktree.mjs feature/debug-ui",
      "  node scripts/add-worktree.mjs feature/debug-ui --base origin/main",
      "  node scripts/add-worktree.mjs hotfix/login --path .worktree/hotfix-login",
      "",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function branchExists(ref) {
  const result = spawnSync("git", ["show-ref", "--verify", "--quiet", ref], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  return result.status === 0;
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  usage(args.length === 0 ? 1 : 0);
}

const branch = args[0];

if (!branch || branch.startsWith("-")) {
  usage(1);
}

let baseRef = "HEAD";
let worktreeRelativePath = path.join(".worktree", branch);

for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === "--base") {
    const value = args[index + 1];
    if (!value) {
      usage(1);
    }
    baseRef = value;
    index += 1;
    continue;
  }

  if (arg === "--path") {
    const value = args[index + 1];
    if (!value) {
      usage(1);
    }
    worktreeRelativePath = value;
    index += 1;
    continue;
  }

  usage(1);
}

const repoRoot = run("git", ["rev-parse", "--show-toplevel"]);
const worktreePath = path.resolve(repoRoot, worktreeRelativePath);

if (existsSync(worktreePath)) {
  process.stderr.write(`Worktree path already exists: ${worktreePath}\n`);
  process.exit(1);
}

mkdirSync(path.dirname(worktreePath), { recursive: true });

const localBranchRef = `refs/heads/${branch}`;
const remoteBranchName = `origin/${branch}`;
const remoteBranchRef = `refs/remotes/${remoteBranchName}`;

let gitArgs;
let modeLabel;

if (branchExists(localBranchRef)) {
  gitArgs = ["worktree", "add", worktreePath, branch];
  modeLabel = "existing-local-branch";
} else if (branchExists(remoteBranchRef)) {
  gitArgs = [
    "worktree",
    "add",
    "--track",
    "-b",
    branch,
    worktreePath,
    remoteBranchName,
  ];
  modeLabel = "tracking-origin-branch";
} else {
  gitArgs = ["worktree", "add", "-b", branch, worktreePath, baseRef];
  modeLabel = "new-branch-from-base";
}

const result = spawnSync("git", gitArgs, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

process.stdout.write(
  [
    "",
    `Created worktree: ${worktreePath}`,
    `Branch: ${branch}`,
    `Mode: ${modeLabel}`,
    `Next: cd ${JSON.stringify(worktreePath)}`,
    "",
  ].join("\n"),
);
