// Run: node scripts/check-event-contact-edit.cjs. Real editor handlers, synthetic fixtures, no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : (node.props?.children || []).flat(Infinity).map(text).join('');
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
function compile(file, requireModule) {
  const scope = { exports: {}, require: requireModule, console, Error };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, scope, { filename: file });
  return scope.exports;
}
const phone = compile('app/dashboard/database/utils/phoneHelper.ts');
const notes = compile('app/dashboard/events/utils/notesHelper.ts');
const category = compile('app/dashboard/database/utils/emailCategory.ts', name => { assert.equal(name, '../../events/utils/notesHelper'); return notes; });
const emailInput = compile('app/dashboard/database/utils/emailInput.ts', name => { assert.equal(name, './emailCategory'); return category; });
const organization = compile('lib/utils/companyBranch.ts');
async function mount(database, { emails = [], failLoad = false, failSave = false } = {}) {
  const hooks = [], calls = [], notices = [], saved = [], busy = [], editing = [];
  let cursor = 0, changed = false, tree;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; changed = true; }];
    },
  };
  const service = {
    async getDatabaseEmails(id) { calls.push({ operation: 'getDatabaseEmails', id }); if (failLoad) throw Error('load failed'); return emails; },
    async updateDatabaseContact(id, payload) { calls.push({ operation: 'updateDatabaseContact', id, payload }); if (failSave) throw Error('Server rejected contact'); return { ...database, ...payload, emails }; },
  };
  const dependencies = {
    react: React, 'lucide-react': {}, sonner: { toast: { success: message => notices.push(message) } },
    '../../../../lib/services/crmService': { crmService: service },
    '../../../../lib/utils/companyBranch': organization,
    '../../database/utils/emailInput': emailInput, '../../database/utils/phoneHelper': phone,
  };
  const { EventContactEditor } = compile('app/dashboard/events/components/EventContactEditor.tsx', name => {
    assert(name in dependencies, 'Unexpected editor dependency: ' + name); return dependencies[name];
  });
  const render = () => { cursor = 0; changed = false; tree = EventContactEditor({ database, onSaved: value => saved.push(value), onSavingChange: value => busy.push(value), onEditingChange: value => editing.push(value) }); };
  const settle = async () => { for (let i = 0; i < 15; i++) { await new Promise(setImmediate); if (!changed) return; render(); } throw Error('Editor did not settle'); };
  const find = predicate => { const found = nodes(tree).find(predicate); assert(found, 'Editor control not found'); return found; };
  render();
  return { calls, notices, saved, busy, editing, get content() { return text(tree); },
    has: predicate => nodes(tree).some(predicate),
    async click(label) { await find(node => node.type === 'button' && text(node).includes(label)).props.onClick(); await settle(); },
    async field(label, value) {
      const input = find(node => node.type === 'input' && node.props['aria-label'] === label
        || node.type === 'label' && text(node).startsWith(label));
      (input.type === 'input' ? input : nodes(input).find(node => node.type === 'input')).props.onChange({ target: { value } }); await settle();
    },
    async submit() { await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle(); },
  };
}

(async () => {
  const database = { id: 41, databaseDestination: 'company', firstName: '', lastName: '', company: { id: 7, name: 'Synthetic Company' }, mobilePhone: '' };
  const stored = [{ id: 91, email: 'first@example.invalid', emailType: 'company', isPrimary: true }, { id: 92, email: 'untouched@example.invalid', emailType: 'company', isPrimary: false }];
  const editor = await mount(database, { emails: stored });
  assert.deepEqual(editor.calls, [], 'Closed editor must not fetch emails or save data');
  await editor.click('Edit data kontak');
  assert(editor.content.includes('event lain yang memakai profil ini'), 'Shared profile impact is explained before saving');
  assert(editor.content.includes('Synthetic Company'));
  await editor.field('HP / WhatsApp', '081200001111, 081300002222');
  await editor.field('Email 1', 'updated@example.invalid');
  await editor.click('Tambah email');
  await editor.field('Email 3', 'additional@gmail.com');
  await editor.submit();
  assert.equal(editor.saved.length, 1); assert.equal(editor.notices.length, 1);
  const call = editor.calls.find(call => call.operation === 'updateDatabaseContact');
  assert.equal(call.id, database.id);
  assert.equal(call.payload.mobilePhone, '081200001111, 081300002222', 'Two raw numbers remain separate for authoritative server validation');
  assert.equal(call.payload.firstName, undefined, 'An unchanged incomplete name is not rewritten during phone/email edits');
  assert.deepEqual(plain(call.payload.emails.map(row => ({ id: row.id, email: row.email }))), [
    { id: 91, email: 'updated@example.invalid' }, { email: 'additional@gmail.com' },
  ], 'Only changed/new email rows are sent; omitted existing addresses are retained');
  for (const key of ['company', 'companyId', 'branch', 'branchId', 'databaseDestination', 'isActive', 'confirmationStatus', 'preEventApprovalStatus', 'notes']) assert(!(key in call.payload), 'Contact editor must not submit ' + key);
  assert.deepEqual(editor.busy, [true, false]);
  assert.deepEqual(editor.editing, [true, false], 'Opening and saving the contact editor updates the surrounding modal mode');
  assert(!editor.has(node => node.type === 'form'), 'Successful save closes only the contact editor');
  assert.equal(stored[0].email, 'first@example.invalid', 'Draft edits do not mutate fetched email rows');

  for (const [label, value, message] of [['Email 1', 'invalid-address', 'Format email'], ['Email 1', '', 'tidak boleh dikosongkan']]) {
    const invalid = await mount(database, { emails: stored });
    await invalid.click('Edit data kontak'); await invalid.field(label, value); await invalid.submit();
    assert(!invalid.calls.some(call => call.operation === 'updateDatabaseContact'), message + ' prevents network mutation');
    assert(invalid.content.includes(message)); assert.equal(invalid.saved.length, 0);
    assert(invalid.has(node => node.type === 'form'), 'Rejected input stays open for correction');
    assert.deepEqual(invalid.editing, [true], 'Validation errors keep the surrounding modal in contact-edit mode');
  }
  const participant = await mount({ ...database, databaseDestination: 'participant', institutionName: 'Synthetic Campus' }, { emails: [] });
  await participant.click('Edit data kontak'); await participant.click('Tambah email');
  await participant.field('Email 1', 'student@campus.ac.id'); await participant.submit();
  assert(participant.content.includes('Data kontak'));
  assert.equal(participant.calls.find(call => call.operation === 'updateDatabaseContact').payload.emails[0].email, 'student@campus.ac.id');

  const failed = await mount(database, { emails: stored, failSave: true });
  await failed.click('Edit data kontak'); await failed.field('HP / WhatsApp', '081234567890, invalid'); await failed.submit();
  assert.equal(failed.calls.find(call => call.operation === 'updateDatabaseContact').payload.mobilePhone, '081234567890, invalid', 'Invalid second phone must reach server validation without being silently stripped');
  assert.equal(failed.saved.length, 0); assert.equal(failed.notices.length, 0); assert(failed.content.includes('Server rejected contact'));
  assert(failed.has(node => node.type === 'form')); assert.deepEqual(failed.busy, [true, false]);
  assert.deepEqual(failed.editing, [true], 'Server errors keep the editor open for correction');
  const loadFailed = await mount(database, { failLoad: true }); await loadFailed.click('Edit data kontak');
  assert(!loadFailed.has(node => node.type === 'form')); assert(loadFailed.content.includes('belum berhasil dimuat'));
  assert.deepEqual(loadFailed.editing, [], 'Failed email loading must not enter contact-edit mode');
  const cancelled = await mount(database, { emails: stored }); await cancelled.click('Edit data kontak');
  await cancelled.field('First Name', 'Unsaved contact'); await cancelled.click('Batal edit kontak');
  assert.deepEqual(cancelled.editing, [true, false]); assert.equal(cancelled.saved.length, 0);
  assert(!cancelled.calls.some(call => call.operation === 'updateDatabaseContact'), 'Cancelling a draft makes no contact write');
  console.log('Event contact editor checks passed: progressive contact edits, two phones, full email rows, validation, company/status omission and failures. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
