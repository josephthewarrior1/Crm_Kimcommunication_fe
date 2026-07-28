import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const previewDir = process.argv[4];

if (!inputPath || !outputPath || !previewDir) {
  throw new Error("Usage: node uat_update_builder.mjs <inputPath> <outputPath> <previewDir>");
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const trackerSheet = workbook.worksheets.getItem("UAT Tracker");
const summarySheet = workbook.worksheets.getItem("Summary");

const existingRows = trackerSheet.getRange("A2:G200").values;
const rowIndexByTestId = new Map();
for (let i = 0; i < existingRows.length; i += 1) {
  const testId = existingRows[i]?.[0];
  if (testId) {
    rowIndexByTestId.set(testId, i + 2);
  }
}

const updateRow = (testId, values) => {
  const rowNumber = rowIndexByTestId.get(testId);
  if (!rowNumber) {
    throw new Error(`Missing test case: ${testId}`);
  }
  trackerSheet.getRange(`A${rowNumber}:G${rowNumber}`).values = [[
    testId,
    values.module,
    values.scenario,
    values.expectedResult,
    values.passFail ?? null,
    values.comment ?? null,
    values.testerName ?? null,
  ]];
};

updateRow("EVT-06", {
  module: "Events",
  scenario: "Lifecycle 5 tab",
  expectedResult: "Participant tampil pada 5 tab lifecycle yang benar, termasuk Data List, Pre-Event, Reminder, Reminder D-Day, dan Declined.",
});

updateRow("REM-01", {
  module: "Reminders",
  scenario: "Reminder eligibility",
  expectedResult: "Participant Approve atau Confirmed muncul di Reminder tanpa mensyaratkan status Registered terpisah.",
});

updateRow("PIC-03", {
  module: "PIC Security",
  scenario: "Data List tab visibility",
  expectedResult: "Tab Data List tetap terlihat sebagai shared intake queue tanpa pembatasan PIC.",
});

const newRows = [
  ["EMS-01", "Events", "EMS event mapping", "Event bisa dihubungkan ke EMS event lewat EMS Event ID atau pilihan event EMS.", null, null, null],
  ["EMS-02", "Events", "Sync EMS participants", "Admin bisa menjalankan Sync EMS dan sistem menampilkan hasil jumlah participant yang tersinkron atau error sinkronisasi.", null, null, null],
  ["EVT-13", "Events", "Declined segregation", "Participant dengan status Decline atau Declined hanya muncul di tab Declined dan tidak tampil di queue operasional lain.", null, null, null],
  ["EVT-14", "Events", "Previous event filter", "Modal Add Participant bisa memfilter kandidat berdasarkan event sebelumnya.", null, null, null],
  ["EVT-15", "Events", "Invitation badges", "Riwayat event sebelumnya tampil sebagai badge saat memilih participant ke event baru.", null, null, null],
  ["EVT-16", "Events", "Participant search multi-keyword", "Pencarian participant mencocokkan semua kata yang diinput di nama, company, job title, email, atau phone.", null, null, null],
  ["EVT-17", "Events", "Hari H status filter", "Filter status Hari H di tab Reminder D-Day menyaring On Location, On The Way, Not Respond, dan Unable to Attend dengan benar.", null, null, null],
  ["EVT-18", "Events", "Participant pagination", "Daftar participant mendukung page size dan navigasi halaman tanpa mereset hasil filter aktif.", null, null, null],
  ["ENG-01", "Engagement", "Log call only", "Menyimpan activity Call menambah histori engagement tanpa mengubah milestone reminder secara otomatis.", null, null, null],
  ["ENG-02", "Engagement", "Log email only", "Menyimpan activity Email menambah histori engagement tanpa mengubah milestone reminder secara otomatis.", null, null, null],
  ["ENG-03", "Engagement", "Log WhatsApp only", "Menyimpan activity WhatsApp menambah histori engagement tanpa mengubah milestone reminder secara otomatis.", null, null, null],
  ["ENG-04", "Engagement", "Explicit H-7 sync", "Saat target H-7 dipilih lalu disimpan, hanya field H-7 yang diperbarui sesuai outcome yang dipilih user.", null, null, null],
  ["ENG-05", "Engagement", "Explicit H-3 sync", "Saat target H-3 dipilih lalu disimpan, hanya field H-3 yang diperbarui sesuai outcome yang dipilih user.", null, null, null],
  ["ENG-06", "Engagement", "Explicit H-1 sync", "Saat target H-1 dipilih lalu disimpan, hanya field H-1 yang diperbarui sesuai outcome yang dipilih user.", null, null, null],
  ["ENG-07", "Engagement", "Explicit D-Day sync", "Saat target D-Day dipilih lalu disimpan, hanya field D-Day atau attendance yang diperbarui sesuai outcome yang dipilih user.", null, null, null],
  ["ENG-08", "Engagement", "Explicit approval sync", "Saat target Registration Approval dipilih lalu disimpan, confirmation status berubah hanya melalui explicit save tersebut.", null, null, null],
  ["PIC-05", "PIC Security", "PIC workload presets", "Admin bisa melihat workload PIC untuk Today, 7 Days, 30 Days, All Time, dan custom range.", null, null, null],
  ["PIC-06", "PIC Security", "PIC activity timeline", "Admin bisa membuka detail activity PIC dan melihat histori Call, Email, serta WhatsApp sesuai periode.", null, null, null],
  ["PIC-07", "PIC Security", "PIC redistribution", "Admin bisa membagi sisa participant atau meredistribusikan participant ke PIC operasional secara merata.", null, null, null],
  ["PIC-08", "PIC Security", "Eligible PIC only", "User non-operasional tidak muncul sebagai target assign atau distribution PIC.", null, null, null],
  ["TKO-05", "Takeout", "Restore contact", "Admin bisa me-restore contact dari request approved atau done agar kembali aktif di directory.", null, null, null],
];

const existingCount = existingRows.filter((row) => row?.[0]).length;
const startRow = existingCount + 2;
const endRow = startRow + newRows.length - 1;
for (let row = startRow; row <= endRow; row += 1) {
  trackerSheet.getRange(`A${row}:G${row}`).copyFrom(trackerSheet.getRange("A80:G80"), "all");
}
trackerSheet.getRange(`A${startRow}:G${endRow}`).values = newRows;
trackerSheet.getRange(`E${startRow}:E${endRow}`).dataValidation = {
  rule: { type: "list", values: ["Pass", "Fail"] },
};
trackerSheet.getRange(`A${startRow}:G${endRow}`).format.autofitRows();

summarySheet.getRange("B4").formulas = [["=COUNTA('UAT Tracker'!$A$2:$A$200)"]];

const inspectSummary = await workbook.inspect({
  kind: "table",
  sheetId: "Summary",
  range: "A3:B8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 2,
});

const inspectErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

for (const sheetName of ["Instructions", "UAT Tracker", "Summary", "Lookup"]) {
  const render = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(previewDir, `${sheetName.replace(/[\\/:*?"<>|]/g, "_")}.png`),
    new Uint8Array(await render.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  addedRows: newRows.length,
  startRow,
  endRow,
  inspectSummary: inspectSummary.ndjson,
  inspectErrors: inspectErrors.ndjson,
}, null, 2));
