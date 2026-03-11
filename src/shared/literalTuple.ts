/**
 * literal Tuple を定義する。
 * このファイルは、literal 配列から runtime 値と union 型を同時に作る helper を共有し、`as const` に頼らない型定義を支えるために存在する。
 *
 * @param values 処理に渡す values。
 * @returns 収集した T の一覧。
 */
export function literalTuple<const T extends readonly string[]>(
  ...values: T
): T {
  return values;
}
