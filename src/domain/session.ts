import {
  SCHEMA_VERSION,
  compactObject,
  defaultClock,
  defaultIdGenerator,
  ensureArray,
  optionalProp,
  type Clock,
  type IdGenerator,
  type IsoDateString,
} from "./base.js";
import { ProviderRef, type ProviderRefProps } from "./value-objects.js";

type SessionStatus = "active";
export type SessionTurnRole = "user" | "assistant";

interface SessionTurnProps {
  turnId: string;
  sessionId: string;
  role: SessionTurnRole;
  content: string;
  artifactIds?: string[];
  createdAt: IsoDateString;
}

/**
 * Session Turn の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class SessionTurn {
  public readonly turnId: string;
  public readonly sessionId: string;
  public readonly role: SessionTurnRole;
  public readonly content: string;
  public readonly artifactIds: string[];
  public readonly createdAt: IsoDateString;

  constructor(props: SessionTurnProps) {
    this.turnId = props.turnId;
    this.sessionId = props.sessionId;
    this.role = props.role;
    this.content = props.content;
    this.artifactIds = ensureArray(props.artifactIds);
    this.createdAt = props.createdAt;
  }

  /**
   * 新しい値 を生成して返す。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param params この処理に渡す入力。
   * @returns SessionTurn。
   */
  static create(
    params: Omit<SessionTurnProps, "turnId" | "createdAt"> & {
      turnId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): SessionTurn {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;

    return new SessionTurn({
      turnId: params.turnId ?? idGenerator("turn"),
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      createdAt: params.createdAt ?? clock(),
      ...optionalProp("artifactIds", params.artifactIds),
    });
  }

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns SessionTurn。
   */
  static fromJSON(input: SessionTurnProps): SessionTurn {
    return new SessionTurn(input);
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns SessionTurnProps。
   */
  toJSON(): SessionTurnProps {
    return compactObject({
      turnId: this.turnId,
      sessionId: this.sessionId,
      role: this.role,
      content: this.content,
      artifactIds: this.artifactIds,
      createdAt: this.createdAt,
    });
  }
}

export interface SessionProps {
  schemaVersion?: number;
  sessionId: string;
  title: string;
  status: SessionStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  providerRefs?: ProviderRefProps[];
  turns?: SessionTurnProps[];
}

/**
 * Session の責務を一箇所にまとめる。
 * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
 */
export class Session {
  public readonly schemaVersion: number;
  public readonly sessionId: string;
  public title: string;
  public status: SessionStatus;
  public readonly createdAt: IsoDateString;
  public updatedAt: IsoDateString;
  public providerRefs: ProviderRef[];
  public turns: SessionTurn[];

  constructor(props: SessionProps) {
    this.schemaVersion = props.schemaVersion ?? SCHEMA_VERSION;
    this.sessionId = props.sessionId;
    this.title = props.title;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.providerRefs = ensureArray(props.providerRefs).map((item) =>
      ProviderRef.from(item),
    );
    this.turns = ensureArray(props.turns).map((item) =>
      SessionTurn.fromJSON(item),
    );
  }

  /**
   * 新しい値 を生成して返す。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param params この処理に渡す入力。
   * @returns Session。
   */
  static create(
    params: {
      sessionId?: string;
      title?: string;
      status?: SessionStatus;
      providerRefs?: Array<ProviderRef | ProviderRefProps>;
      turns?: Array<SessionTurn | SessionTurnProps>;
      createdAt?: IsoDateString;
      updatedAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    } = {},
  ): Session {
    const clock = params.clock ?? defaultClock;
    const idGenerator = params.idGenerator ?? defaultIdGenerator;
    const createdAt = params.createdAt ?? clock();
    const updatedAt = params.updatedAt ?? createdAt;

    return new Session({
      sessionId: params.sessionId ?? idGenerator("session"),
      title: params.title ?? "Untitled Session",
      status: params.status ?? "active",
      createdAt,
      updatedAt,
      providerRefs: ensureArray(params.providerRefs).map((item) =>
        ProviderRef.from(item).toJSON(),
      ),
      turns: ensureArray(params.turns).map((item) =>
        item instanceof SessionTurn
          ? item.toJSON()
          : SessionTurn.fromJSON(item).toJSON(),
      ),
    });
  }

  /**
   * 保存形式の値からインスタンスへ復元する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param input この処理に渡す入力。
   * @returns Session。
   */
  static fromJSON(input: SessionProps): Session {
    return new Session(input);
  }

  /**
   * Turn を既存データへ追加する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param turn 処理に渡す turn。
   * @param updatedAt 処理に渡す updated At。
   * @throws 処理を継続できない状態を検出した場合。
   * @remarks 状態更新や保存の順序が前提になるため、分岐条件を変えるときは前後の整合性も一緒に見直す。
   */
  appendTurn(
    turn: SessionTurn,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    if (turn.sessionId !== this.sessionId) {
      throw new Error(
        `Session turn ${turn.turnId} does not belong to session ${this.sessionId}`,
      );
    }

    this.turns.push(turn);
    this.updatedAt = updatedAt;
  }

  /**
   * Turn を生成して返す。
   * 値オブジェクトや集約の変換規則を散らさず、永続化や比較の整合性を保つ。
   *
   * @param params この処理に渡す入力。
   * @returns SessionTurn。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  createTurn(
    params: Omit<SessionTurnProps, "sessionId" | "turnId" | "createdAt"> & {
      turnId?: string;
      createdAt?: IsoDateString;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ): SessionTurn {
    const turn = SessionTurn.create({
      sessionId: this.sessionId,
      role: params.role,
      content: params.content,
      ...(params.artifactIds ? { artifactIds: params.artifactIds } : {}),
      ...(params.turnId ? { turnId: params.turnId } : {}),
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
      ...(params.clock ? { clock: params.clock } : {}),
      ...(params.idGenerator ? { idGenerator: params.idGenerator } : {}),
    });

    this.appendTurn(turn, turn.createdAt);
    return turn;
  }

  /**
   * Provider Ref を更新する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param providerRef 処理に渡す provider Ref。
   * @param updatedAt 処理に渡す updated At。
   */
  upsertProviderRef(
    providerRef: ProviderRef | ProviderRefProps,
    updatedAt: IsoDateString = defaultClock(),
  ): void {
    const resolved = ProviderRef.from(providerRef);
    const index = this.providerRefs.findIndex(
      (item) => item.provider === resolved.provider,
    );

    if (index >= 0) {
      this.providerRefs[index] = resolved;
    } else {
      this.providerRefs.push(resolved);
    }

    this.updatedAt = updatedAt;
  }

  /**
   * Transcript を後続処理向けに組み立てる。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @returns 生成または整形した文字列。
   */
  buildTranscript(): string {
    return this.turns
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join("\n\n");
  }

  /**
   * 現在の値を保存しやすいプレーンオブジェクトへ変換する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @returns SessionProps。
   */
  toJSON(): SessionProps {
    return compactObject({
      schemaVersion: this.schemaVersion,
      sessionId: this.sessionId,
      title: this.title,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      providerRefs: this.providerRefs.map((item) => item.toJSON()),
      turns: this.turns.map((item) => item.toJSON()),
    });
  }
}
