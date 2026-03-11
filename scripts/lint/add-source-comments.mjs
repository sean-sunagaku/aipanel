import { writeFile } from "node:fs/promises";

import {
  collectDeclarations,
  listTypeScriptFiles,
  loadSource,
} from "./comment-contract.mjs";

function splitCamelCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim();
}

function describeClass(name) {
  if (name.endsWith("Repository")) {
    return `${splitCamelCase(name.replace(/Repository$/, ""))} の保存と復元を担当する。`;
  }

  if (name.endsWith("Manager")) {
    return `${splitCamelCase(name.replace(/Manager$/, ""))} の状態更新と補助操作をまとめる。`;
  }

  if (name.endsWith("UseCase")) {
    return `${splitCamelCase(name.replace(/UseCase$/, ""))} のユースケースを組み立てて実行する。`;
  }

  if (name.endsWith("Adapter")) {
    return `${splitCamelCase(name.replace(/Adapter$/, ""))} との入出力差分を吸収する。`;
  }

  if (name.endsWith("Registry")) {
    return `${splitCamelCase(name.replace(/Registry$/, ""))} を名前で解決できるように管理する。`;
  }

  if (name.endsWith("Collector")) {
    return `${splitCamelCase(name.replace(/Collector$/, ""))} を収集して束ねる。`;
  }

  if (name.endsWith("Renderer")) {
    return `${splitCamelCase(name.replace(/Renderer$/, ""))} を表示向けの形へ整える。`;
  }

  return `${splitCamelCase(name)} の責務を一箇所にまとめる。`;
}

function describeFunction(name) {
  const normalizedName = name.replace(/^#/, "");

  if (/^create/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("create".length)) || "新しい値"} を生成して返す。`;
  }

  if (/^fromJSON$/.test(normalizedName)) {
    return "保存形式の値からインスタンスへ復元する。";
  }

  if (/^toJSON$/.test(normalizedName)) {
    return "現在の値を保存しやすいプレーンオブジェクトへ変換する。";
  }

  if (/^append/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("append".length)) || "要素"} を既存データへ追加する。`;
  }

  if (/^build/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("build".length)) || "値"} を後続処理向けに組み立てる。`;
  }

  if (/^collect/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("collect".length)) || "情報"} を集めて束ねる。`;
  }

  if (/^compare/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("compare".length)) || "対象"} を比較して差分を整理する。`;
  }

  if (/^extract/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("extract".length)) || "情報"} を抽出する。`;
  }

  if (/^format/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("format".length)) || "値"} を表示や送信向けに整形する。`;
  }

  if (/^get/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("get".length)) || "対象の値"} を取得する。`;
  }

  if (/^hash/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("hash".length)) || "内容"} からハッシュ値を計算する。`;
  }

  if (/^is/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("is".length)) || "条件"} を満たすか判定する。`;
  }

  if (/^list/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("list".length)) || "項目"} を一覧化する。`;
  }

  if (/^load/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("load".length)) || "データ"} を読み込んで既定値を補う。`;
  }

  if (/^normalize/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("normalize".length)) || "入力"} を安定した内部表現へ正規化する。`;
  }

  if (/^parse/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("parse".length)) || "入力"} を内部表現へ解釈する。`;
  }

  if (/^pick/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("pick".length)) || "値"} から必要な情報だけを取り出す。`;
  }

  if (/^read/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("read".length)) || "内容"} を読み取る。`;
  }

  if (/^render/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("render".length)) || "内容"} を表示向けの文字列へ変換する。`;
  }

  if (/^require/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("require".length)) || "条件"} を必須として検証する。`;
  }

  if (/^route/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("route".length)) || "入力"} に応じて処理先を振り分ける。`;
  }

  if (/^run/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("run".length)) || "処理"} を実行して結果を受け取る。`;
  }

  if (/^save/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("save".length)) || "対象"} を永続化する。`;
  }

  if (/^summarize/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("summarize".length)) || "内容"} を要約する。`;
  }

  if (/^transition/.test(normalizedName)) {
    return "状態を次の段階へ遷移させる。";
  }

  if (/^update/.test(normalizedName) || /^upsert/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.replace(/^(update|upsert)/, "")) || "値"} を更新する。`;
  }

  if (/^write/.test(normalizedName)) {
    return `${splitCamelCase(normalizedName.slice("write".length)) || "内容"} を書き出す。`;
  }

  return `${splitCamelCase(normalizedName)} を担当する。`;
}

function describePurpose(record) {
  if (/Repository|fromJSON|toJSON|save|load|read|write/.test(record.name)) {
    return "永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。";
  }

  if (
    /UseCase|execute|route|build|append|transition|upsert/.test(record.name)
  ) {
    return "処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。";
  }

  if (/Adapter|call|runClaude|runCodex/.test(record.name)) {
    return "外部ツールごとの差分を吸収し、上位層が同じ呼び出し方で扱えるようにする。";
  }

  if (
    /normalize|compare|format|render|summarize|extract|pick/.test(record.name)
  ) {
    return "後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。";
  }

  if (/hash|collect|parse|readFlagValue|requireQuestion/.test(record.name)) {
    return "入力の解釈や追跡に必要な前処理をここでまとめ、後続処理を単純に保つ。";
  }

  if (/src\/domain\//.test(record.relativePath)) {
    return "値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。";
  }

  return "責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。";
}

function describeParam(name) {
  if (name === "options") {
    return "この宣言に必要なオプション。";
  }

  if (name === "items") {
    return "この宣言で扱う入力要素。";
  }

  if (/^cwd$/i.test(name)) {
    return "処理の基準ディレクトリ。";
  }

  if (/^(question|prompt)$/i.test(name)) {
    return "ユーザーから渡された質問内容。";
  }

  if (/^(provider|providerName)$/i.test(name)) {
    return "利用するプロバイダー名。";
  }

  if (/^model$/i.test(name)) {
    return "利用するモデル名。";
  }

  if (/^timeout(ms)?$/i.test(name)) {
    return "処理のタイムアウト設定。";
  }

  if (/^(sessionId|runId|taskId|artifactId|contextId)$/i.test(name)) {
    return "対象を識別する ID。";
  }

  if (/^(path|filePath|relativePath|absolutePath)$/i.test(name)) {
    return "対象のパス。";
  }

  if (/^(text|content|stdout|stderr)$/i.test(name)) {
    return "処理対象のテキスト。";
  }

  if (/^(input|params)$/i.test(name)) {
    return "この処理に渡す入力。";
  }

  return `処理に渡す ${splitCamelCase(name)}。`;
}

function describeReturns(record) {
  return record.returnsTag.description ?? "処理結果。";
}

function describeThrows(record) {
  if (/require|parse|read|load|get/.test(record.name)) {
    return "入力や参照先が前提を満たさない場合。";
  }

  if (/call|execute|route|save|write|collect|build/.test(record.name)) {
    return "実行に必要な前提を満たせない場合。";
  }

  return "処理を継続できない状態を検出した場合。";
}

function describeRemarks(record) {
  if (/transition|append|upsert|save|load/.test(record.name)) {
    return "状態更新や保存の順序が前提になるため、分岐条件を変えるときは前後の整合性も一緒に見直す。";
  }

  if (/call|execute|route|build|collect/.test(record.name)) {
    return "入力条件ごとの差分をここで吸収しているため、分岐を削るときは呼び出し側へ責務を漏らさないか確認する。";
  }

  if (/compare|normalize|format|render|parse/.test(record.name)) {
    return "入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。";
  }

  return "条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。";
}

function buildComment(record) {
  const summary =
    record.kind === "class"
      ? describeClass(record.name)
      : describeFunction(record.name);
  const purpose = describePurpose(record);
  const paramLines = record.parameters.map(
    (parameterName) =>
      `@param ${parameterName} ${describeParam(parameterName)}`,
  );
  const returnLines = record.returnsTag.required
    ? [`@returns ${describeReturns(record)}`]
    : [];
  const throwsLines = record.throwsTagRequired
    ? [`@throws ${describeThrows(record)}`]
    : [];
  const remarksLines = record.remarksTagRequired
    ? [`@remarks ${describeRemarks(record)}`]
    : [];
  const tagLines = [
    ...paramLines,
    ...returnLines,
    ...throwsLines,
    ...remarksLines,
  ];

  return tagLines.length > 0
    ? [summary, purpose, "", ...tagLines]
    : [summary, purpose];
}

function buildJsDoc(indent, lines) {
  return [
    `${indent}/**`,
    ...lines.map((line) => (line ? `${indent} * ${line}` : `${indent} *`)),
    `${indent} */`,
  ].join("\n");
}

function getIndent(sourceText, position) {
  const lineStart = sourceText.lastIndexOf("\n", position - 1) + 1;
  const prefix = sourceText.slice(lineStart, position);
  return prefix.match(/^\s*/)?.[0] ?? "";
}

const filePaths = await listTypeScriptFiles();
const shouldRewriteExisting = process.argv.includes("--rewrite-existing");

for (const filePath of filePaths) {
  const { text, sourceFile } = await loadSource(filePath);
  const declarations = collectDeclarations(filePath, sourceFile, text)
    .filter((record) => shouldRewriteExisting || !record.comment)
    .sort((left, right) => right.nodeStart - left.nodeStart);

  if (declarations.length === 0) {
    continue;
  }

  let nextText = text;
  for (const declaration of declarations) {
    const indent = getIndent(nextText, declaration.nodeStart);
    const comment = `${buildJsDoc(indent, buildComment(declaration))}\n${indent}`;
    if (declaration.comment && shouldRewriteExisting) {
      nextText =
        nextText.slice(0, declaration.comment.pos) +
        comment +
        nextText.slice(declaration.nodeStart);
      continue;
    }

    nextText =
      nextText.slice(0, declaration.nodeStart) +
      comment +
      nextText.slice(declaration.nodeStart);
  }

  if (nextText !== text) {
    await writeFile(filePath, nextText, "utf8");
  }
}

console.log(
  shouldRewriteExisting
    ? "`src` 配下の日本語コメント契約を JSDoc 2 段落形式へ一括更新しました。"
    : "`src` 配下へ日本語のコメント契約を一括挿入しました。",
);
