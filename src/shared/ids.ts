/**
 * ids を定義する。
 * このファイルは、ID 生成の最小 helper を shared に置き、context などが生成規約を共有できるようにするために存在する。
 */

import { randomUUID } from "node:crypto";

/**
 * Id を生成して返す。
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
 *
 * @param prefix 処理に渡す prefix。
 * @returns 生成または整形した文字列。
 */
export function createId(prefix = ""): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}
