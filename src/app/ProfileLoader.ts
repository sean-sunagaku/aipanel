import path from "node:path";

import { pathExists, readText } from "../shared/file-system.js";

export interface Profile {
  defaultProvider: string;
  defaultModel?: string;
  defaultTimeoutMs: number;
}

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

export class ProfileLoader {
  readonly storageRoot: string;

  constructor(storageRoot: string = path.join(process.cwd(), ".aipanel")) {
    this.storageRoot = storageRoot;
  }

  get profilePath(): string {
    return path.join(this.storageRoot, "profile.yml");
  }

  async load(): Promise<Profile> {
    const defaults: Profile = {
      defaultProvider: "claude-code",
      defaultTimeoutMs: 120000,
    };

    if (!(await pathExists(this.profilePath))) {
      return defaults;
    }

    const text = await readText(this.profilePath, "utf8");
    return {
      ...defaults,
      ...parseSimpleYaml(text),
    };
  }
}
