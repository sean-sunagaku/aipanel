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
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 *
 * @param value 処理に渡す value。
 * @returns 収集した T の一覧。
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * compact Object を担当する。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
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
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
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

  return { [key]: value };
}
