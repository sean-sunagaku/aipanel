import { access, readFile } from "node:fs/promises";

export async function readText(
  path: string,
  encoding: BufferEncoding = "utf8",
): Promise<string> {
  return readFile(path, encoding);
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
