import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "C:/Users/LENOVO/Downloads/nx_edu website copy edited.xlsx";
const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 120000,
  tableMaxRows: 100,
  tableMaxCols: 12,
  tableMaxCellChars: 1000,
});
console.log(overview.ndjson);
