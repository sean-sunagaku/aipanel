import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function ensureParentDirectory(path: string): Promise<void> {
  await ensureDirectory(dirname(path));
}

export async function readText(
  path: string,
  encoding: BufferEncoding = "utf8",
): Promise<string> {
  return readFile(path, encoding);
}

export async function writeText(
  path: string,
  contents: string,
  encoding: BufferEncoding = "utf8",
): Promise<void> {
  await ensureParentDirectory(path);
  await writeFile(path, contents, encoding);
}

export async function readJson<T>(path: string): Promise<T> {
  const text = await readText(path, "utf8");
  return JSON.parse(text) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await writeText(path, text, "utf8");
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function listDirectory(path: string): Promise<string[]> {
  return readdir(path);
}
