/**
 * domain 共通の基礎定義をまとめる。
 * このファイルは、domain entity / value object が共有する schema version・時刻・ID・serialize helper を揃え、モデルごとに基礎契約がぶれないようにするために存在する。
 */

import crypto from "node:crypto";

export const SCHEMA_VERSION = 1;

export type IsoDateString = string;
export type Clock = () => IsoDateString;
export type IdGenerator = (prefix: string) => string;

export const defaultClock: Clock = () => new Date().toISOString();
export const defaultIdGenerator: IdGenerator = (prefix) =>
  `${prefix}_${crypto.randomUUID()}`;

/**
 * ensure Array を担当する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns 収集した T の一覧。
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * compact Object を担当する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param value 処理に渡す value。
 * @returns T。
 */
export function compactObject<T extends Record<string, unknown>>(value: T): T {
  const serialized = JSON.stringify(value, (_, current) =>
    current === undefined ? undefined : current,
  );
  return JSON.parse(serialized);
}

/**
 * optional Prop を担当する。
 * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
 *
 * @param key 処理に渡す key。
 * @param value 処理に渡す value。
 * @returns Partial<Record<K, V>>。
 */
export function optionalProp<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  if (value === undefined) {
    return {};
  }

  const result: Partial<Record<K, V>> = {};
  result[key] = value;
  return result;
}
