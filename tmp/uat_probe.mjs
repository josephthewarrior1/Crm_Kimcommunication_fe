import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = process.argv[2];

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const sheetName of ["UAT Tracker", "Summary"]) {
  const formulas = await workbook.inspect({
    kind: "formula,computedStyle",
    sheetId: sheetName,
    range: sheetName === "UAT Tracker" ? "A1:G90" : "A1:B12",
    maxChars: 12000,
    options: { maxResults: 200 },
  });
  console.log(`--- ${sheetName} ---`);
  console.log(formulas.ndjson);
}
