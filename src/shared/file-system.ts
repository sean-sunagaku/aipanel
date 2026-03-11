import { access, readFile } from "node:fs/promises";

/**
 * Text を読み取る。
 * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
 *
 * @param path 対象のパス。
 * @param encoding 処理に渡す encoding。
 * @returns string を解決する Promise。
 */
export async function readText(
  path: string,
  encoding: BufferEncoding = "utf8",
): Promise<string> {
  return readFile(path, encoding);
}

/**
 * path Exists を担当する。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 *
 * @param path 対象のパス。
 * @returns boolean を解決する Promise。
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
