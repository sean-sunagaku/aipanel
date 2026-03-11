/**
 * clock を定義する。
 * このファイルは、時刻取得を小さな境界として切り出し、domain / usecase のテストで clock を差し替えやすくするために存在する。
 */

export const systemClock = {
  /**
   * now Iso を担当する。
   * 複数層で使う小さな共通契約だけを shared に寄せ、各層が同じ helper や literal を重複定義しないようにする。
   *
   * @returns 生成または整形した文字列。
   */
  nowIso(): string {
    return new Date().toISOString();
  },
};
