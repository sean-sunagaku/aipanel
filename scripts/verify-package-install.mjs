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

function parseTrailingJson(output) {
  const trimmed = output.trim();
  const objectStart = trimmed.lastIndexOf("\n{");
  const arrayStart = trimmed.lastIndexOf("\n[");
  const jsonStart = Math.max(objectStart, arrayStart);
  const jsonText =
    jsonStart >= 0
      ? trimmed.slice(jsonStart + 1)
      : trimmed.startsWith("{") || trimmed.startsWith("[")
        ? trimmed
        : "";

  if (!jsonText) {
    throw new Error(
      "Could not locate JSON payload in `pnpm pack --json` output.",
    );
  }

  return JSON.parse(jsonText);
}

const installRoot = mkdtempSync(path.join(tmpdir(), "aipanel-package-"));
const packageName = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
).name;
let tarballPath;

try {
  const packOutput = run("pnpm", ["pack", "--json"]);
  const packResult = parseTrailingJson(packOutput);
  const tarballFileName = Array.isArray(packResult)
    ? packResult[0]?.filename
    : packResult?.filename;

  if (!tarballFileName) {
    throw new Error(
      "Could not determine tarball filename from `pnpm pack --json`.",
    );
  }

  tarballPath = path.resolve(tarballFileName);

  run("pnpm", ["add", "--dir", installRoot, tarballPath]);

  const providersOutput = run("pnpm", [
    "--dir",
    installRoot,
    "exec",
    "aipanel",
    "providers",
    "--json",
  ]);
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

  process.stdout.write(
    `${JSON.stringify(
      {
        packageName,
        tarball: path.basename(tarballPath),
        installedInto: installRoot,
        providers,
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
