import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import sourceCommentPlugin from "./scripts/lint/source-comment-contract-rule.mjs";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "docs/**",
      "tasks/**",
      "node_modules/**",
      ".serena/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
      ...config.languageOptions,
    },
  })),
  {
    files: ["src/**/*.ts"],
    plugins: {
      "source-comments": sourceCommentPlugin,
    },
    rules: {
      "source-comments/source-comment-contract": "error",
    },
  },
);
