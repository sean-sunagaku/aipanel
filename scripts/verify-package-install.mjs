import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

const installRoot = mkdtempSync(path.join(tmpdir(), "aipanel-package-"));
const packageName = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
).name;
let tarballPath;

try {
  const packOutput = run("npm", ["pack", "--json"]);
  const packResult = JSON.parse(packOutput);
  const tarballFileName = Array.isArray(packResult)
    ? packResult[0]?.filename
    : undefined;

  if (!tarballFileName) {
    throw new Error(
      "Could not determine tarball filename from `npm pack --json`.",
    );
  }

  tarballPath = path.resolve(tarballFileName);

  run("npm", ["install", "--prefix", installRoot, tarballPath]);

  const binaryPath = path.join(installRoot, "node_modules", ".bin", "aipanel");
  const providersOutput = run(binaryPath, ["providers", "--json"]);
  const providersPayload = JSON.parse(providersOutput);
  const providers = Array.isArray(providersPayload.providers)
    ? providersPayload.providers
    : [];

  if (
    providersPayload.kind !== "providers" ||
    !providers.includes("claude-code")
  ) {
    throw new Error(
      "Packaged CLI did not return the expected provider payload.",
    );
  }

  const importCheckOutput = run(
    "node",
    [
      "--input-type=module",
      "--eval",
      [
        `const root = await import(${JSON.stringify(packageName)});`,
        `const domain = await import(${JSON.stringify(`${packageName}/domain`)});`,
        "const summary = {",
        "  rootExports: ['AipanelApp', 'CommandRouter', 'runCli', 'Session', 'Run'].filter((key) => key in root),",
        "  hasDomainSession: typeof domain.Session === 'function',",
        "  hasDomainRun: typeof domain.Run === 'function',",
        "};",
        "if (!summary.rootExports.includes('AipanelApp') || !summary.rootExports.includes('runCli') || !summary.hasDomainSession || !summary.hasDomainRun) {",
        "  throw new Error(`Import verification failed: ${JSON.stringify(summary)}`);",
        "}",
        "console.log(JSON.stringify(summary));",
      ].join("\n"),
    ],
    { cwd: installRoot },
  );
  const importCheck = JSON.parse(importCheckOutput);

  process.stdout.write(
    `${JSON.stringify(
      {
        packageName,
        tarball: path.basename(tarballPath),
        installedInto: installRoot,
        providers,
        importCheck,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
  rmSync(installRoot, { recursive: true, force: true });
}
