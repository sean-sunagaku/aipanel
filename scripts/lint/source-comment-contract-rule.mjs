function getLeadingJsDoc(sourceCode, node) {
  const targetNode =
    node.parent?.type === "ExportNamedDeclaration" ? node.parent : node;
  const comments = sourceCode.getCommentsBefore(targetNode);
  const nodeStartLine = targetNode.loc?.start.line;

  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    if (
      comment.type === "Block" &&
      comment.value.startsWith("*") &&
      comment.loc?.end.line === nodeStartLine - 1
    ) {
      return comment;
    }
  }

  return null;
}

function normalizeCommentLines(comment) {
  return comment.value
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean);
}

function getSummaryLine(lines) {
  return lines.find((line) => !line.startsWith("@"));
}

function isTargetNode(node) {
  if (node.type === "ClassDeclaration" && node.id?.name) {
    return true;
  }

  if (node.type === "FunctionDeclaration" && node.id?.name) {
    return true;
  }

  if (
    node.type === "MethodDefinition" &&
    node.kind !== "constructor" &&
    (node.key?.type === "Identifier" || node.key?.type === "PrivateIdentifier")
  ) {
    return true;
  }

  return false;
}

function getSymbolName(node) {
  if (node.type === "ClassDeclaration" || node.type === "FunctionDeclaration") {
    return node.id?.name ?? "(anonymous)";
  }

  if (node.type === "MethodDefinition") {
    if (node.key.type === "Identifier") {
      return node.key.name;
    }

    if (node.key.type === "PrivateIdentifier") {
      return `#${node.key.name}`;
    }
  }

  return "(unknown)";
}

const sourceCommentContractRule = {
  meta: {
    type: "problem",
    docs: {
      description: "`src` 配下の宣言に日本語コメント契約を要求する。",
    },
    schema: [],
    messages: {
      missing: "宣言 `{{name}}` に JSDoc コメントを追加してください。",
      summary: "宣言 `{{name}}` の要約行が不足しています。",
      short: "宣言 `{{name}}` の要約行が短すぎます。",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function check(node) {
      if (!isTargetNode(node)) {
        return;
      }

      const name = getSymbolName(node);
      const comment = getLeadingJsDoc(sourceCode, node);
      if (!comment) {
        context.report({ node, messageId: "missing", data: { name } });
        return;
      }

      const lines = normalizeCommentLines(comment);
      const summaryLine = getSummaryLine(lines);
      if (!summaryLine) {
        context.report({ node, messageId: "summary", data: { name } });
        return;
      }

      if (summaryLine.length < 10) {
        context.report({ node, messageId: "short", data: { name } });
      }
    }

    return {
      ClassDeclaration: check,
      FunctionDeclaration: check,
      MethodDefinition: check,
    };
  },
};

export default {
  rules: {
    "source-comment-contract": sourceCommentContractRule,
  },
};
