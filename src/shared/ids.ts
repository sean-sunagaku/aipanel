import { randomUUID } from "node:crypto";

/**
 * Id を生成して返す。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 *
 * @param prefix 処理に渡す prefix。
 * @returns 生成または整形した文字列。
 */
export function createId(prefix = ""): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}
