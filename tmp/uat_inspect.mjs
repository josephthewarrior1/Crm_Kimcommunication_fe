import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = process.argv[2];
const outputDir = process.argv[3];

if (!workbookPath || !outputDir) {
  throw new Error("Usage: node uat_inspect.mjs <workbookPath> <outputDir>");
}

await fs.mkdir(outputDir, { recursive: true });

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});

await fs.writeFile(
  path.join(outputDir, "summary.ndjson"),
  typeof summary.ndjson === "string" ? summary.ndjson : JSON.stringify(summary, null, 2),
  "utf8",
);

const sheets = workbook.worksheets.items.map((sheet) => sheet.name);
for (const sheetName of sheets) {
  const render = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(outputDir, `${sheetName.replace(/[\\/:*?"<>|]/g, "_")}.png`),
    new Uint8Array(await render.arrayBuffer()),
  );
}

console.log(JSON.stringify({ sheets, outputDir }, null, 2));
