export const systemClock = {
  /**
   * now Iso を担当する。
   * 責務をここに閉じ込め、周辺コードが詳細を持たずに済むようにする。
   *
   * @returns 生成または整形した文字列。
   */
  nowIso(): string {
    return new Date().toISOString();
  },
};
