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

export type SessionStatus = "active" | "archived" | "closed";
export type SessionTurnRole = "user" | "assistant" | "system";

export interface SessionTurnProps {
  turnId: string;
  sessionId: string;
  role: SessionTurnRole;
  content: string;
  artifactIds?: string[];
  createdAt: IsoDateString;
}

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

  static fromJSON(input: SessionTurnProps): SessionTurn {
    return new SessionTurn(input);
  }

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

  static fromJSON(input: SessionProps): Session {
    return new Session(input);
  }

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

  buildTranscript(): string {
    return this.turns
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join("\n\n");
  }

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
