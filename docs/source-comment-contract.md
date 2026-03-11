# `src` コメント契約

`src` 配下の file / class / function / method には、コードだけでは落ちやすい文脈を日本語で残します。目的はコメントを増やすことではなく、AI と人が重要な実装を dead code と誤判定しにくくしつつ、「この repo の中で何のためにあるのか」をすぐ追えるようにすることです。

## 基本形

```ts
/**
 * RunRepository を定義する。
 * このファイルは、Run ledger の保存・取得・record validation を repository に集め、永続化形式を use case や coordinator へ漏らさないために存在する。
 */
```

```ts
/**
 * RunRepository の永続化境界を定義する。
 * Run ledger の保存・取得・record validation を repository に集め、永続化形式を use case や coordinator へ漏らさないようにする。
 *
 * @param run 保存対象の実行記録。
 */
```

## 期待する内容

- file 先頭: 「このファイルは何のために存在するか」を 2 行以上の JSDoc で書く
- 1 行目: 何をする宣言か、または何の役かを簡潔に書く
- 要約の直後: その宣言が担う目的、設計上の意味、責務の置き場を直接書く
- 特に class は「責務を一箇所にまとめる」のような抽象句ではなく、この repo の中での役割を書く
- `何をするか` だけでなく `なぜ独立した file / symbol として存在するか` を優先して書く
- fixed phrase をコピペせず、対象 file の実装・import・呼び出し元を見て、その時点の責務を自分で言語化する
- コメント生成スクリプトを使う場合も、出力をそのまま確定版にせず AI review で repo 文脈へ寄せる
- 順序依存、永続化、外部 I/O、正規化、比較、状態遷移、外部プロセス起動など、意図を落とすと危険な箇所では要約の直後に目的を書く
- 引数がある宣言には `@param` を書き、Hover で意味が追えるようにする
- 戻り値がある宣言には `@returns` を書く
- 直接 `throw` する宣言には `@throws` を書く
- `if` / `switch` / `try-catch` / 反復処理が重なる宣言には `@remarks` を書き、分岐の扱いを変えるときの注意点を残す

## `src/domain` で特に書くこと

- `src/domain` では「何を変換するか」より先に「なぜこの model が存在するか」「session / run / artifact のどの責務を持つか」を書く
- `fromJSON` / `toJSON` の説明だけで class 全体の意図を代用しない
- file 先頭で、その file が持つ概念群を説明する
- `値オブジェクトや集約の変換規則を散らさず…` のような generic な文で止めず、`Run ledger を保持するため` `followup の正本を持つため` など repo 固有の責務まで書く
- file を作った時点の意図がコードから読めるなら、その意図をそのまま書く。過去の template へ無理に合わせない

## 補足

- コメント本文は基本日本語で統一する
- `どこで呼ばれているか` は変わりやすいのでソースコメントへ固定せず、`pnpm run docs:context` のレポートで追う
- private method と file-local helper も対象に含める
- JSDoc として書き、Hover とドキュメント出力の両方で読みやすい段落構成を優先する
