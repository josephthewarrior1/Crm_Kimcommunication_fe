// Real Excel export/download handlers, anonymous data, no network or file writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const project = path.resolve(__dirname, '..');
const headers = ['No', 'Nama Group/Holding Company', 'Nama Brand', 'Company Name', 'Salutation', 'First Name', 'Last Name', 'Position', 'Division', 'Jobtitle', 'Address', 'Office Phone', 'Mobile Phone', 'Personal Email Address', 'Industry', 'Company Size (Revenue)', 'Company Size (Employee)', 'Cabang/Kantor', 'Postal Code', 'Company Website'];
function evaluate(source, context) {
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, context);
}
function declaration(file, name) {
  const source = fs.readFileSync(path.join(project, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer.getText(ast); ts.forEachChild(node, visit); }
  visit(ast); assert(found, name); return found;
}
const helpers = { exports: {} };
evaluate(fs.readFileSync(path.join(project, 'lib/utils/companyBranch.ts'), 'utf8'), helpers);
const participant = { id: 7, databaseDestination: 'participant', institutionName: 'Student Institution',
  salutation: 'Ms', firstName: 'Student', lastName: 'Example', positionLevel: 'unknown', specialityDivision: 'Education', jobTitle: 'Student',
  mobilePhone: '081200001111, 081300002222', organizationGroupName: 'Student Group', organizationBrandName: 'Student Brand',
  organizationAddress: 'Student Address', organizationOfficePhone: '0215550001', organizationIndustry: 'Education',
  organizationSizeRevenue: 'Small', organizationSizeEmployee: 'Medium', organizationBranchName: 'Student Branch',
  organizationPostalCode: '00123', organizationWebsite: 'https://campus.example.invalid',
  emails: [{ email: 'student@campus.example.invalid', emailType: 'company', isCorporate: true }, { email: 'student@gmail.com', emailType: 'personal' }],
  company: { name: 'Unrelated master must not appear', address: 'Wrong address', industry: 'Wrong industry' } };
const original = JSON.stringify(participant);
let saved, closed = 0, exported;
const context = { exports: {}, console, destination: 'participant', databases: [participant], tempSelectedDbIds: [7],
  columns: ['groupName', 'brandName', 'companyName', 'salutation', 'firstName', 'lastName', 'position', 'specialityDivision', 'jobTitle', 'address', 'officePhone', 'mobilePhone', 'personalEmail', 'industry', 'revenueSize', 'employeeSize', 'branchName', 'postalCode', 'website'],
  ...helpers.exports, getOfficeEmail() { throw Error('Student has no Company Email column'); }, getPersonalEmail() { throw Error('Student must retain legacy corporate-typed email too'); },
  crmService: { getEventParticipants() { throw Error('No unrelated event/network request'); } },
  XLSX: { ...XLSX, writeFile(workbook, filename) { saved = { workbook, filename }; } },
  toast: { loading() { return 'loading'; }, success() {}, error(message) { throw Error(message); } },
  onClose() { closed++; }, onExportSuccess(ids) { exported = ids; } };
evaluate('exports.export = ' + declaration('app/dashboard/database/components/ExportConfigModal.tsx', 'handleExecuteExport'), context);
(async () => {
  await context.exports.export();
  const rows = XLSX.utils.sheet_to_json(saved.workbook.Sheets.Databases, { header: 1, defval: '' });
  assert.deepEqual(rows[0], headers);
  assert.deepEqual(rows[1], [1, 'Student Group', 'Student Brand', 'Student Institution', 'Ms', 'Student', 'Example', 'unknown', 'Education', 'Student', 'Student Address', '0215550001', '081200001111, 081300002222', 'student@campus.example.invalid; student@gmail.com', 'Education', 'Small', 'Medium', 'Student Branch', '00123', 'https://campus.example.invalid']);
  assert.equal(JSON.stringify(participant), original, 'Export never mutates contact or Company master');
  assert.equal(closed, 1); assert.deepEqual(exported, [7]);
  const modal = 'app/dashboard/database/components/ExcelImportModal.tsx';
  evaluate('const PARTICIPANT_HEADERS = ' + declaration(modal, 'PARTICIPANT_HEADERS') + '; exports.download = ' + declaration(modal, 'downloadParticipantTemplate'), context);
  context.exports.download();
  assert.deepEqual(XLSX.utils.sheet_to_json(saved.workbook.Sheets.Peserta, { header: 1 })[0], headers, 'Database template and export share the requested twenty headers');
  console.log('Student export passed: twenty columns, own organization fields, legacy/campus emails, two phones, postal zeroes, unchanged Company data, matching import template.');
})().catch(error => { console.error(error); process.exitCode = 1; });
