import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const SRC_ROOT = path.join(REPO_ROOT, "src");
export const REPORTS_ROOT = path.join(REPO_ROOT, "reports");

const TARGET_EXTENSIONS = new Set([".ts"]);
const RISKY_NAME_PATTERN =
  /(append|build|call|collect|compare|create|execute|format|fromJSON|load|normalize|parse|read|render|route|save|serialize|transition|update|upsert|write)/i;
const RISKY_TEXT_PATTERN =
  /\b(access|appendTurn|buildTranscript|collect|createHash|JSON\.parse|JSON\.stringify|mkdir|readFile|spawn|stat|transition|writeFile)\b/;
const RISKY_PATH_PATTERN =
  /src\/(artifact|compare|context|providers|run|session|usecases)\//;
const SERIALIZATION_NAME_PATTERN = /^(fromJSON|toJSON)$/;
const PROTECTED_PATH_PATTERN =
  /src\/(artifact|cli|providers|run|session|usecases)\//;

/**
 * `src` 配下の TypeScript ファイルを再帰的に列挙する。
 */
export async function listTypeScriptFiles(rootDir = SRC_ROOT) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listTypeScriptFiles(absolutePath);
      }

      if (!TARGET_EXTENSIONS.has(path.extname(entry.name))) {
        return [];
      }

      return [absolutePath];
    }),
  );

  return files.flat().sort();
}

/**
 * 指定ファイルを SourceFile として読み込む。
 */
export async function loadSource(filePath) {
  const text = await readFile(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return { text, sourceFile };
}

/**
 * `src` で管理したい宣言を収集する。
 */
export function collectDeclarations(filePath, sourceFile, sourceText) {
  const declarations = [];

  function visit(node, parentClassName = null) {
    if (ts.isClassDeclaration(node) && node.name) {
      declarations.push(
        createDeclarationRecord(filePath, sourceFile, sourceText, node, {
          kind: "class",
          name: node.name.text,
          parentClassName,
        }),
      );
      node.members.forEach((member) => visit(member, node.name.text));
      return;
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      declarations.push(
        createDeclarationRecord(filePath, sourceFile, sourceText, node, {
          kind: "function",
          name: node.name.text,
          parentClassName,
        }),
      );
      return;
    }

    if (
      ts.isMethodDeclaration(node) &&
      node.name &&
      (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name))
    ) {
      declarations.push(
        createDeclarationRecord(filePath, sourceFile, sourceText, node, {
          kind: "method",
          name: ts.isPrivateIdentifier(node.name)
            ? `#${node.name.text}`
            : node.name.text,
          parentClassName,
        }),
      );
      return;
    }

    ts.forEachChild(node, (child) => visit(child, parentClassName));
  }

  visit(sourceFile);
  return declarations;
}

/**
 * 宣言メタデータを作る。
 */
export function createDeclarationRecord(
  filePath,
  sourceFile,
  sourceText,
  node,
  meta,
) {
  const relativePath = normalizePath(path.relative(REPO_ROOT, filePath));
  const line =
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;
  const comment = getLeadingJsDoc(sourceText, node);
  const bodyText = node.getText(sourceFile);
  const isExported =
    ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)
      ? hasModifier(node, ts.SyntaxKind.ExportKeyword)
      : false;
  const visibility = ts.isMethodDeclaration(node) ? getVisibility(node) : null;
  const parameters =
    "parameters" in node
      ? node.parameters.map((parameter, index) =>
          getParameterDocName(parameter, index),
        )
      : [];
  const returnsTag = getReturnTagInfo(node);
  const throwsTagRequired = hasDirectThrow(node);
  const rationaleSignalCount = countRationaleSignals(node);
  const remarksTagRequired = meta.kind !== "class" && rationaleSignalCount >= 2;

  return {
    filePath,
    relativePath,
    line,
    kind: meta.kind,
    name: meta.name,
    parentClassName: meta.parentClassName,
    symbolPath: meta.parentClassName
      ? `${meta.parentClassName}.${meta.name}`
      : meta.name,
    symbolNameStart: node.name.getStart(sourceFile),
    isExported,
    visibility,
    parameters,
    returnsTag,
    throwsTagRequired,
    rationaleSignalCount,
    remarksTagRequired,
    isRisky: isRiskyDeclaration({
      relativePath,
      name: meta.name,
      kind: meta.kind,
      bodyText,
      rationaleSignalCount,
    }),
    comment,
    commentLines: normalizeCommentLines(comment?.rawText ?? ""),
    bodyText,
    nodeStart: node.getStart(sourceFile),
    nodeEnd: node.getEnd(),
  };
}

/**
 * コメント契約を検査する。
 */
export function validateDeclaration(record) {
  const errors = [];
  const summaryLine = record.commentLines.find((line) => !line.startsWith("@"));
  const detailLines = record.commentLines
    .slice(summaryLine ? record.commentLines.indexOf(summaryLine) + 1 : 0)
    .filter((line) => !line.startsWith("@"));

  if (!record.comment) {
    errors.push("コメントがありません。");
    return errors;
  }

  if (!summaryLine || summaryLine.length < 10) {
    errors.push("要約行が短すぎるか、要約として読めません。");
  }

  if (summaryLine && looksPlaceholder(summaryLine, record.name)) {
    errors.push("要約行がプレースホルダー的です。");
  }

  if (record.isRisky && detailLines.length === 0) {
    errors.push(
      "重要な宣言は要約の直後に、目的や設計上の意味を JSDoc で補足してください。",
    );
  }

  for (const parameterName of record.parameters) {
    if (!hasParamTag(record.commentLines, parameterName)) {
      errors.push(
        `引数 \`${parameterName}\` の ` + "`@param`" + " がありません。",
      );
    }
  }

  if (record.returnsTag.required && !hasTag(record.commentLines, "@returns")) {
    errors.push("戻り値を持つ宣言には `@returns` が必要です。");
  }

  if (record.throwsTagRequired && !hasTag(record.commentLines, "@throws")) {
    errors.push("直接例外を投げる宣言には `@throws` が必要です。");
  }

  if (record.remarksTagRequired && !hasTag(record.commentLines, "@remarks")) {
    errors.push("分岐や制御が複雑な宣言には `@remarks` が必要です。");
  }

  return errors;
}

/**
 * コメントが薄すぎるかをざっくり判定する。
 */
export function looksPlaceholder(summaryLine, symbolName) {
  const normalized = summaryLine.replace(/[。.!！?？\s]/g, "");
  if (!normalized) {
    return true;
  }

  if (normalized === symbolName) {
    return true;
  }

  return /^(処理|関数|メソッド|クラス|ロジック)(です|する)$/.test(normalized);
}

export function isRiskyDeclaration({
  relativePath,
  name,
  kind,
  bodyText,
  rationaleSignalCount = 0,
}) {
  if (kind === "class" && PROTECTED_PATH_PATTERN.test(relativePath)) {
    return true;
  }

  if (SERIALIZATION_NAME_PATTERN.test(name)) {
    return true;
  }

  if (RISKY_PATH_PATTERN.test(relativePath) && RISKY_NAME_PATTERN.test(name)) {
    return true;
  }

  if (rationaleSignalCount >= 2) {
    return true;
  }

  return RISKY_TEXT_PATTERN.test(bodyText);
}

/**
 * 宣言用の leading JSDoc を取得する。
 */
export function getLeadingJsDoc(sourceText, node) {
  const ranges =
    ts.getLeadingCommentRanges(sourceText, node.getFullStart()) ?? [];
  const nodeStart = node.getStart();

  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const range = ranges[index];
    const rawText = sourceText.slice(range.pos, range.end);
    const between = sourceText.slice(range.end, nodeStart).trim();
    if (rawText.startsWith("/**") && between === "") {
      return { rawText, pos: range.pos, end: range.end };
    }
  }

  return null;
}

/**
 * JSDoc から行単位テキストを作る。
 */
export function normalizeCommentLines(commentText) {
  return commentText
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*\/\*\*?/, "")
        .replace(/\*\/\s*$/, "")
        .replace(/^\s*\*\s?/, "")
        .trim(),
    )
    .filter(Boolean);
}

/**
 * 指定セクションの有無を調べる。
 */
export function hasCommentSection(commentLines, sectionName) {
  return commentLines.some((line) => line.startsWith(sectionName));
}

/**
 * JSDoc に `@param` があるかを調べる。
 */
export function hasParamTag(commentLines, parameterName) {
  const escapedName = parameterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^@param\\s+${escapedName}(\\s|$)`);
  return commentLines.some((line) => pattern.test(line));
}

/**
 * JSDoc に指定タグがあるかを調べる。
 */
export function hasTag(commentLines, tagName) {
  return commentLines.some((line) => line.startsWith(`${tagName} `));
}

/**
 * TypeScript modifier を持つかを調べる。
 */
export function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

/**
 * メソッドの可視性を文字列で返す。
 */
export function getVisibility(node) {
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) {
    return "private";
  }

  if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) {
    return "protected";
  }

  return "public";
}

/**
 * パス区切りを `/` に寄せる。
 */
export function normalizePath(value) {
  return value.split(path.sep).join("/");
}

/**
 * JSDoc 用の引数名を決める。
 */
export function getParameterDocName(parameter, index) {
  if (ts.isIdentifier(parameter.name)) {
    return parameter.name.text;
  }

  if (ts.isObjectBindingPattern(parameter.name)) {
    return index === 0 ? "options" : `options${index + 1}`;
  }

  if (ts.isArrayBindingPattern(parameter.name)) {
    return index === 0 ? "items" : `items${index + 1}`;
  }

  return `param${index + 1}`;
}

/**
 * 戻り値タグの必要性と説明文を返す。
 */
export function getReturnTagInfo(node) {
  if (!("type" in node) && !("body" in node)) {
    return { required: false, description: null };
  }

  const typeNode = node.type;
  const typeText = typeNode?.getText?.() ?? "";
  if (
    typeText === "void" ||
    typeText === "Promise<void>" ||
    typeText === "undefined"
  ) {
    return { required: false, description: null };
  }

  if (typeText === "never" || typeText === "Promise<never>") {
    return { required: false, description: null };
  }

  if (hasReturnWithValue(node)) {
    return {
      required: true,
      description: describeReturnType(typeText),
    };
  }

  if (typeText) {
    return {
      required: true,
      description: describeReturnType(typeText),
    };
  }

  return { required: false, description: null };
}

/**
 * 戻り値を説明する文を作る。
 */
export function describeReturnType(typeText) {
  if (!typeText) {
    return "処理結果。";
  }

  if (/^Promise<(.+)>$/.test(typeText)) {
    const inner = typeText.replace(/^Promise<(.+)>$/, "$1");
    return `${inner} を解決する Promise。`;
  }

  if (typeText === "boolean") {
    return "条件を満たす場合は `true`。";
  }

  if (typeText === "string") {
    return "生成または整形した文字列。";
  }

  if (typeText === "number") {
    return "計算結果の数値。";
  }

  if (/\[\]$/.test(typeText)) {
    return `収集した ${typeText.replace(/\[\]$/, "")} の一覧。`;
  }

  if (/null/.test(typeText)) {
    return `${typeText}。`;
  }

  return `${typeText}。`;
}

/**
 * 「目的を直接書いた方がよい」複雑さのシグナル数を返す。
 */
export function countRationaleSignals(node) {
  let count = 0;

  function visit(current) {
    if (current !== node && ts.isFunctionLike(current)) {
      return;
    }

    if (
      ts.isIfStatement(current) ||
      ts.isSwitchStatement(current) ||
      ts.isConditionalExpression(current) ||
      ts.isTryStatement(current) ||
      ts.isThrowStatement(current) ||
      ts.isForStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current)
    ) {
      count += 1;
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return count;
}

/**
 * 値を返す return 文があるかを調べる。
 */
export function hasReturnWithValue(node) {
  let found = false;

  function visit(current) {
    if (found) {
      return;
    }

    if (current !== node.body && ts.isFunctionLike(current)) {
      return;
    }

    if (ts.isReturnStatement(current) && current.expression) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }

  if (node.body) {
    visit(node.body);
  }

  return found;
}

/**
 * 宣言内で直接 throw しているかを調べる。
 */
export function hasDirectThrow(node) {
  let found = false;

  function visit(current) {
    if (found) {
      return;
    }

    if (current !== node.body && ts.isFunctionLike(current)) {
      return;
    }

    if (ts.isThrowStatement(current)) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }

  if (node.body) {
    visit(node.body);
  }

  return found;
}

/**
 * JSON レポートを書き込む。
 */
export async function writeJsonReport(relativePath, payload) {
  const reportPath = path.join(REPO_ROOT, relativePath);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(payload, null, 2), "utf8");
  return reportPath;
}
