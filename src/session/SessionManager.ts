import {
  Session,
  SessionTurn,
  ProviderRef,
  defaultClock,
  defaultIdGenerator,
  type Clock,
  type IdGenerator,
  type ProviderRefProps,
  type SessionTurnRole,
} from "../domain/index.js";
import { SessionRepository } from "./SessionRepository.js";

export interface SessionManagerOptions {
  repository: SessionRepository;
  clock?: Clock;
  idGenerator?: IdGenerator;
}

export class SessionManager {
  private readonly repository: SessionRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(options: SessionManagerOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? defaultClock;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
  }

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

  async updateProviderRef(
    session: Session,
    providerRef: ProviderRef | ProviderRefProps,
  ): Promise<Session> {
    const resolved = ProviderRef.from(providerRef);
    session.upsertProviderRef(
      new ProviderRef({
        ...resolved.toJSON(),
        lastUsedAt: resolved.lastUsedAt ?? this.clock(),
      }),
      this.clock(),
    );

    return this.repository.save(session);
  }

  async save(session: Session): Promise<Session> {
    return this.repository.save(session);
  }
}
