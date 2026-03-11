import path from "node:path";

import { pathExists, readText } from "../shared/file-system.js";

interface Profile {
  defaultProvider: string;
  defaultModel?: string;
  defaultTimeoutMs: number;
}

/**
 * Simple Yaml を内部表現へ解釈する。
 * 入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。
 *
 * @param text 処理対象のテキスト。
 * @returns Partial<Profile>。
 * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
 */
function parseSimpleYaml(text: string): Partial<Profile> {
  const profile: Partial<Profile> = {};

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf(":");
    if (index < 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();

    if (key === "defaultProvider") {
      profile.defaultProvider = value;
    }

    if (key === "defaultModel") {
      profile.defaultModel = value;
    }

    if (key === "defaultTimeoutMs") {
      const timeout = Number(value);
      if (Number.isFinite(timeout)) {
        profile.defaultTimeoutMs = timeout;
      }
    }
  }

  return profile;
}

/**
 * Profile Loader の責務を一箇所にまとめる。
 * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
 */
export class ProfileLoader {
  readonly storageRoot: string;

  constructor(storageRoot: string = path.join(process.cwd(), ".aipanel")) {
    this.storageRoot = storageRoot;
  }

  /**
   * データ を読み込んで既定値を補う。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns Profile を解決する Promise。
   */
  async load(): Promise<Profile> {
    const defaults: Profile = {
      defaultProvider: "claude-code",
      defaultTimeoutMs: 120000,
    };
    const profilePath = path.join(this.storageRoot, "profile.yml");

    if (!(await pathExists(profilePath))) {
      return defaults;
    }

    const text = await readText(profilePath, "utf8");
    return {
      ...defaults,
      ...parseSimpleYaml(text),
    };
  }
}
