/**
 * artifact paths を定義する。
 * このファイルは、artifact の保存先ディレクトリとメタデータパスの規約を一箇所で共有し、path 組み立ての重複を防ぐために存在する。
 */

import path from "node:path";

const DEFAULT_EXTENSION = ".txt";
const DEFAULT_RUN_ID = "_shared";
const METADATA_SUFFIX = ".artifact.json";

export interface ArtifactPathParams {
  storageRoot: string;
  artifactId: string;
  runId?: string | null;
  extension?: `.${string}`;
}

export interface ArtifactPaths {
  runDirectory: string;
  contentPath: string;
  metadataPath: string;
}

/**
 * Artifact Paths を後続処理向けに組み立てる。
 * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
 *
 * @param options この宣言に必要なオプション。
 * @returns ArtifactPaths。
 */
export function buildArtifactPaths({
  storageRoot,
  artifactId,
  runId,
  extension,
}: ArtifactPathParams): ArtifactPaths {
  const runDirectory = path.join(
    storageRoot,
    "artifacts",
    runId ?? DEFAULT_RUN_ID,
  );
  const normalizedExtension = normalizeArtifactExtension(extension);

  return {
    runDirectory,
    contentPath: path.join(runDirectory, `${artifactId}${normalizedExtension}`),
    metadataPath: path.join(runDirectory, `${artifactId}${METADATA_SUFFIX}`),
  };
}

/**
 * Artifact Extension を安定した内部表現へ正規化する。
 * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
 *
 * @param extension 処理に渡す extension。
 * @returns 生成または整形した文字列。
 * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
 */
function normalizeArtifactExtension(extension?: string): string {
  if (extension === undefined) {
    return DEFAULT_EXTENSION;
  }

  return extension.startsWith(".") ? extension : `.${extension}`;
}
