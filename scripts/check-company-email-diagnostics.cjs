// Run: node scripts/check-company-email-diagnostics.cjs. Real quality helpers and rendered contact details; no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const fail = name => { throw Error('Unexpected dependency: ' + name); };
function compile(file, requireModule = fail) {
  const context = { exports: {}, require: requireModule, console, URL };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, context, { filename: file });
  return context.exports;
}
const notes = compile('app/dashboard/events/utils/notesHelper.ts');
const category = compile('app/dashboard/database/utils/emailCategory.ts', name => name.endsWith('/notesHelper') ? notes : fail(name));
const office = compile('lib/utils/companyBranch.ts');
const quality = compile('app/dashboard/database/utils/validationHelper.ts', name => name.endsWith('/emailCategory') ? category : name.endsWith('/companyBranch') ? office : fail(name));
const statuses = compile('app/dashboard/events/utils/statusHelper.ts');
const box = ({ children }) => React.createElement('div', null, children);
const { DatabaseDetailModal } = compile('app/dashboard/database/components/DatabaseDetailModal.tsx', name => {
  if (name === 'react') return React;
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => React.createElement('svg') });
  if (name.endsWith('/ui/dialog')) return { Dialog: box, DialogClose: box, DialogContent: box, DialogDescription: box, DialogTitle: box };
  if (name.endsWith('/validationHelper')) return quality;
  if (name.endsWith('/emailCategory')) return category;
  if (name.endsWith('/companyBranch')) return office;
  if (name.endsWith('/statusHelper')) return statuses;
  return fail(name);
});
const companyEmail = (email, id = 1) => ({ id, email, emailType: 'company', isCorporate: true, isPrimary: id === 1 });
const contact = emails => ({ id: 1, databaseDestination: 'company', salutation: 'Mr', firstName: 'Example', lastName: 'Contact',
  positionLevel: 'unknown', jobTitle: 'Officer', mobilePhone: '081234567890', databaseType: 'end_user', isActive: true, emails,
  company: { name: 'Example Company', group: { name: 'Example Holding' }, brandName: 'Example Brand', industry: 'Technology',
    address: 'Example Address', officePhone: '021123456', city: 'Jakarta', website: 'https://example.test' } });
const render = database => renderToStaticMarkup(React.createElement(DatabaseDetailModal, {
  isOpen: true, onClose() {}, database, emails: database.emails, loadingEmails: false, events: [], loadingEvents: false, companies: [],
}));
const plain = value => JSON.parse(JSON.stringify(value));

const missing = quality.checkDatabaseCompleteness(contact([]));
assert.deepEqual(plain(missing.missingFields), ['Company Email']);
assert.deepEqual(plain(missing.fieldMessages), {});
assert(!quality.getDatabaseCompletenessTitle(missing).includes('Format'), 'An empty email is not reported as malformed');

for (const separator of [' ', '  ', ', ', '; ']) {
  const combined = 'alex@company.example' + separator + 'alex@legacy.example';
  const database = contact([companyEmail(combined), { id: 3, email: 'alex@gmail.com', emailType: 'personal', isCorporate: false }]);
  const original = JSON.stringify(database);
  const result = quality.checkDatabaseCompleteness(database);
  assert.equal(result.isIncomplete, true);
  assert.deepEqual(plain(result.missingFields), ['Company Email'], 'Canonical Company Email identifier stays compatible');
  assert.match(result.fieldMessages['Company Email'], /Beberapa alamat tersimpan dalam satu entri/);
  const tooltip = quality.getDatabaseCompletenessTitle(result);
  assert.match(tooltip, /Company Email: Beberapa alamat/);
  assert(!tooltip.includes('Kolom kosong'), 'Stored malformed values are not described as empty');
  const html = render(database);
  assert(html.includes('1 kolom wajib perlu diperiksa'));
  assert(html.includes('Pisahkan setiap alamat menjadi entri email tersendiri.'));
  assert(!html.includes('mailto:' + encodeURIComponent(combined)), 'Invalid combined address is not an actionable mailto link');
  assert(html.includes('mailto:alex%40gmail.com'), 'Valid personal email remains actionable');
  assert.equal(JSON.stringify(database), original, 'Completeness checks and detail rendering never mutate saved email data');
}

const malformed = quality.checkDatabaseCompleteness(contact([companyEmail('not-an-email')]));
assert.equal(malformed.fieldMessages['Company Email'], 'Format alamat email tidak valid.');
const wrongDomain = quality.checkDatabaseCompleteness(contact([companyEmail('alex@gmail.com')]));
assert.match(wrongDomain.fieldMessages['Company Email'], /Email pribadi tidak memenuhi Company Email/);
const wrongType = quality.checkDatabaseCompleteness(contact([{ id: 1, email: 'alex@company.example', emailType: 'personal', isCorporate: false }]));
assert.match(wrongType.fieldMessages['Company Email'], /belum ditandai sebagai Company Email/);
assert.equal(wrongType.isIncomplete, true, 'A category diagnostic must not relax corporate rules');

const extraMalformed = contact([companyEmail('alex@company.example'), companyEmail('bad@company.example other@company.example', 2)]);
const extraQuality = quality.checkDatabaseCompleteness(extraMalformed);
assert.equal(extraQuality.isIncomplete, false, 'One valid company email still satisfies the company requirement');
assert.deepEqual(plain(extraQuality.fieldMessages), {});
const extraHtml = render(extraMalformed);
assert(extraHtml.includes('Data wajib kontak sudah lengkap'));
assert(extraHtml.includes('Beberapa alamat tersimpan dalam satu entri email'), 'An invalid extra email stays visible without marking the contact Dirty');

const corrected = contact([companyEmail('alex@company.example'), companyEmail('alex@legacy.example', 2)]);
assert.equal(quality.checkDatabaseCompleteness(corrected).isIncomplete, false);
const correctedHtml = render(corrected);
assert(correctedHtml.includes('mailto:alex%40company.example') && correctedHtml.includes('mailto:alex%40legacy.example'));
assert(!correctedHtml.includes('Beberapa alamat tersimpan'));

const participant = { id: 2, databaseDestination: 'participant', firstName: 'Student', mobilePhone: '081234567890', emails: [companyEmail('invalid@campus.ac.id another@campus.ac.id')] };
assert.equal(quality.checkDatabaseCompleteness(participant).isIncomplete, false, 'Participant phone-only quality rules stay unchanged');
assert(render(participant).includes('Beberapa alamat tersimpan dalam satu entri email'));
assert.equal(quality.getStoredEmailIssue(companyEmail('student@gmail.com'), 'participant'), '', 'Participants are not required to use corporate domains');

async function checkSavedEmailRefresh() {
  const source = fs.readFileSync(path.join(root, 'app/dashboard/database/page.tsx'), 'utf8');
  const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(parsed) === 'onEmailAdded') callback = node.initializer.expression.getText(parsed);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert(callback, 'Manage Emails has a completion callback');
  const saved = [companyEmail('alex@company.example')], calls = [];
  const context = {
    selectedDatabase: { id: 1 },
    crmService: { async getDatabaseEmails(id) { assert.equal(id, 1); return saved; } },
    setDatabaseEmails(emails) { assert.strictEqual(emails, saved); calls.push('email details'); },
    async refreshDatabasePage() { calls.push('database list and counts'); },
  };
  vm.runInNewContext(ts.transpileModule('globalThis.handler = ' + callback, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  await context.handler();
  assert.deepEqual(calls, ['email details', 'database list and counts'], 'Saved emails refresh both details and clean/dirty counts');
}
checkSavedEmailRefresh().then(() => console.log('PASS: company-email diagnostics, real details UI, unchanged quality rules, and saved-email list/count refresh.')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
