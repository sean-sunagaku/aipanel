import path from "node:path";

import ts from "typescript";

import {
  REPO_ROOT,
  collectDeclarations,
  listTypeScriptFiles,
  loadSource,
  normalizePath,
  writeJsonReport,
} from "./comment-contract.mjs";

const binRoot = path.join(REPO_ROOT, "bin");
const testRoot = path.join(REPO_ROOT, "test");
const reportRelativePath = "reports/symbol-context.json";
const shouldFailOnDeleteNow = process.argv.includes("--fail-on-delete-now");

function createLanguageServiceHost(fileNames) {
  const compilerOptions = {
    allowJs: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
  };
  const versions = new Map(fileNames.map((fileName) => [fileName, "0"]));

  return {
    compilerOptions,
    host: {
      getScriptFileNames: () => fileNames,
      getScriptVersion: (fileName) => versions.get(fileName) ?? "0",
      getScriptSnapshot: (fileName) => {
        if (!ts.sys.fileExists(fileName)) {
          return undefined;
        }

        return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName) ?? "");
      },
      getCompilationSettings: () => compilerOptions,
      getCurrentDirectory: () => REPO_ROOT,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    },
  };
}

function flattenReferenceEntries(references, origin) {
  const locations = [];

  for (const reference of references ?? []) {
    for (const entry of reference.references) {
      if (entry.isDefinition) {
        continue;
      }

      const relativePath = normalizePath(
        path.relative(REPO_ROOT, entry.fileName),
      );
      locations.push({
        filePath: relativePath,
        line: getLine(entry.fileName, entry.textSpan.start),
        isWriteAccess: entry.isWriteAccess,
      });
    }
  }

  return locations.filter(
    (location) =>
      !(
        location.filePath === origin.relativePath &&
        location.line === origin.line
      ),
  );
}

function getLine(fileName, position) {
  const text = ts.sys.readFile(fileName) ?? "";
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function classifyBucket(record, references) {
  const runtimeRefs = references.filter(
    (entry) =>
      entry.filePath.startsWith("src/") || entry.filePath.startsWith("bin/"),
  );
  const testRefs = references.filter((entry) =>
    entry.filePath.startsWith("test/"),
  );

  if (
    record.relativePath.startsWith("src/cli/") ||
    /src\/(artifact|providers|run|session|usecases)\//.test(
      record.relativePath,
    ) ||
    record.relativePath.startsWith("src/domain/") ||
    record.isRisky
  ) {
    return "protected";
  }

  if (record.isExported || runtimeRefs.length > 0 || testRefs.length > 0) {
    return "needs-context";
  }

  return "delete-now";
}

const srcFiles = await listTypeScriptFiles();
const runtimeFiles = ts.sys.directoryExists(binRoot)
  ? ts.sys
      .readDirectory(binRoot, [".ts"], undefined, undefined)
      .map((filePath) => path.resolve(filePath))
  : [];
const testFiles = ts.sys.directoryExists(testRoot)
  ? ts.sys
      .readDirectory(testRoot, [".ts"], undefined, undefined)
      .map((filePath) => path.resolve(filePath))
  : [];
const allFiles = [...new Set([...srcFiles, ...runtimeFiles, ...testFiles])];
const { compilerOptions, host } = createLanguageServiceHost(allFiles);
const languageService = ts.createLanguageService(
  host,
  ts.createDocumentRegistry(),
);
void compilerOptions;

const declarations = [];
for (const filePath of srcFiles) {
  const { text, sourceFile } = await loadSource(filePath);
  declarations.push(...collectDeclarations(filePath, sourceFile, text));
}

const symbols = declarations.map((record) => {
  const references = languageService.findReferences(
    record.filePath,
    record.symbolNameStart,
  );
  const referenceEntries = flattenReferenceEntries(references, record);
  return {
    symbolPath: record.symbolPath,
    filePath: record.relativePath,
    line: record.line,
    kind: record.kind,
    exported: record.isExported,
    visibility: record.visibility,
    risky: record.isRisky,
    rationaleSignalCount: record.rationaleSignalCount,
    needsPurposeReview: record.rationaleSignalCount >= 2,
    bucket: classifyBucket(record, referenceEntries),
    references: referenceEntries,
  };
});

const protectedCount = symbols.filter(
  (symbol) => symbol.bucket === "protected",
).length;
const deleteNowCount = symbols.filter(
  (symbol) => symbol.bucket === "delete-now",
).length;

const reportPath = await writeJsonReport(reportRelativePath, {
  generatedAt: new Date().toISOString(),
  summary: {
    totalSymbols: symbols.length,
    protectedCount,
    deleteNowCount,
  },
  symbols,
});

console.log(
  `シンボル文脈レポートを出力しました: ${normalizePath(path.relative(REPO_ROOT, reportPath))}`,
);

if (deleteNowCount > 0) {
  console.log("delete-now 候補:");
  for (const symbol of symbols.filter(
    (entry) => entry.bucket === "delete-now",
  )) {
    console.log(`- ${symbol.filePath}:${symbol.line} ${symbol.symbolPath}`);
  }
}

if (shouldFailOnDeleteNow && deleteNowCount > 0) {
  process.exitCode = 1;
}
