# NPM Package Distribution

## Goal

`aipanel-cli` を npm package として配布し、`npm install -g aipanel-cli` で CLI を使える状態にする。

## Packaging Rules

- `dist/` は生成物なので git では追跡しない
- publish artifact には `dist`, `README.md`, `LICENSE` だけを含める
- publish 前には `prepack` で build を走らせる

## Current Package Shape

- package name: `aipanel-cli`
- binary entry: `dist/bin/aipanel.js`
- build config: `tsconfig.build.json`
- files allowlist: `dist`, `README.md`, `LICENSE`
- automation entry: `Makefile`

## Local Verification

```bash
npm run build
tarball="$(npm pack)"
tmpdir="$(mktemp -d)"
npm install --prefix "$tmpdir" "./${tarball}"
"$tmpdir/node_modules/.bin/aipanel" providers --json
```

同じ確認は以下でも行える。

```bash
make pack-dry-run
make verify-package
make publish-check
```

## Publish Workflow

```bash
npm whoami
make publish-check
make publish
```

publish 後の利用確認:

```bash
npm install -g aipanel-cli
aipanel providers --json
```

import 利用確認:

```bash
tmpdir="$(mktemp -d)"
npm install --prefix "$tmpdir" aipanel-cli
(
  cd "$tmpdir"
  node --input-type=module -e 'const root = await import("aipanel-cli"); const domain = await import("aipanel-cli/domain"); console.log(Boolean(root.AipanelApp), Boolean(domain.Session));'
)
```

2026-03-10 JST 時点の公開済み version:

- package: `aipanel-cli@0.1.2`
- tarball: `https://registry.npmjs.org/aipanel-cli/-/aipanel-cli-0.1.2.tgz`

## Notes

- unscoped の `aipanel` は publish 時に `ai-panel` と近すぎるとして拒否されるため、公開名は `aipanel-cli` にする
- 実 publish 前には npm account と access policy を確認する
- `dist/` は git ignore するが、npm package には `prepack` + `files` allowlist で含める
- publish 後、tarball URL は先に到達可能になり、その後 `npm install aipanel-cli` も確認できた
- publish 前チェックでは、packaged CLI 実行に加えて `import("aipanel-cli")` と `import("aipanel-cli/domain")` も確認する
