import crypto from "node:crypto";

export const SCHEMA_VERSION = 1 as const;

export type IsoDateString = string;
export type Clock = () => IsoDateString;
export type IdGenerator = (prefix: string) => string;

export const defaultClock: Clock = () => new Date().toISOString();
export const defaultIdGenerator: IdGenerator = (prefix) =>
  `${prefix}_${crypto.randomUUID()}`;

export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function coerceRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

export function optionalProp<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  if (value === undefined) {
    return {};
  }

  return { [key]: value } as Partial<Record<K, V>>;
}
