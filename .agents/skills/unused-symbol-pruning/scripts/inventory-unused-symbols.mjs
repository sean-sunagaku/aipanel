#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DEFAULT_CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const DEFAULT_RUNTIME_ROOTS = ["src", "scripts", "bin", "cli", "app"];
const DEFAULT_TEST_ROOTS = ["test"];
const DEFAULT_DOC_FILES = ["README.md", "package.json"];

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    root: ".",
    runtime: [...DEFAULT_RUNTIME_ROOTS],
    tests: [...DEFAULT_TEST_ROOTS],
    docs: [...DEFAULT_DOC_FILES],
    extensions: [...DEFAULT_CODE_EXTENSIONS],
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    const next = argv[index + 1];

    if (!next) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--root") {
      options.root = next;
      index += 1;
      continue;
    }

    if (arg === "--runtime") {
      options.runtime = splitList(next);
      index += 1;
      continue;
    }

    if (arg === "--tests") {
      options.tests = splitList(next);
      index += 1;
      continue;
    }

    if (arg === "--docs") {
      options.docs = splitList(next);
      index += 1;
      continue;
    }

    if (arg === "--extensions") {
      options.extensions = splitList(next).map((item) =>
        item.startsWith(".") ? item : `.${item}`,
      );
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}

function isIgnoredMethodName(name) {
  return new Set([
    "constructor",
    "if",
    "for",
    "while",
    "switch",
    "catch",
  ]).has(name);
}

function categorize(relativeFile, symbol) {
  const normalized = relativeFile.toLowerCase();
  const lowerSymbol = symbol.toLowerCase();

  if (
    normalized.startsWith("scripts/") ||
    normalized.includes("/scripts/") ||
    lowerSymbol.includes("validate") ||
    lowerSymbol.includes("check")
  ) {
    return "validator-or-tooling";
  }

  if (
    normalized.startsWith("bin/") ||
    normalized.includes("/bin/") ||
    normalized.includes("/cli/")
  ) {
    return "cli-surface";
  }

  return "application";
}

function listCodeFiles(rootDir, roots, extensions) {
  const resolvedRoots = roots
    .map((item) => path.resolve(rootDir, item))
    .filter((item) => existsSync(item));

  if (resolvedRoots.length === 0) {
    return [];
  }

  const output = execFileSync("rg", ["--files", ...resolvedRoots], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((item) => path.relative(rootDir, item))
    .filter((item) => extensions.includes(path.extname(item)));
}

function findMatches(rootDir, pattern, targets) {
  const resolvedTargets = targets
    .map((item) => path.resolve(rootDir, item))
    .filter((item) => existsSync(item));

  if (resolvedTargets.length === 0) {
    return [];
  }

  try {
    const output = execFileSync(
      "rg",
      [
        "-n",
        "--no-heading",
        "--color",
        "never",
        "--glob",
        "!dist/**",
        "--glob",
        "!node_modules/**",
        "--glob",
        "!.git/**",
        pattern,
        ...resolvedTargets,
      ],
      {
        cwd: rootDir,
        encoding: "utf8",
      },
    ).trim();

    if (!output) {
      return [];
    }

    return output.split("\n");
  } catch (error) {
    if (error.status === 1) {
      return [];
    }

    throw error;
  }
}

function detectSymbols(rootDir, files) {
  const symbols = [];

  for (const relativeFile of files) {
    const absoluteFile = path.resolve(rootDir, relativeFile);
    const lines = readFileSync(absoluteFile, "utf8").split(/\r?\n/u);
    const classStack = [];
    let braceDepth = 0;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      const classMatch = trimmed.match(
        /^(export\s+)?(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)\b/u,
      );
      const interfaceMatch = trimmed.match(
        /^(export\s+)?interface\s+([A-Za-z_][A-Za-z0-9_]*)\b/u,
      );
      const typeMatch = trimmed.match(
        /^(export\s+)?type\s+([A-Za-z_][A-Za-z0-9_]*)\b/u,
      );
      const enumMatch = trimmed.match(
        /^(export\s+)?enum\s+([A-Za-z_][A-Za-z0-9_]*)\b/u,
      );
      const constMatch = trimmed.match(
        /^(export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\b/u,
      );
      const functionMatch = trimmed.match(
        /^(export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/u,
      );

      if (classMatch) {
        classStack.push({
          name: classMatch[2],
          exported: Boolean(classMatch[1]),
          depth: braceDepth + countOccurrences(line, "{"),
        });
        symbols.push({
          symbol: classMatch[2],
          owner: null,
          kind: "class",
          exported: Boolean(classMatch[1]),
          file: relativeFile,
          line: index + 1,
          categoryHint: categorize(relativeFile, classMatch[2]),
        });
      } else if (interfaceMatch) {
        symbols.push({
          symbol: interfaceMatch[2],
          owner: null,
          kind: "interface",
          exported: Boolean(interfaceMatch[1]),
          file: relativeFile,
          line: index + 1,
          categoryHint: categorize(relativeFile, interfaceMatch[2]),
        });
      } else if (typeMatch) {
        symbols.push({
          symbol: typeMatch[2],
          owner: null,
          kind: "type-alias",
          exported: Boolean(typeMatch[1]),
          file: relativeFile,
          line: index + 1,
          categoryHint: categorize(relativeFile, typeMatch[2]),
        });
      } else if (enumMatch) {
        symbols.push({
          symbol: enumMatch[2],
          owner: null,
          kind: "enum",
          exported: Boolean(enumMatch[1]),
          file: relativeFile,
          line: index + 1,
          categoryHint: categorize(relativeFile, enumMatch[2]),
        });
      } else if (constMatch) {
        symbols.push({
          symbol: constMatch[2],
          owner: null,
          kind: "const",
          exported: Boolean(constMatch[1]),
          file: relativeFile,
          line: index + 1,
          categoryHint: categorize(relativeFile, constMatch[2]),
        });
      } else if (functionMatch) {
        symbols.push({
          symbol: functionMatch[2],
          owner: null,
          kind: "function",
          exported: Boolean(functionMatch[1]),
          file: relativeFile,
          line: index + 1,
          categoryHint: categorize(relativeFile, functionMatch[2]),
        });
      } else if (classStack.length > 0) {
        const owner = classStack[classStack.length - 1];
        const isClassTopLevel = braceDepth === owner.depth;
        const accessorMatch = trimmed.match(
          /^(?:public|protected|private|readonly|override|abstract|declare|\s)*(get|set)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^;=]*\))?\s*(?::[^=]+)?\s*\{/u,
        );
        const methodMatch = trimmed.match(
          /^(?:public|protected|private|readonly|override|abstract|declare|async|\s)*(static\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^;=]*\)\s*(?::[^=]+)?\s*\{/u,
        );
        const fieldMatch = trimmed.match(
          /^(?:public|protected|private|readonly|override|declare|static|\s)*(#?[A-Za-z_][A-Za-z0-9_]*)\s*(?:!|\?)?\s*(?::[^=;]+)?(?:=\s*[^;]+)?;$/u,
        );

        if (isClassTopLevel && accessorMatch) {
          const accessorName = accessorMatch[2];
          symbols.push({
            symbol: accessorName,
            owner: owner.name,
            kind: accessorMatch[1] === "get" ? "getter" : "setter",
            exported: owner.exported,
            file: relativeFile,
            line: index + 1,
            categoryHint: categorize(relativeFile, accessorName),
          });
        } else if (isClassTopLevel && methodMatch) {
          const methodName = methodMatch[2];

          if (!isIgnoredMethodName(methodName)) {
            symbols.push({
              symbol: methodName,
              owner: owner.name,
              kind: methodMatch[1] ? "static-method" : "method",
              exported: owner.exported,
              file: relativeFile,
              line: index + 1,
              categoryHint: categorize(relativeFile, methodName),
            });
          }
        } else if (isClassTopLevel && fieldMatch) {
          const fieldName = fieldMatch[1];

          if (!isIgnoredMethodName(fieldName)) {
            symbols.push({
              symbol: fieldName,
              owner: owner.name,
              kind: "field",
              exported: owner.exported,
              file: relativeFile,
              line: index + 1,
              categoryHint: categorize(relativeFile, fieldName),
            });
          }
        }
      }

      braceDepth += countOccurrences(line, "{");
      braceDepth -= countOccurrences(line, "}");

      while (
        classStack.length > 0 &&
        braceDepth < classStack[classStack.length - 1].depth
      ) {
        classStack.pop();
      }
    }
  }

  return symbols;
}

function buildPatterns(symbol) {
  if (symbol.kind === "method" || symbol.kind === "static-method") {
    return {
      runtime: `\\.${symbol.symbol}\\s*\\(`,
      tests: `\\.${symbol.symbol}\\s*\\(`,
      docs: `\\b${symbol.symbol}\\b`,
    };
  }

  if (
    symbol.kind === "getter" ||
    symbol.kind === "setter" ||
    symbol.kind === "field"
  ) {
    return {
      runtime: `\\.${symbol.symbol}\\b`,
      tests: `\\.${symbol.symbol}\\b`,
      docs: `\\b${symbol.symbol}\\b`,
    };
  }

  return {
    runtime: `\\b${symbol.symbol}\\b`,
    tests: `\\b${symbol.symbol}\\b`,
    docs: `\\b${symbol.symbol}\\b`,
  };
}

function dedupeSymbols(symbols) {
  const byKey = new Map();

  for (const symbol of symbols) {
    const key = [
      symbol.owner ?? "",
      symbol.symbol,
      symbol.kind,
      symbol.file,
      symbol.line,
    ].join(":");

    if (!byKey.has(key)) {
      byKey.set(key, symbol);
    }
  }

  return [...byKey.values()];
}

function toReport(rootDir, options, symbols) {
  return dedupeSymbols(symbols).map((symbol) => {
    const patterns = buildPatterns(symbol);
    const runtimeMatches = findMatches(rootDir, patterns.runtime, options.runtime);
    const testMatches = findMatches(rootDir, patterns.tests, options.tests);
    const docMatches = findMatches(rootDir, patterns.docs, options.docs);

    return {
      id: symbol.owner ? `${symbol.owner}.${symbol.symbol}` : symbol.symbol,
      symbol: symbol.symbol,
      owner: symbol.owner,
      kind: symbol.kind,
      exported: symbol.exported,
      file: symbol.file,
      line: symbol.line,
      categoryHint: symbol.categoryHint,
      runtimeRefCount: runtimeMatches.length,
      testRefCount: testMatches.length,
      docRefCount: docMatches.length,
      likelyUnused:
        runtimeMatches.length === 0 &&
        testMatches.length === 0 &&
        docMatches.length === 0,
    };
  });
}

function printTable(report) {
  const rows = report
    .sort((left, right) => {
      if (left.runtimeRefCount !== right.runtimeRefCount) {
        return left.runtimeRefCount - right.runtimeRefCount;
      }

      return left.file.localeCompare(right.file);
    })
    .map((item) =>
      [
        item.id,
        item.kind,
        item.exported ? "exported" : "internal",
        item.file,
        String(item.line),
        String(item.runtimeRefCount),
        String(item.testRefCount),
        String(item.docRefCount),
        item.categoryHint,
      ].join("\t"),
    );

  process.stdout.write(
    [
      "id\tkind\texported\tfile\tline\truntimeRefs\ttestRefs\tdocRefs\tcategory",
      ...rows,
    ].join("\n") + "\n",
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(process.cwd(), options.root);
  const files = listCodeFiles(
    rootDir,
    [...new Set([...options.runtime, ...options.tests])],
    options.extensions,
  );
  const symbols = detectSymbols(rootDir, files);
  const report = toReport(rootDir, options, symbols);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  printTable(report);
}

main();
