// Run: node scripts/check-event-import-template.cjs. Generates both templates in memory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const source = fs.readFileSync(path.join(__dirname, '../app/dashboard/events/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function find(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleDownloadTemplate') handler = node.initializer.getText(ast);
  ts.forEachChild(node, find);
}
find(ast);
assert(handler, 'Event template download handler must exist');
let downloaded;
const context = {
  exports: {},
  XLSX: { ...XLSX, writeFile(workbook, filename) { downloaded = { workbook, filename }; } },
  toast: { success() {} },
};
vm.runInNewContext(ts.transpileModule(`exports.download = ${handler};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, context);
for (const destination of ['company', 'participant']) {
  context.exports.download(destination);
  const { workbook, filename } = downloaded;
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const [headers, emailOnly, phoneOnly] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const emailHeader = destination === 'participant' ? 'Email' : 'Company Email Address';
  assert.equal(headers.length, destination === 'participant' ? 6 : 21);
  for (const header of ['First Name', 'Last Name', emailHeader, 'Mobile Phone']) assert(headers.includes(header));
  assert(emailOnly[headers.indexOf(emailHeader)].endsWith('@example.com'));
  assert.equal(emailOnly[headers.indexOf('Mobile Phone')], '');
  assert.equal(phoneOnly[headers.indexOf(emailHeader)], '');
  assert.equal(phoneOnly[headers.indexOf('Mobile Phone')], '081200000001');
  if (destination === 'participant') {
    assert(headers.includes('Sekolah/Kampus/Instansi'));
    assert(headers.includes('Kategori Peserta'));
    assert(!headers.includes('Company Name'));
    assert.equal(filename, 'Event_Peserta_Import_Template.xlsx');
  } else {
    assert(headers.includes('Company Name'));
    assert(headers.includes('Nama Group'));
    assert.equal(emailOnly[headers.indexOf('Company Name')], '', 'Company metadata is optional for Event import');
    assert.equal(filename, 'Event_Perusahaan_Import_Template.xlsx');
  }
}
console.log('Event templates passed: explicit destination, email-only and phone-only examples, optional metadata.');
