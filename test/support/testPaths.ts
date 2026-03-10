import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

export const REPO_ROOT = path.resolve(currentDirectory, "..", "..");
export const BUILT_CLI_PATH = path.join(REPO_ROOT, "dist", "bin", "aipanel.js");
