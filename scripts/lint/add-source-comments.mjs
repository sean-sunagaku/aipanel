import path from "node:path";
import { writeFile } from "node:fs/promises";

import {
  collectDeclarations,
  listTypeScriptFiles,
  loadSource,
  normalizePath,
  REPO_ROOT,
} from "./comment-contract.mjs";

function splitCamelCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim();
}

function getRelativePath(filePath) {
  return normalizePath(path.relative(REPO_ROOT, filePath));
}

function getSrcArea(relativePath) {
  return relativePath.split("/")[1] ?? "";
}

function getFileStem(relativePath) {
  return relativePath.split("/").at(-1)?.replace(/\.ts$/, "") ?? "";
}

function describeFileSummary(relativePath) {
  switch (relativePath) {
    case "src/app/AipanelApp.ts":
      return "AipanelApp を定義する。";
    case "src/app/CommandRouter.ts":
      return "CommandRouter と CLI usage 定義をまとめる。";
    case "src/cli/aipanel.ts":
      return "aipanel CLI entrypoint を定義する。";
    case "src/cli/parseArgs.ts":
      return "CLI 引数の解析ルールを定義する。";
    case "src/compare/ComparisonEngine.ts":
      return "ComparisonEngine を定義する。";
    case "src/compare/ResponseNormalizer.ts":
      return "ResponseNormalizer と正規化 helper を定義する。";
    case "src/context/ContextCollector.ts":
      return "ContextCollector を定義する。";
    case "src/domain/artifact.ts":
      return "Artifact と artifact kind を定義する。";
    case "src/domain/base.ts":
      return "domain 共通の基礎定義をまとめる。";
    case "src/domain/run.ts":
      return "Run ledger を構成する model 群を定義する。";
    case "src/domain/session.ts":
      return "Session と SessionTurn を定義する。";
    case "src/domain/value-objects.ts":
      return "domain で再利用する value object 群を定義する。";
    case "src/output/ResultRenderer.ts":
      return "ResultRenderer を定義する。";
    case "src/providers/ProviderAdapter.ts":
      return "provider 境界の共通契約を定義する。";
    case "src/providers/ProviderRegistry.ts":
      return "ProviderRegistry を定義する。";
    case "src/run/RunCoordinator.ts":
      return "RunCoordinator を定義する。";
    case "src/run/RunRepository.ts":
      return "RunRepository を定義する。";
    case "src/session/SessionManager.ts":
      return "SessionManager を定義する。";
    case "src/session/SessionRepository.ts":
      return "SessionRepository を定義する。";
    case "src/shared/commands.ts":
      return "CLI command と provider の共通定義をまとめる。";
    case "src/shared/json-repository.ts":
      return "JSON repository 基盤を定義する。";
    default:
      return `${splitCamelCase(getFileStem(relativePath))} を定義する。`;
  }
}

function describeFilePurpose(relativePath) {
  switch (relativePath) {
    case "src/app/AipanelApp.ts":
      return "CLI entrypoint から use case・repository・provider adapter を組み立てる application root を repo 内で一箇所に置くために存在する";
    case "src/app/CommandRouter.ts":
      return "CLI command ごとの分岐と exit code / rendering を app 層へ集め、entrypoint が個別 use case の詳細を持たないようにするために存在する";
    case "src/artifact/ArtifactRepository.ts":
      return "run 中に生成する text/json artifact の保存規約を repository として固定し、use case がファイル配置を直接扱わずに済むようにするために存在する";
    case "src/artifact/artifact-paths.ts":
      return "artifact の保存先ディレクトリとメタデータパスの規約を一箇所で共有し、path 組み立ての重複を防ぐために存在する";
    case "src/cli/aipanel.ts":
      return "Node CLI の最外周で argv・標準入出力・exit code を扱い、app 本体を端末実行詳細から切り離すために存在する";
    case "src/cli/parseArgs.ts":
      return "argv を `aipanel` 内部の不変 command 入力へ変換し、後続層でフラグ解釈を再実装しないようにするために存在する";
    case "src/compare/ComparisonEngine.ts":
      return "複数 provider の normalized response を比較結果へ落とし込み、debug の recommendation 生成責務を use case から分離するために存在する";
    case "src/compare/ResponseNormalizer.ts":
      return "provider ごとの raw text 差分を summary / findings / suggestions へ揃え、run ledger と comparison が同じ前提で扱えるようにするために存在する";
    case "src/context/ContextCollector.ts":
      return "prompt 実行時に残す最小 context を一箇所で決め、consult / followup / debug が同じ収集方針を使えるようにするために存在する";
    case "src/domain/artifact.ts":
      return "run や session に紐づく保存物を domain model として扱い、artifact metadata の正本を repository ごとに散らさないために存在する";
    case "src/domain/base.ts":
      return "domain entity / value object が共有する schema version・時刻・ID・serialize helper を揃え、モデルごとに基礎契約がぶれないようにするために存在する";
    case "src/domain/run.ts":
      return "consult / followup / debug の 1 実行を ledger として追跡するために、Run と task / response / comparison 系 model をまとめて定義するために存在する";
    case "src/domain/session.ts":
      return "followup の継続文脈を run から分離し、会話履歴の正本を `aipanel` 側で保持するために存在する";
    case "src/domain/value-objects.ts":
      return "usage・citation・confidence などの小さな付随値を再利用し、run 系 model が同じ概念を重複定義しないようにするために存在する";
    case "src/output/ResultRenderer.ts":
      return "use case 結果の text/json 表示差分を renderer に閉じ込め、command 側が出力文字列を都度組み立てないようにするために存在する";
    case "src/providers/ClaudeCodeAdapter.ts":
      return "Claude Code CLI の実行方法と JSON 解析差分を provider adapter に閉じ込め、上位層が共通 contract だけで扱えるようにするために存在する";
    case "src/providers/CodexExecAdapter.ts":
      return "Codex CLI の jsonl 実行結果を共通 provider response へ変換し、debug / consult が Claude と同じ面で扱えるようにするために存在する";
    case "src/providers/ProviderAdapter.ts":
      return "provider call plan / result の共通契約を固定し、Claude Code と Codex の adapter を同じ境界で差し替えられるようにするために存在する";
    case "src/providers/ProviderRegistry.ts":
      return "利用可能 provider の一覧・既定値・name 解決を一箇所で管理し、app/usecase が adapter 配列の詳細を持たないようにするために存在する";
    case "src/run/RunCoordinator.ts":
      return "Run ledger へ child entity を追加する手順をまとめ、use case が task / response / report の生成規約を重複実装しないようにするために存在する";
    case "src/run/RunRepository.ts":
      return "Run ledger の保存・取得・record validation を repository に集め、永続化形式を use case や coordinator へ漏らさないために存在する";
    case "src/session/SessionManager.ts":
      return "session 開始・resume・turn 追加の運用操作をまとめ、継続会話の正本管理を provider native state から切り離すために存在する";
    case "src/session/SessionRepository.ts":
      return "Session record の保存・取得・validation を repository に集め、会話履歴の保存規約を session manager から分離するために存在する";
    case "src/shared/clock.ts":
      return "時刻取得を小さな境界として切り出し、domain / usecase のテストで clock を差し替えやすくするために存在する";
    case "src/shared/commands.ts":
      return "CLI command と provider 名の canonical literal を共有し、parse / routing / usecase 間で同じ定義を使うために存在する";
    case "src/shared/file-system.ts":
      return "小さな filesystem helper を shared に寄せ、readText / pathExists を複数層で重複実装しないようにするために存在する";
    case "src/shared/ids.ts":
      return "ID 生成の最小 helper を shared に置き、context などが生成規約を共有できるようにするために存在する";
    case "src/shared/json-repository.ts":
      return "session / run repository が共有する JSON 保存基盤を持ち、collection ごとの差分だけで同じ persistence 規約を再利用するために存在する";
    case "src/shared/literalTuple.ts":
      return "literal 配列から runtime 値と union 型を同時に作る helper を共有し、`as const` に頼らない型定義を支えるために存在する";
    case "src/shared/storage-paths.ts":
      return "collection record の保存パス規約を共有し、`<collection>/<id>.json` ルールを repository ごとに重複させないために存在する";
    case "src/usecases/ConsultUseCase.ts":
      return "consult と followup の direct provider flow を実行手順としてまとめ、session / run / artifact 更新順を use case で固定するために存在する";
    case "src/usecases/DebugUseCase.ts":
      return "planner / reviewer / validator を使う debug orchestrated flow を実行手順としてまとめ、run ledger への記録を一貫させるために存在する";
    case "src/usecases/FollowupUseCase.ts":
      return "followup を consult 実装へ委譲する薄い専用入口を持ち、CLI 上の command 区別を保ったまま direct flow を再利用するために存在する";
    case "src/usecases/ListProvidersUseCase.ts":
      return "利用可能 provider の一覧取得を use case として切り出し、CLI command が registry 参照の詳細を直接持たないようにするために存在する";
    default:
      return describeAreaPurpose({
        relativePath,
        kind: "file",
        name: getFileStem(relativePath),
      });
  }
}

function describeDomainClassSummary(name) {
  switch (name) {
    case "Artifact":
      return "Artifact を保存物メタデータの model として定義する。";
    case "SessionTurn":
      return "SessionTurn を会話履歴の 1 発話として定義する。";
    case "Session":
      return "Session を継続会話の正本 model として定義する。";
    case "RunTask":
      return "RunTask を実行内の個別 task model として定義する。";
    case "TaskResult":
      return "TaskResult を task の要約結果 model として定義する。";
    case "RunContext":
      return "RunContext を実行時 context の記録 model として定義する。";
    case "ProviderResponse":
      return "ProviderResponse を provider 生応答の記録 model として定義する。";
    case "NormalizedResponse":
      return "NormalizedResponse を比較向け正規化応答の model として定義する。";
    case "ComparisonReport":
      return "ComparisonReport を応答比較結果の model として定義する。";
    case "Run":
      return "Run を 1 実行の ledger model として定義する。";
    case "Usage":
      return "Usage を provider 利用量の value object として定義する。";
    case "Citation":
      return "Citation を根拠参照の value object として定義する。";
    case "TaskDependency":
      return "TaskDependency を task 間依存の value object として定義する。";
    case "ConfidenceScore":
      return "ConfidenceScore を確信度の value object として定義する。";
    default:
      return null;
  }
}

function describeClass(record) {
  const name = record.name;
  const domainSummary = describeDomainClassSummary(name);
  if (domainSummary) {
    return domainSummary;
  }

  const area = getSrcArea(record.relativePath);
  if (name.endsWith("Repository")) {
    return `${splitCamelCase(name.replace(/Repository$/, ""))} の永続化境界を定義する。`;
  }

  if (name.endsWith("Manager")) {
    return `${splitCamelCase(name.replace(/Manager$/, ""))} の運用操作を定義する。`;
  }

  if (name.endsWith("UseCase")) {
    return `${splitCamelCase(name.replace(/UseCase$/, ""))} command の実行手順を定義する。`;
  }

  if (name.endsWith("Adapter")) {
    return `${splitCamelCase(name.replace(/Adapter$/, ""))} provider 境界を実装する。`;
  }

  if (name.endsWith("Registry")) {
    return `${splitCamelCase(name.replace(/Registry$/, ""))} の解決表を管理する。`;
  }

  if (name.endsWith("Collector")) {
    return `${splitCamelCase(name.replace(/Collector$/, ""))} を収集する役を定義する。`;
  }

  if (name.endsWith("Renderer")) {
    return `${splitCamelCase(name.replace(/Renderer$/, ""))} を表示整形役として定義する。`;
  }

  if (name.endsWith("Coordinator")) {
    return `${splitCamelCase(name.replace(/Coordinator$/, ""))} の組み立て役を定義する。`;
  }

  if (name.endsWith("Router")) {
    return `${splitCamelCase(name.replace(/Router$/, ""))} の振り分け役を定義する。`;
  }

  if (name.endsWith("Engine")) {
    return `${splitCamelCase(name.replace(/Engine$/, ""))} の中核ロジックを定義する。`;
  }

  if (area === "app") {
    return `${splitCamelCase(name)} を app 層の責務として定義する。`;
  }

  return `${splitCamelCase(name)} をこの repo の責務単位として定義する。`;
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

function describeDomainClassPurpose(name) {
  switch (name) {
    case "Artifact":
      return "run や session に紐づく保存物を名前付きで追跡し、artifact path や MIME 情報の正本を repository ごとに散らさないようにする。";
    case "SessionTurn":
      return "user / assistant 発話と関連 artifact を同じ粒度で残し、followup の再構築に必要な 1 turn の境界を固定する。";
    case "Session":
      return "会話継続の正本を `aipanel` 側へ持たせ、provider native session に依存せず transcript を再構築できるようにする。";
    case "RunTask":
      return "debug や direct 実行の途中工程を task 単位で追跡し、provider call ごとの状態遷移と入力を ledger に残す。";
    case "TaskResult":
      return "task ごとの要約結果と根拠 artifact を分離して保持し、最終 summary 以外の判断材料も run ledger へ残せるようにする。";
    case "RunContext":
      return "質問・cwd・artifact 化した context を実行単位へ結びつけ、prompt 実行時の前提を session 履歴とは別に記録する。";
    case "ProviderResponse":
      return "provider の raw text/json と usage を保存用 model として固定し、比較や debug で生応答参照先を一貫して扱えるようにする。";
    case "NormalizedResponse":
      return "provider 差分を吸収した summary / findings / suggestions を保持し、comparison と render が共通の内部表現を扱えるようにする。";
    case "ComparisonReport":
      return "複数 normalized response の一致点・差分・推奨を独立 model として残し、debug の最終判断を run ledger に保存できるようにする。";
    case "Run":
      return "consult / followup / debug の 1 実行に紐づく状態遷移と子要素を一箇所で保持し、session と execution tracking を分離する。";
    case "Usage":
      return "provider 呼び出しごとの token / cost / latency を小さな値型で共有し、response ごとに同じ shape を保てるようにする。";
    case "Citation":
      return "応答の根拠参照を小さな値型で共有し、normalized response や task result が同じ citation 形を使えるようにする。";
    case "TaskDependency":
      return "task 間の依存関係を値型として切り出し、debug orchestrated flow の前後関係を run task 自体から分離して表せるようにする。";
    case "ConfidenceScore":
      return "summary や recommendation の確信度を値型で共有し、normalized response と task result で同じ意味付けを使えるようにする。";
    default:
      return null;
  }
}

function describeAreaPurpose(record) {
  switch (getSrcArea(record.relativePath)) {
    case "app":
      return "CLI entrypoint と use case・provider・renderer の接続責務を app 層へ集め、個々の command 実装が composition details を持たないようにする。";
    case "artifact":
      return "artifact の保存規約と path 解決を artifact 層へ集め、use case がファイル配置の詳細を直接扱わないようにする。";
    case "cli":
      return "argv 解釈と標準入出力の責務を CLI 層へ閉じ込め、app / usecase を端末実行詳細から切り離す。";
    case "compare":
      return "provider 応答の要約・差分化を compare 層へ閉じ込め、run/usecase が raw text 比較を直接抱え込まないようにする。";
    case "context":
      return "prompt 実行に必要な最小 context 収集を一箇所で決め、command ごとに入力メタデータ収集がぶれないようにする。";
    case "domain":
      return "session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。";
    case "output":
      return "use case 結果の text/json 出力差分を renderer に集め、command 側で表示文字列の組み立てを重複させないようにする。";
    case "providers":
      return "Claude Code と Codex の CLI 差分を provider 境界で吸収し、上位層が共通 contract だけを見れば済むようにする。";
    case "run":
      return "Run ledger の生成・保存・検証を run 層に集め、use case が record 整形や child entity 生成を重複実装しないようにする。";
    case "session":
      return "継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。";
    case "shared":
      return "複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。";
    case "usecases":
      return "command 実行手順を use case に閉じ込め、CLI / app 層から provider 呼び出し順や state update を切り離す。";
    default:
      return "この repo の責務境界を保つために、周辺コードへ漏らしたくない判断や規約をここへ集める。";
  }
}

function describeClassPurpose(record) {
  if (record.kind !== "class") {
    return null;
  }

  const domainPurpose = describeDomainClassPurpose(record.name);
  if (domainPurpose) {
    return domainPurpose;
  }

  return describeAreaPurpose(record);
}

function describePurpose(record) {
  const classPurpose = describeClassPurpose(record);
  if (classPurpose) {
    return classPurpose;
  }

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

  return describeAreaPurpose(record);
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
      ? describeClass(record)
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

function getShebang(sourceText) {
  const match = sourceText.match(/^(#!.*\n)/);
  return match?.[1] ?? "";
}

function getFileOverviewComment(sourceText) {
  const shebang = getShebang(sourceText);
  const body = shebang ? sourceText.slice(shebang.length) : sourceText;
  const match = body.match(/^\s*(\/\*\*[\s\S]*?\*\/)\s*(?=import|export)/);
  if (!match) {
    return null;
  }

  const offset = shebang.length + (match.index ?? 0);
  return {
    pos: offset,
    end: offset + match[1].length,
    rawText: match[1],
  };
}

function applyFileOverview(sourceText, filePath, shouldRewriteExisting) {
  const relativePath = getRelativePath(filePath);
  const overview = `${buildJsDoc("", [
    describeFileSummary(relativePath),
    `このファイルは、${describeFilePurpose(relativePath)}。`,
  ])}\n\n`;
  const existing = getFileOverviewComment(sourceText);

  if (existing) {
    if (!shouldRewriteExisting) {
      return sourceText;
    }

    return (
      sourceText.slice(0, existing.pos) +
      overview.trimEnd() +
      sourceText.slice(existing.end)
    );
  }

  const shebang = getShebang(sourceText);
  if (shebang) {
    return `${shebang}${overview}${sourceText.slice(shebang.length)}`;
  }

  return `${overview}${sourceText}`;
}

const filePaths = await listTypeScriptFiles();
const shouldRewriteExisting = process.argv.includes("--rewrite-existing");

for (const filePath of filePaths) {
  const { text, sourceFile } = await loadSource(filePath);
  const declarations = collectDeclarations(filePath, sourceFile, text)
    .filter((record) => shouldRewriteExisting || !record.comment)
    .sort((left, right) => right.nodeStart - left.nodeStart);

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

  const withOverview = applyFileOverview(
    nextText,
    filePath,
    shouldRewriteExisting,
  );
  if (withOverview !== nextText) {
    await writeFile(filePath, withOverview, "utf8");
  }
}

console.log(
  shouldRewriteExisting
    ? "`src` 配下の日本語コメント契約を JSDoc 2 段落形式へ一括更新しました。"
    : "`src` 配下へ日本語のコメント契約を一括挿入しました。",
);
