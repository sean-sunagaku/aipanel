import {
  collectDeclarations,
  listTypeScriptFiles,
  loadSource,
  validateDeclaration,
} from "./comment-contract.mjs";

const files = await listTypeScriptFiles();
const violations = [];
let checkedCount = 0;

for (const filePath of files) {
  const { text, sourceFile } = await loadSource(filePath);
  const declarations = collectDeclarations(filePath, sourceFile, text);

  for (const declaration of declarations) {
    checkedCount += 1;
    const errors = validateDeclaration(declaration);
    for (const error of errors) {
      violations.push(
        `${declaration.relativePath}:${declaration.line} ${declaration.symbolPath} - ${error}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(
    [
      `コメント契約チェックで ${violations.length} 件の違反が見つかりました。`,
      ...violations,
    ].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    `コメント契約チェック: ${checkedCount} 件を確認し、違反はありませんでした。`,
  );
}
