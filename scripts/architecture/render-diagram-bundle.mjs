import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const COLORS = {
  headerFill: "#111827",
  headerStroke: "#111827",
  headerText: "#FFFFFF",
  entryFill: "#DBEAFE",
  entryStroke: "#2563EB",
  appFill: "#EDE9FE",
  appStroke: "#7C3AED",
  usecaseFill: "#FCE7F3",
  usecaseStroke: "#DB2777",
  serviceFill: "#FEF3C7",
  serviceStroke: "#D97706",
  providerFill: "#FCE7F3",
  providerStroke: "#BE185D",
  persistenceFill: "#DCFCE7",
  persistenceStroke: "#16A34A",
  domainFill: "#E0F2FE",
  domainStroke: "#0284C7",
  noteFill: "#F9FAFB",
  noteStroke: "#6B7280",
  edge: "#374151",
  background: "#FFFFFF",
  text: "#111827",
};

const ALLOWED_STYLE_TYPES = new Set([
  "header",
  "entry",
  "app",
  "usecase",
  "service",
  "provider",
  "persistence",
  "domain",
  "note",
]);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function drawioLabel(label) {
  return escapeXml(String(label)).replace(/\n/g, "&#xa;");
}

function textLines(label) {
  return String(label).split("\n");
}

function center(nodeDef) {
  return {
    x: nodeDef.x + nodeDef.width / 2,
    y: nodeDef.y + nodeDef.height / 2,
  };
}

function anchorPoints(sourceNode, targetNode) {
  const sourceCenter = center(sourceNode);
  const targetCenter = center(targetNode);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const start =
      dx >= 0
        ? { x: sourceNode.x + sourceNode.width, y: sourceCenter.y }
        : { x: sourceNode.x, y: sourceCenter.y };
    const end =
      dx >= 0
        ? { x: targetNode.x, y: targetCenter.y }
        : { x: targetNode.x + targetNode.width, y: targetCenter.y };
    const midX = (start.x + end.x) / 2;
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  const start =
    dy >= 0
      ? { x: sourceCenter.x, y: sourceNode.y + sourceNode.height }
      : { x: sourceCenter.x, y: sourceNode.y };
  const end =
    dy >= 0
      ? { x: targetCenter.x, y: targetNode.y }
      : { x: targetCenter.x, y: targetNode.y + targetNode.height };
  const midY = (start.y + end.y) / 2;
  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

function styleForNode(styleType) {
  if (styleType === "header") {
    return {
      fill: COLORS.headerFill,
      stroke: COLORS.headerStroke,
      text: COLORS.headerText,
      fontSize: 20,
      rounded: 14,
      dashed: false,
    };
  }

  if (styleType === "note") {
    return {
      fill: COLORS.noteFill,
      stroke: COLORS.noteStroke,
      text: COLORS.text,
      fontSize: 14,
      rounded: 12,
      dashed: true,
    };
  }

  const map = {
    entry: { fill: COLORS.entryFill, stroke: COLORS.entryStroke },
    app: { fill: COLORS.appFill, stroke: COLORS.appStroke },
    usecase: { fill: COLORS.usecaseFill, stroke: COLORS.usecaseStroke },
    service: { fill: COLORS.serviceFill, stroke: COLORS.serviceStroke },
    provider: { fill: COLORS.providerFill, stroke: COLORS.providerStroke },
    persistence: {
      fill: COLORS.persistenceFill,
      stroke: COLORS.persistenceStroke,
    },
    domain: { fill: COLORS.domainFill, stroke: COLORS.domainStroke },
  };

  return {
    fill: map[styleType]?.fill ?? COLORS.noteFill,
    stroke: map[styleType]?.stroke ?? COLORS.noteStroke,
    text: COLORS.text,
    fontSize: 14,
    rounded: 12,
    dashed: false,
  };
}

function drawioNodeStyle(nodeDef) {
  const style = styleForNode(nodeDef.styleType);
  const parts = [
    "shape=rectangle",
    "rounded=1",
    "whiteSpace=wrap",
    "html=0",
    "align=center",
    "verticalAlign=middle",
    `arcSize=${style.rounded}`,
    `fillColor=${style.fill}`,
    `strokeColor=${style.stroke}`,
    `fontColor=${style.text}`,
    `fontSize=${style.fontSize}`,
    "strokeWidth=2",
  ];

  if (style.dashed) {
    parts.push("dashed=1");
  }

  return parts.join(";");
}

function drawioEdgeStyle(edgeDef) {
  const stroke = edgeDef.stroke ?? COLORS.edge;
  return [
    "edgeStyle=orthogonalEdgeStyle",
    "rounded=0",
    "orthogonalLoop=1",
    "jettySize=auto",
    "html=1",
    `strokeColor=${stroke}`,
    "strokeWidth=2",
    "endArrow=classic",
    "endFill=1",
  ].join(";");
}

function renderDrawio(diagram) {
  const nodesById = new Map(diagram.nodes.map((item) => [item.id, item]));
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];

  for (const nodeDef of diagram.nodes) {
    cells.push(
      `<mxCell id="${escapeXml(nodeDef.id)}" value="${drawioLabel(nodeDef.label)}" style="${drawioNodeStyle(nodeDef)}" vertex="1" parent="1"><mxGeometry x="${nodeDef.x}" y="${nodeDef.y}" width="${nodeDef.width}" height="${nodeDef.height}" as="geometry"/></mxCell>`,
    );
  }

  for (const edgeDef of diagram.edges) {
    const sourceNode = nodesById.get(edgeDef.source);
    const targetNode = nodesById.get(edgeDef.target);

    if (!sourceNode || !targetNode) {
      continue;
    }

    const points =
      edgeDef.points ?? anchorPoints(sourceNode, targetNode).slice(1, -1);
    const pointXml =
      points.length === 0
        ? ""
        : `<Array as="points">${points
            .map((point) => `<mxPoint x="${point.x}" y="${point.y}"/>`)
            .join("")}</Array>`;

    cells.push(
      `<mxCell id="${escapeXml(edgeDef.id)}" value="" style="${drawioEdgeStyle(edgeDef)}" edge="1" parent="1" source="${escapeXml(edgeDef.source)}" target="${escapeXml(edgeDef.target)}"><mxGeometry relative="1" as="geometry">${pointXml}</mxGeometry></mxCell>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-03-10T00:00:00.000Z" agent="Codex" version="24.7.17">\n  <diagram id="${escapeXml(diagram.id)}" name="${escapeXml(diagram.title)}">\n    <mxGraphModel dx="${diagram.width}" dy="${diagram.height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${diagram.width}" pageHeight="${diagram.height}" math="0" shadow="0" background="${COLORS.background}">\n      <root>\n        ${cells.join("\n        ")}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n`;
}

function svgText(nodeDef) {
  const style = styleForNode(nodeDef.styleType);
  const lines = textLines(nodeDef.label);
  const lineHeight = nodeDef.styleType === "header" ? 24 : style.fontSize + 4;
  const startY =
    nodeDef.y + nodeDef.height / 2 - ((lines.length - 1) * lineHeight) / 2 + 5;
  const x = nodeDef.x + nodeDef.width / 2;
  return `<text x="${x}" y="${startY}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${style.fontSize}" fill="${style.text}">${lines
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("")}</text>`;
}

function renderSvg(diagram) {
  const nodesById = new Map(diagram.nodes.map((item) => [item.id, item]));
  const edgeSvg = diagram.edges
    .map((edgeDef) => {
      const sourceNode = nodesById.get(edgeDef.source);
      const targetNode = nodesById.get(edgeDef.target);

      if (!sourceNode || !targetNode) {
        return "";
      }

      const points = edgeDef.points ?? anchorPoints(sourceNode, targetNode);
      const d = points
        .map(
          (point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
        )
        .join(" ");

      return `<path d="${d}" fill="none" stroke="${edgeDef.stroke ?? COLORS.edge}" stroke-width="2.5" marker-end="url(#arrow)"/>`;
    })
    .join("\n  ");

  const nodeSvg = diagram.nodes
    .map((nodeDef) => {
      const style = styleForNode(nodeDef.styleType);
      const dash = style.dashed ? ' stroke-dasharray="8 6"' : "";
      return `<g id="${escapeXml(nodeDef.id)}">
    <rect x="${nodeDef.x}" y="${nodeDef.y}" width="${nodeDef.width}" height="${nodeDef.height}" rx="${style.rounded}" ry="${style.rounded}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"${dash}/>
    ${svgText(nodeDef)}
  </g>`;
    })
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${diagram.width}" height="${diagram.height}" viewBox="0 0 ${diagram.width} ${diagram.height}">\n  <defs>\n    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">\n      <path d="M 0 0 L 10 5 L 0 10 z" fill="${COLORS.edge}"/>\n    </marker>\n  </defs>\n  <rect width="${diagram.width}" height="${diagram.height}" fill="${COLORS.background}"/>\n  ${edgeSvg}\n  ${nodeSvg}\n</svg>\n`;
}

function ensureNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number.`);
  }
}

function assertBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    throw new Error("Diagram bundle must be a JSON object.");
  }

  if (!Array.isArray(bundle.diagrams) || bundle.diagrams.length === 0) {
    throw new Error("Diagram bundle must contain a non-empty diagrams array.");
  }

  for (const item of bundle.diagrams) {
    if (!item || typeof item !== "object") {
      throw new Error("Each diagram item must be an object.");
    }

    if (typeof item.filename !== "string" || item.filename.length === 0) {
      throw new Error("Each diagram item must have a filename.");
    }

    if (typeof item.summary !== "string") {
      throw new Error(`Diagram ${item.filename} must have a summary.`);
    }

    if (!item.diagram || typeof item.diagram !== "object") {
      throw new Error(
        `Diagram ${item.filename} must include a diagram object.`,
      );
    }

    const diagram = item.diagram;
    for (const key of ["id", "title"]) {
      if (typeof diagram[key] !== "string" || diagram[key].length === 0) {
        throw new Error(`Diagram ${item.filename} must define ${key}.`);
      }
    }

    ensureNumber(diagram.width, `${item.filename}.diagram.width`);
    ensureNumber(diagram.height, `${item.filename}.diagram.height`);

    if (!Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
      throw new Error(
        `Diagram ${item.filename} must define nodes and edges arrays.`,
      );
    }

    const nodeIds = new Set();
    for (const node of diagram.nodes) {
      for (const key of ["id", "label", "styleType"]) {
        if (typeof node[key] !== "string" || node[key].length === 0) {
          throw new Error(`Node in ${item.filename} is missing ${key}.`);
        }
      }

      if (!ALLOWED_STYLE_TYPES.has(node.styleType)) {
        throw new Error(
          `Node ${node.id} in ${item.filename} has unsupported styleType ${node.styleType}.`,
        );
      }

      ensureNumber(node.x, `${item.filename}.nodes.${node.id}.x`);
      ensureNumber(node.y, `${item.filename}.nodes.${node.id}.y`);
      ensureNumber(node.width, `${item.filename}.nodes.${node.id}.width`);
      ensureNumber(node.height, `${item.filename}.nodes.${node.id}.height`);
      nodeIds.add(node.id);
    }

    for (const edge of diagram.edges) {
      for (const key of ["id", "source", "target"]) {
        if (typeof edge[key] !== "string" || edge[key].length === 0) {
          throw new Error(`Edge in ${item.filename} is missing ${key}.`);
        }
      }

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new Error(
          `Edge ${edge.id} in ${item.filename} references unknown nodes.`,
        );
      }
    }
  }
}

function renderMarkdown(bundle, specFileName, renderCommand) {
  const readingGuide = Array.isArray(bundle.readingGuide)
    ? bundle.readingGuide
    : [];
  const dataStructureNotes = Array.isArray(bundle.dataStructureNotes)
    ? bundle.dataStructureNotes
    : [];
  const title = bundle.title ?? "Current Implementation Diagrams";
  const runtimeScope = bundle.runtimeScope ?? "Current implementation";

  return `# ${title}

対象スコープ: ${runtimeScope}

diagram spec は \`./source/${specFileName}\` に保存し、この bundle から draw.io source と SVG export を再生成する。

## Files

| Diagram | Summary | SVG | Source |
|---|---|---|---|
${bundle.diagrams
  .map(
    (item) =>
      `| ${item.filename} | ${item.summary} | [${item.filename}.svg](./${item.filename}.svg) | [${item.filename}.drawio](./source/${item.filename}.drawio) |`,
  )
  .join("\n")}

## Generation

\`\`\`bash
${renderCommand}
\`\`\`

Codex sub-agent が spec JSON を作成し、この renderer が \`.drawio\` と \`.svg\` を生成する。

## Diagram Reading Guide

${readingGuide
  .map(
    (item) =>
      `### ${item.filename}\n${item.points.map((point) => `- ${point}`).join("\n")}`,
  )
  .join("\n\n")}

## Canonical Data Structure Notes

${dataStructureNotes.map((note) => `- ${note}`).join("\n")}
`;
}

async function main() {
  const [specPathArg, outputDirArg] = process.argv.slice(2);

  if (!specPathArg) {
    throw new Error(
      "Usage: node scripts/architecture/render-diagram-bundle.mjs <spec.json> [output-dir]",
    );
  }

  const specPath = path.resolve(specPathArg);
  const outputDir = path.resolve(
    outputDirArg ?? path.dirname(path.dirname(specPath)),
  );
  const sourceDir = path.join(outputDir, "source");
  const specFileName = path.basename(specPath);
  const renderCommand = `node scripts/architecture/render-diagram-bundle.mjs ${path.relative(process.cwd(), specPath)} ${path.relative(process.cwd(), outputDir) || "."}`;
  const bundle = JSON.parse(await readFile(specPath, "utf8"));

  assertBundle(bundle);
  await mkdir(sourceDir, { recursive: true });

  const specCopyPath = path.join(sourceDir, specFileName);
  await writeFile(specCopyPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  for (const item of bundle.diagrams) {
    const drawioPath = path.join(sourceDir, `${item.filename}.drawio`);
    const svgPath = path.join(outputDir, `${item.filename}.svg`);
    await writeFile(drawioPath, renderDrawio(item.diagram), "utf8");
    await writeFile(svgPath, renderSvg(item.diagram), "utf8");
  }

  const indexFileName =
    bundle.indexFileName ?? "12_current-implementation-diagrams.md";
  await writeFile(
    path.join(outputDir, indexFileName),
    renderMarkdown(bundle, specFileName, renderCommand),
    "utf8",
  );
}

await main();
