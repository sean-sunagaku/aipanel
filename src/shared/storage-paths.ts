/**
 * storage paths を定義する。
 * このファイルは、collection record の保存パス規約を共有し、`<collection>/<id>.json` ルールを repository ごとに重複させないために存在する。
 */

import path from "node:path";

const DEFAULT_EXTENSION = ".json";

export interface CollectionPathParams {
  storageRoot: string;
  collectionName: string;
  entityId: string;
  extension?: `.${string}`;
}

export interface CollectionDirectoryParams {
  storageRoot: string;
  collectionName: string;
}

export interface CollectionPaths {
  directoryPath: string;
  filePath: string;
}

/**
 * Collection Directory Path を後続処理向けに組み立てる。
 * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
 *
 * @param options この宣言に必要なオプション。
 * @returns 生成または整形した文字列。
 */
export function buildCollectionDirectoryPath({
  storageRoot,
  collectionName,
}: CollectionDirectoryParams): string {
  return path.join(storageRoot, collectionName);
}

/**
 * Collection Paths を後続処理向けに組み立てる。
 * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
 *
 * @param options この宣言に必要なオプション。
 * @returns CollectionPaths。
 */
export function buildCollectionPaths({
  storageRoot,
  collectionName,
  entityId,
  extension,
}: CollectionPathParams): CollectionPaths {
  const normalizedExtension = normalizeCollectionExtension(extension);
  const directoryPath = buildCollectionDirectoryPath({
    storageRoot,
    collectionName,
  });
  const filePath = path.join(
    directoryPath,
    `${entityId}${normalizedExtension}`,
  );

  return { directoryPath, filePath };
}

/**
 * Collection Extension を安定した内部表現へ正規化する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param extension 処理に渡す extension。
 * @returns 生成または整形した文字列。
 * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
 */
function normalizeCollectionExtension(extension?: string): string {
  if (extension === undefined) {
    return DEFAULT_EXTENSION;
  }

  return extension.startsWith(".") ? extension : `.${extension}`;
}
