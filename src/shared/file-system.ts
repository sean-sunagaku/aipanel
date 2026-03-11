/**
 * file system を定義する。
 * このファイルは、小さな filesystem helper を shared に寄せ、readText / pathExists を複数層で重複実装しないようにするために存在する。
 */

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
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
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
