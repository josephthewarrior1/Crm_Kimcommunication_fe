import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:\\Users\\LENOVO\\Downloads\\nx_edu website copy edited.xlsx";
const outputDir = "C:\\Users\\LENOVO\\OneDrive\\Dokumen\\Folder Kim\\Crm_Kimcommunication_fe\\.codex-tmp-nxedu\\inspection";
await fs.mkdir(outputDir, { recursive: true });

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const overview = await workbook.inspect({
  kind: "workbook,sheet,table,drawing,thread",
  maxChars: 20000,
  tableMaxRows: 12,
  tableMaxCols: 12,
  tableMaxCellChars: 300,
});

const sheets = [];
for (let i = 0; i < workbook.worksheets.items.length; i += 1) {
  const sheet = workbook.worksheets.getItemAt(i);
  const used = sheet.getUsedRange();
  const entry = {
    index: i,
    name: sheet.name,
    usedAddress: used?.address ?? null,
    values: used?.values ?? [],
    formulas: used?.formulas ?? [],
  };
  sheets.push(entry);
  try {
    const preview = await workbook.render({
      sheetName: sheet.name,
      autoCrop: "all",
      scale: 1.5,
      format: "png",
    });
    const safeName = sheet.name.replace(/[<>:"/\\|?*]/g, "_");
    await fs.writeFile(
      path.join(outputDir, `${String(i + 1).padStart(2, "0")}_${safeName}.png`),
      new Uint8Array(await preview.arrayBuffer()),
    );
  } catch (error) {
    entry.renderError = String(error);
  }
}

await fs.writeFile(
  path.join(outputDir, "workbook.json"),
  JSON.stringify({ overview: overview.ndjson, sheets }, null, 2),
  "utf8",
);
console.log(JSON.stringify({
  outputDir,
  sheetCount: sheets.length,
  sheets: sheets.map(({ name, usedAddress, values, renderError }) => ({
    name,
    usedAddress,
    rows: values.length,
    cols: values[0]?.length ?? 0,
    renderError,
  })),
}, null, 2));
