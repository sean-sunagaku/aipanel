/**
 * SessionManager を定義する。
 * このファイルは、session 開始・resume・turn 追加の運用操作をまとめ、継続会話の正本管理を provider native state から切り離すために存在する。
 */

import {
  Session,
  SessionTurn,
  type SessionTurnRole,
} from "../domain/session.js";
import {
  defaultClock,
  defaultIdGenerator,
  type Clock,
  type IdGenerator,
} from "../domain/base.js";
import { SessionRepository } from "./SessionRepository.js";

interface SessionManagerOptions {
  repository: SessionRepository;
  clock?: Clock;
  idGenerator?: IdGenerator;
}

/**
 * Session の運用操作を定義する。
 * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
 */
export class SessionManager {
  private readonly repository: SessionRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(options: SessionManagerOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? defaultClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

  /**
   * start Or Resume を担当する。
   * 継続会話の正本管理と保存規約を session 層へ置き、followup が provider native state に依存しないようにする。
   *
   * @param params この処理に渡す入力。
   * @returns Session を解決する Promise。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  async startOrResume(
    params: { sessionId?: string; title?: string } = {},
  ): Promise<Session> {
    if (params.sessionId) {
      return this.repository.require(params.sessionId);
    }

    const session = Session.create({
      clock: this.clock,
      idGenerator: this.idGenerator,
      ...(params.title ? { title: params.title } : {}),
    });

    return this.repository.save(session);
  }

  /**
   * Turn を既存データへ追加する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param session 処理に渡す session。
   * @param params この処理に渡す入力。
   * @returns SessionTurn を解決する Promise。
   */
  async appendTurn(
    session: Session,
    params: {
      role: SessionTurnRole;
      content: string;
      artifactIds?: string[];
    },
  ): Promise<SessionTurn> {
    const turn = session.createTurn({
      role: params.role,
      content: params.content,
      clock: this.clock,
      idGenerator: this.idGenerator,
      ...(params.artifactIds ? { artifactIds: params.artifactIds } : {}),
    });

    await this.repository.save(session);
    return turn;
  }

  /**
   * User Turn を既存データへ追加する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param session 処理に渡す session。
   * @param content 処理対象のテキスト。
   * @param artifactIds 処理に渡す artifact Ids。
   * @returns SessionTurn を解決する Promise。
   */
  async appendUserTurn(
    session: Session,
    content: string,
    artifactIds: string[] = [],
  ): Promise<SessionTurn> {
    return this.appendTurn(session, {
      role: "user",
      content,
      artifactIds,
    });
  }

  /**
   * Assistant Turn を既存データへ追加する。
   * 処理順序や状態更新の責務を一箇所に閉じ込め、呼び出し側の分岐を増やさない。
   *
   * @param session 処理に渡す session。
   * @param content 処理対象のテキスト。
   * @param artifactIds 処理に渡す artifact Ids。
   * @returns SessionTurn を解決する Promise。
   */
  async appendAssistantTurn(
    session: Session,
    content: string,
    artifactIds: string[] = [],
  ): Promise<SessionTurn> {
    return this.appendTurn(session, {
      role: "assistant",
      content,
      artifactIds,
    });
  }
}
