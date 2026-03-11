import assert from "node:assert/strict";

export function parseJsonRecord(text: string): Record<string, unknown> {
  const value = JSON.parse(text);
  assertRecord(value);
  return value;
}

export function getRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  assertRecord(value);
  return value;
}

export function getArray(
  record: Record<string, unknown>,
  key: string,
): unknown[] {
  const value = record[key];
  assert.ok(Array.isArray(value), `Expected ${key} to be an array`);
  return value;
}

export function getRecordArray(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  return getArray(record, key).map((item) => {
    assertRecord(item);
    return item;
  });
}

export function getFirstRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const first = getRecordArray(record, key).at(0);
  assert.ok(first, `Expected ${key} to contain at least one record`);
  return first;
}

export function getStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const values: string[] = [];
  for (const item of getArray(record, key)) {
    assert.ok(typeof item === "string", `Expected ${key} items to be strings`);
    values.push(item);
  }

  return values;
}

export function getString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  assert.ok(typeof value === "string", `Expected ${key} to be a string`);
  return value;
}

export function getStringLiteral<T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number] {
  const value = getString(record, key);

  for (const candidate of allowed) {
    if (candidate === value) {
      return candidate;
    }
  }

  assert.fail(`Expected ${key} to be one of: ${allowed.join(", ")}`);
}

export function getOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  assert.ok(typeof value === "string", `Expected ${key} to be a string`);
  return value;
}

export function assertRecord(
  value: unknown,
): asserts value is Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === "object" && !Array.isArray(value),
  );
}
