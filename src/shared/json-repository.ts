/**
 * JSON repository 基盤を定義する。
 * このファイルは、session / run repository が共有する JSON 保存基盤を持ち、collection ごとの差分だけで同じ persistence 規約を再利用するために存在する。
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCollectionDirectoryPath,
  buildCollectionPaths,
} from "./storage-paths.js";

interface RepositoryOptions {
  storageRoot?: string;
}

type JsonRecord = Record<string, unknown>;

interface JsonRepositoryConfig<TEntity, TProps> {
  collectionName: string;
  envelopeKey: string;
  entityName: string;
  getId(entity: TEntity): string;
  serialize(entity: TEntity): TProps;
  deserialize(record: unknown): TEntity;
  validateRecord?(record: unknown): string[];
}

/**
 * Json の永続化境界を定義する。
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
 */
export class JsonRepository<TEntity, TProps> {
  private readonly storageRoot: string;
  private readonly config: JsonRepositoryConfig<TEntity, TProps>;

  public constructor(
    config: JsonRepositoryConfig<TEntity, TProps>,
    options: RepositoryOptions = {},
  ) {
    this.storageRoot =
      options.storageRoot ?? path.join(process.cwd(), ".aipanel");
    this.config = config;
  }

  /**
   * Collection Directory を取得する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @returns 生成または整形した文字列。
   */
  private getCollectionDirectory(): string {
    return buildCollectionDirectoryPath({
      storageRoot: this.storageRoot,
      collectionName: this.config.collectionName,
    });
  }

  /**
   * File Path を取得する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @param entityId 処理に渡す entity Id。
   * @returns 生成または整形した文字列。
   */
  private getFilePath(entityId: string): string {
    return buildCollectionPaths({
      storageRoot: this.storageRoot,
      collectionName: this.config.collectionName,
      entityId,
      extension: ".json",
    }).filePath;
  }

  /**
   * Record を安定した内部表現へ正規化する。
   * 後続の比較・保存・表示が同じ前提で動けるように、入力差分をここで吸収する。
   *
   * @param raw 処理に渡す raw。
   * @returns unknown。
   * @remarks 入力形式や分岐ごとの差異をここで揃えているため、条件分岐を変更すると後続処理の前提も変わる。
   */
  private normalizeRecord(raw: unknown): unknown {
    if (!isJsonRecord(raw)) {
      return raw;
    }

    if (!Object.prototype.hasOwnProperty.call(raw, this.config.envelopeKey)) {
      return raw;
    }

    return raw[this.config.envelopeKey];
  }

  /**
   * Record を書き出す。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param entity 処理に渡す entity。
   */
  private async writeRecord(entity: TEntity): Promise<void> {
    const collectionDirectory = this.getCollectionDirectory();
    const filePath = this.getFilePath(this.config.getId(entity));
    const document: JsonRecord = {};

    await mkdir(collectionDirectory, { recursive: true });
    document[this.config.envelopeKey] = this.config.serialize(entity);

    await writeFile(filePath, JSON.stringify(document, null, 2), "utf8");
  }

  /**
   * Record を読み取る。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param entityId 処理に渡す entity Id。
   * @returns TEntity を解決する Promise。
   */
  private async readRecord(entityId: string): Promise<TEntity> {
    const filePath = this.getFilePath(entityId);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const record = this.normalizeRecord(parsed);
    this.validateRecord(record);

    return this.config.deserialize(record);
  }

  /**
   * validate Record を担当する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @param record 処理に渡す record。
   * @throws 処理を継続できない状態を検出した場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  private validateRecord(record: unknown): void {
    if (!this.config.validateRecord) {
      return;
    }

    const issues = this.config.validateRecord(record);
    if (issues.length === 0) {
      return;
    }

    const quotedIssues = issues.map((issue) => `"${issue}"`).join(", ");
    throw new Error(
      `${this.config.entityName} record is invalid: ${quotedIssues}`,
    );
  }

  /**
   * 対象 を永続化する。
   * 永続化形式や I/O の都合を呼び出し側へ漏らさず、一箇所で整合性を保つ。
   *
   * @param entity 処理に渡す entity。
   * @returns TEntity を解決する Promise。
   */
  public async save(entity: TEntity): Promise<TEntity> {
    await this.writeRecord(entity);
    return entity;
  }

  /**
   * 対象の値 を取得する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @param entityId 処理に渡す entity Id。
   * @returns TEntity | null を解決する Promise。
   * @throws 入力や参照先が前提を満たさない場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  public async get(entityId: string): Promise<TEntity | null> {
    try {
      return await this.readRecord(entityId);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  /**
   * 条件 を必須として検証する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @param entityId 処理に渡す entity Id。
   * @returns TEntity を解決する Promise。
   * @throws 入力や参照先が前提を満たさない場合。
   * @remarks 条件分岐や制御の意図が後続処理の前提になるため、分岐を変更するときは呼び出し側への影響も確認する。
   */
  public async require(entityId: string): Promise<TEntity> {
    const entity = await this.get(entityId);

    if (!entity) {
      throw new Error(`${this.config.entityName} not found: ${entityId}`);
    }

    return entity;
  }

  /**
   * Not Found Error を満たすか判定する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @param error 処理に渡す error。
   * @returns 条件を満たす場合は `true`。
   */
  private isNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error) || !hasErrnoCode(error)) {
      return false;
    }

    return error.code === "ENOENT";
  }
}

/**
 * Json Record を満たすか判定する。
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
 *
 * @param value 処理に渡す value。
 * @returns value is JsonRecord。
 */
function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * has Errno Code を担当する。
 * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
 *
 * @param error 処理に渡す error。
 * @returns error is Error & { code: string }。
 */
function hasErrnoCode(error: Error): error is Error & { code: string } {
  const errorCode = Object.getOwnPropertyDescriptor(error, "code")?.value;

  return typeof errorCode === "string";
}
