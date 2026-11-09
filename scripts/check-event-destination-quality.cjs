// Real Event-page callback and shared quality rules; no network or stored data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function evaluate(source, dependencies = {}, globals = {}) {
  const context = { exports: {}, ...globals, require: name => {
    assert(name in dependencies, 'Unexpected dependency: ' + name); return dependencies[name];
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
  } }).outputText, context);
  return context.exports;
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const notes = evaluate(read('app/dashboard/events/utils/notesHelper.ts'));
const category = evaluate(read('app/dashboard/database/utils/emailCategory.ts'), { '../../events/utils/notesHelper': notes });
const office = evaluate(read('lib/utils/companyBranch.ts'));
const quality = evaluate(read('app/dashboard/database/utils/validationHelper.ts'), {
  './emailCategory': category, '../../../../lib/utils/companyBranch': office,
});
const page = read('app/dashboard/events/page.tsx');
const declaration = page.match(/const checkEventDatabaseCompleteness = [\s\S]*?;/)?.[0];
assert(declaration, 'Event page must scope its quality callback');
assert.equal((page.match(/checkDatabaseCompleteness=\{checkEventDatabaseCompleteness\}/g) || []).length, 3,
  'Request, Reminder and Dday must all use the Event-scoped callback');
for (const destination of ['participant', 'company']) {
  const { check } = evaluate(declaration + '\nexports.check = checkEventDatabaseCompleteness;', {}, {
    selectedEvent: { syncDestination: destination }, checkDatabaseCompleteness: quality.checkDatabaseCompleteness,
  });
  for (const contact of [
    { databaseDestination: 'both', firstName: 'Student', mobilePhone: '081200001111, 081300002222', emails: [] },
    { databaseDestination: 'both', firstName: 'Student', emails: [{ email: 'student@gmail.com' }] },
    { databaseDestination: 'both', lastName: 'Student', emails: [{ email: 'student@campus.ac.id' }] },
  ]) assert.equal(check(contact).isIncomplete, destination === 'company', 'BOTH membership quality must follow the Event type');
  assert.equal(check({ databaseDestination: 'both', emails: [{ email: 'unnamed@gmail.com' }] }).isIncomplete, true,
    'Missing names remain a quality warning in either view');
}
for (const file of ['RequestPreEventTable.tsx', 'ReminderTable.tsx', 'ReminderDdayTable.tsx']) {
  const source = read('app/dashboard/events/components/' + file);
  assert(source.includes('checkDatabaseCompleteness(p.database).isIncomplete'));
  assert(!source.includes('Semua kolom wajib diisi kecuali'), 'Student warnings must not state corporate-only requirements');
}
console.log('Event quality checks passed: BOTH phone/email-only contacts are clean in Participant events, Dirty in Company events; all three tables use the scoped callback.');
