/**
 * domain で再利用する value object 群を定義する。
 * このファイルは、usage・citation・confidence などの小さな付随値を再利用し、run 系 model が同じ概念を重複定義しないようにするために存在する。
 */

import { compactObject } from "./base.js";
import { literalTuple } from "../shared/literalTuple.js";

export const confidenceLevels = literalTuple("low", "medium", "high");
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const citationKinds = literalTuple("file");
export type CitationKind = (typeof citationKinds)[number] | (string & {});

export interface UsageProps {
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  latencyMs?: number | null;
}

/**
 * Usage を provider 利用量の value object として定義する。
 * provider 呼び出しごとの token / cost / latency を小さな値型で共有し、response ごとに同じ shape を保てるようにする。
 */
export class Usage {
  public readonly inputTokens: number | null;
  public readonly outputTokens: number | null;
  public readonly costUsd: number | null;
  public readonly latencyMs: number | null;

  constructor(props: UsageProps = {}) {
    this.inputTokens = props.inputTokens ?? null;
    this.outputTokens = props.outputTokens ?? null;
    this.costUsd = props.costUsd ?? null;
    this.latencyMs = props.latencyMs ?? null;
  }

  /**
   * from を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param input この処理に渡す入力。
   * @returns Usage | null。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  static from(input: Usage | UsageProps | null | undefined): Usage | null {
    if (!input) {
      return null;
    }

    return input instanceof Usage ? input : new Usage(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns UsageProps。
   */
  toJSON(): UsageProps {
    return compactObject({
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      costUsd: this.costUsd,
      latencyMs: this.latencyMs,
    });
  }
}

export interface CitationProps {
  kind: CitationKind;
  label?: string | null;
  pathOrUrl?: string | null;
  line?: number | null;
}

/**
 * Citation を根拠参照の value object として定義する。
 * 応答の根拠参照を小さな値型で共有し、normalized response や task result が同じ citation 形を使えるようにする。
 */
export class Citation {
  public readonly kind: CitationKind;
  public readonly label: string | null;
  public readonly pathOrUrl: string | null;
  public readonly line: number | null;

  constructor(props: CitationProps) {
    this.kind = props.kind;
    this.label = props.label ?? null;
    this.pathOrUrl = props.pathOrUrl ?? null;
    this.line = props.line ?? null;
  }

  /**
   * from を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param input この処理に渡す入力。
   * @returns Citation。
   */
  static from(input: Citation | CitationProps): Citation {
    return input instanceof Citation ? input : new Citation(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns CitationProps。
   */
  toJSON(): CitationProps {
    return compactObject({
      kind: this.kind,
      label: this.label,
      pathOrUrl: this.pathOrUrl,
      line: this.line,
    });
  }
}

export interface TaskDependencyProps {
  taskId: string;
  dependencyTaskId: string;
}

/**
 * TaskDependency を task 間依存の value object として定義する。
 * task 間の依存関係を値型として切り出し、debug orchestrated flow の前後関係を run task 自体から分離して表せるようにする。
 */
export class TaskDependency {
  public readonly taskId: string;
  public readonly dependencyTaskId: string;

  constructor(props: TaskDependencyProps) {
    this.taskId = props.taskId;
    this.dependencyTaskId = props.dependencyTaskId;
  }

  /**
   * from を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param input この処理に渡す入力。
   * @returns TaskDependency。
   */
  static from(input: TaskDependency | TaskDependencyProps): TaskDependency {
    return input instanceof TaskDependency ? input : new TaskDependency(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns TaskDependencyProps。
   */
  toJSON(): TaskDependencyProps {
    return {
      taskId: this.taskId,
      dependencyTaskId: this.dependencyTaskId,
    };
  }
}

export interface ConfidenceScoreProps {
  level: ConfidenceLevel;
  reason?: string | null;
}

/**
 * ConfidenceScore を確信度の value object として定義する。
 * summary や recommendation の確信度を値型で共有し、normalized response と task result で同じ意味付けを使えるようにする。
 */
export class ConfidenceScore {
  public readonly level: ConfidenceLevel;
  public readonly reason: string | null;

  constructor(props: ConfidenceScoreProps) {
    this.level = props.level;
    this.reason = props.reason ?? null;
  }

  /**
   * from を担当する。
   * session / run / artifact の正本 model を domain 層に置き、この repo が保持する状態境界を固定する。
   *
   * @param input この処理に渡す入力。
   * @returns ConfidenceScore | null。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  static from(
    input: ConfidenceScore | ConfidenceScoreProps | null | undefined,
  ): ConfidenceScore | null {
    if (!input) {
      return null;
    }

    return input instanceof ConfidenceScore
      ? input
      : new ConfidenceScore(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns ConfidenceScoreProps。
   */
  toJSON(): ConfidenceScoreProps {
    return compactObject({
      level: this.level,
      reason: this.reason,
    });
  }
}
