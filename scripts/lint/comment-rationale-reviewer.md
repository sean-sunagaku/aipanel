# Comment Rationale Reviewer Prompt

この prompt は、`reports/symbol-context.json` の `needsPurposeReview: true` を持つ宣言を SubAgent に見てもらうためのテンプレートです。

## 使い方

- `pnpm run docs:context` を実行して `reports/symbol-context.json` を生成する
- `needsPurposeReview: true` の宣言だけを対象にして SubAgent へ渡す
- SubAgent には「コードにない意図を断定しない」ことを明示する

## Prompt Template

```md
以下の宣言について、JSDoc の要約直後に「目的や設計上の意味を直接書いた方がよいか」をレビューしてください。

- 対象シンボル: {symbolPath}
- ファイル: {filePath}:{line}
- rationaleSignalCount: {rationaleSignalCount}
- 現在の JSDoc:
  {jsdoc}

やってほしいこと:

1. if / switch / try-catch / 反復処理などの分岐が、追加説明を必要とするか判定する
2. 必要なら、Hover で読みやすい日本語 1-2 文の追記案を出す
3. コードから断定できない意図は書かない
4. `なぜ:` のようなラベルは使わず、そのまま目的を書く

出力形式:

- 判定: keep / add-purpose
- 理由:
- 追記案:
```
