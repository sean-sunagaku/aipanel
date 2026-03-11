# Comment Rationale Reviewer Prompt

この prompt は、`reports/symbol-context.json` の `needsPurposeReview: true` を持つ宣言を SubAgent に見てもらうためのテンプレートです。

## 使い方

- `pnpm run docs:context` を実行して `reports/symbol-context.json` を生成する
- `needsPurposeReview: true` の宣言だけを対象にして SubAgent へ渡す
- SubAgent には「コードにない意図を断定しない」ことを明示する
- 必要なら対象 file 全体、近い import 先、主要な呼び出し元も読ませてから判断する

## Prompt Template

```md
以下の宣言について、JSDoc の要約直後に「この repo でなぜ存在するか / どの責務を持つか」を直接書いた方がよいかレビューしてください。

- 対象シンボル: {symbolPath}
- ファイル: {filePath}:{line}
- rationaleSignalCount: {rationaleSignalCount}
- 現在の JSDoc:
  {jsdoc}

やってほしいこと:

1. if / switch / try-catch / 反復処理などの分岐が、追加説明を必要とするか判定する
2. そのシンボルが独立して存在する理由と、上位層 / 下位層との責務境界が読めるか判定する
3. 必要なら、Hover で読みやすい日本語 1-2 文の追記案を出す
4. コードから断定できない意図は書かない
5. `なぜ:` のようなラベルは使わず、そのまま目的を書く
6. generic な固定文ではなく、その file / symbol の現在の実装に即した説明にする

出力形式:

- 判定: keep / add-purpose
- 理由:
- 追記案:
```
