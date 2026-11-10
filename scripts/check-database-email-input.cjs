// Run: node scripts/check-database-email-input.cjs. Actual form handlers and service serialization; no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const unexpected = name => { throw Error('Unexpected dependency: ' + name); };
function compile(file, requireModule) {
  const context = { exports: {}, require: requireModule, console, URLSearchParams };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, context, { filename: file });
  return context.exports;
}
const notes = compile('app/dashboard/events/utils/notesHelper.ts', unexpected);
const category = compile('app/dashboard/database/utils/emailCategory.ts', () => notes);
const input = compile('app/dashboard/database/utils/emailInput.ts', () => category);
const phone = compile('app/dashboard/database/utils/phoneHelper.ts', unexpected);
const plain = value => JSON.parse(JSON.stringify(value));
const children = node => [node?.props?.children].flat(Infinity);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');
const company = { id: 31, name: 'Anonymous Organization' };
const database = { id: 72, databaseDestination: 'company', firstName: 'Anonymous', lastName: 'Test', company, emails: [] };
const emails = [
  { id: 77, email: 'ONE@company.example two@company.example', emailType: 'company', isCorporate: true, isPrimary: true, isVerified: true },
  { id: 78, email: 'untouched@company.example', emailType: 'company', isCorporate: true, isPrimary: false, isVerified: true },
  { id: 79, email: 'private@gmail.com', emailType: 'personal', isCorporate: false, isPrimary: false, isVerified: true },
];

async function mount(name, props = {}, overrides = {}) {
  const hooks = [], effects = [], calls = [], messages = [];
  let cursor = 0, changed = false, tree, refreshed = 0, closed = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], value => {
        const next = typeof value === 'function' ? value(hooks[index]) : value;
        if (!Object.is(next, hooks[index])) { hooks[index] = next; changed = true; }
      }];
    },
    useEffect(effect, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
      hooks[index] = deps;
    },
  };
  const methods = {
    getCompaniesList: async () => ({ items: [company] }), getGroups: async () => [], getDatabaseEmails: async () => emails,
    createDatabase: async () => ({ id: 73 }), updateDatabase: async () => database,
    saveDatabaseEmails: async () => ({ createdCount: 1, updatedCount: 1, existingCount: 0, emails }),
    ...overrides,
  };
  const service = new Proxy({}, { get: (_, key) => async (...args) => {
    calls.push({ name: key, args: plain(args) });
    return (methods[key] || (() => unexpected(key)))(...args);
  } });
  const dependencies = name => {
    if (name === 'react') return React;
    if (name === 'lucide-react') return {};
    if (name === 'sonner') return { toast: Object.fromEntries(['success', 'error', 'warning'].map(kind => [kind, message => messages.push({ kind, message })])) };
    if (name.endsWith('/services/crmService')) return { crmService: service };
    if (name.endsWith('/services/auditLogService')) return { auditLogService: { recordLog() {} } };
    if (name.endsWith('/context/AuthContext')) return { useAuth: () => ({ user: null }) };
    if (name.endsWith('/phoneHelper')) return phone;
    if (name.endsWith('/emailCategory')) return category;
    if (name.endsWith('/emailInput')) return input;
    if (name.endsWith('/constants')) return { INDUSTRIES: [], REVENUE_SIZES: [], EMPLOYEE_SIZES: [] };
    if (name === './CompanyBranchSelect') return { CompanyBranchSelect: () => null, useCompanyBranches: () => ({ valid: true, branches: [] }) };
    return unexpected(name);
  };
  const Component = compile('app/dashboard/database/components/' + name + '.tsx', dependencies)[name];
  const actualProps = { isOpen: true, database, companies: [company], emails, loadingEmails: false,
    onClose() { closed++; }, onEmailAdded() { refreshed++; }, onCreated() { refreshed++; }, onUpdated() { refreshed++; }, ...props };
  function render() { cursor = 0; changed = false; tree = Component(actualProps); while (effects.length) effects.shift()(); }
  async function settle() {
    for (let i = 0; i < 20; i++) { await new Promise(setImmediate); if (!changed) return; render(); }
    throw Error('Email form did not settle');
  }
  const find = predicate => nodes(tree).find(predicate);
  async function change(predicate, value) { const node = find(predicate); assert.ok(node, 'input exists'); node.props.onChange({ target: { value } }); render(); await settle(); }
  async function click(predicate) { const node = find(predicate); assert.ok(node, 'button exists'); node.props.onClick(); render(); await settle(); }
  async function focus(predicate) { const node = find(predicate); assert.ok(node, 'input exists'); node.props.onFocus(); render(); await settle(); }
  async function submit() { await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle(); }
  render(); await settle();
  return { find, change, click, focus, submit, calls, messages, refreshed: () => refreshed, closed: () => closed };
}

async function checkEmailMenu() {
  const source = fs.readFileSync(path.join(root, 'app/dashboard/database/page.tsx'), 'utf8');
  const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback, menu, close;
  const attribute = (attributes, name) => attributes.properties.find(item => item.name?.getText(parsed) === name);
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'handleOpenEmailModal') callback = node.initializer.getText(parsed);
    if (ts.isJsxElement(node) && attribute(node.openingElement.attributes, 'id')?.initializer?.text === 'database-row-actions') menu = node.getText(parsed);
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(parsed) === 'EmailModal') close = attribute(node.attributes, 'onClose').initializer.expression.getText(parsed);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert(callback && menu && close, 'Actual row action, opener, and close handler must exist');
  const calls = [], errors = [], context = { exports: {}, React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    c: { ...database, isActive: true }, isAdmin: true, isManager: false, isUser: false,
    emailRequest: { current: 0 }, dropdownMenuRef: { current: null }, dropdownPos: { top: 1, left: 1 },
    hasConfirmedFlag: false, flaggingDatabaseId: null,
    Edit2: 'svg', Mail: 'svg', ShieldAlert: 'svg', Loader2: 'svg', UserX: 'svg', Trash2: 'svg',
    setActiveDropdownId(value) { context.activeDropdownId = value; }, setDropdownPos(value) { context.dropdownPos = value; },
    setSelectedDatabase(value) { context.selectedDatabase = value; }, setIsEmailModalOpen(value) { context.isEmailModalOpen = value; },
    setDatabaseEmails(value) { context.databaseEmails = value; }, setLoadingEmails(value) { context.loadingEmails = value; },
    crmService: { async getDatabaseEmails(id) { calls.push(id); return emails; } }, toast: { error(message) { errors.push(message); } },
  };
  vm.runInNewContext(ts.transpileModule(`const handleOpenEmailModal = ${callback}; exports.open = handleOpenEmailModal; exports.render = () => (${menu}); exports.close = ${close};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, context);
  const manage = () => nodes(context.exports.render()).find(node => node.type === 'button' && text(node).trim() === 'Kelola Email');
  for (const role of ['ADMIN', 'MANAGER']) {
    context.isAdmin = role === 'ADMIN'; context.isManager = role === 'MANAGER'; context.isUser = false;
    context.dropdownPos = { top: 1, left: 1 };
    const button = manage(); assert(button, role + ' has a reachable manage-email action');
    button.props.onClick(); await new Promise(setImmediate);
    assert.equal(context.activeDropdownId, null); assert.equal(context.dropdownPos, null);
    assert.equal(context.selectedDatabase.id, 72); assert.equal(context.isEmailModalOpen, true);
    assert.strictEqual(context.databaseEmails, emails); assert.equal(context.loadingEmails, false);
    context.exports.close(); assert.equal(context.isEmailModalOpen, false); assert.equal(context.databaseEmails.length, 0);
  }
  for (const isUser of [true, false]) {
    context.isAdmin = false; context.isManager = false; context.isUser = isUser; context.dropdownPos = { top: 1, left: 1 };
    assert.equal(manage(), undefined, 'Readonly/unknown role cannot manage email');
    const before = calls.length; await context.exports.open(database); assert.equal(calls.length, before);
  }
  context.isAdmin = true; context.isUser = false;
  let release;
  context.crmService.getDatabaseEmails = id => id === 72 ? new Promise(resolve => { release = resolve; }) : Promise.resolve([{ id: 99, email: 'other@company.example' }]);
  const first = context.exports.open(database);
  await context.exports.open({ ...database, id: 99 });
  release(emails); await first;
  assert.equal(context.selectedDatabase.id, 99); assert.equal(context.databaseEmails[0].id, 99, 'Late response cannot replace the newer contact emails');
  const closing = context.exports.open(database); context.exports.close(); release(emails); await closing;
  assert.equal(context.isEmailModalOpen, false); assert.equal(context.databaseEmails.length, 0, 'Closing invalidates the in-flight email request');
  context.crmService.getDatabaseEmails = async () => { throw Error('Local fixture failure'); };
  await context.exports.open(database);
  assert.equal(context.databaseEmails.length, 0); assert.equal(context.loadingEmails, false);
  assert.equal(errors.length, 1, 'Fetch failure reports an error without showing another contact emails');
}

(async () => {
  assert.deepEqual(plain(input.splitContactEmails(' ONE@company.example; two@company.example\n one@company.example ')), ['one@company.example', 'two@company.example']);
  assert.deepEqual(plain(input.splitContactEmails('one@company.example/two@company.example')), ['one@company.example', 'two@company.example']);
  const entries = input.prepareContactEmailEntries('one@company.example two@company.example', { id: 77, emailType: 'company', isPrimary: true }, 'company');
  assert.equal(entries[0].id, 77); assert.equal(entries[1].id, undefined);
  assert.equal(entries[0].isPrimary, true); assert.equal(entries[1].isPrimary, false);
  assert.throws(() => input.prepareContactEmailEntries('one@company.example, broken', { emailType: 'company' }, 'company'), /Format email tidak valid/);
  assert.throws(() => input.prepareContactEmailEntries('one@company.example, person@gmail.com', { emailType: 'company' }, 'company'), /domain perusahaan/);

  let modal = await mount('EmailModal');
  await modal.change(node => node.props.id === 'database-email-addresses', 'ONE@company.example;two@company.example one@company.example');
  await modal.submit();
  assert.equal(modal.calls.length, 1);
  assert.equal(modal.calls[0].name, 'saveDatabaseEmails');
  assert.deepEqual(modal.calls[0].args[1].map(row => row.email), ['one@company.example', 'two@company.example']);
  assert.equal(modal.refreshed(), 1);
  modal = await mount('EmailModal');
  await modal.change(node => node.props.id === 'database-email-addresses', 'one@company.example broken');
  await modal.submit(); assert.equal(modal.calls.length, 0); assert.equal(modal.refreshed(), 0);
  assert.match(modal.messages.at(-1).message, /Format email tidak valid/);
  modal = await mount('EmailModal', {}, { saveDatabaseEmails: async () => { throw Error('Alamat dipakai profil lain'); } });
  await modal.change(node => node.props.id === 'database-email-addresses', 'one@company.example two@company.example');
  await modal.submit();
  assert.equal(modal.refreshed(), 0); assert.equal(modal.closed(), 0);
  assert.equal(modal.find(node => node.props.id === 'database-email-addresses').props.value, 'one@company.example two@company.example');
  assert.equal(modal.messages.at(-1).kind, 'error');
  modal = await mount('EmailModal');
  await modal.click(node => node.props['aria-label'] === 'Edit email ' + emails[0].email);
  await modal.submit();
  assert.equal(modal.calls[0].args[1][0].id, 77);
  assert.equal(modal.calls[0].args[1][1].id, undefined);
  assert.ok(modal.calls[0].args[1].every(row => row.id !== 78 && row.id !== 79 && !('isVerified' in row)));
  modal = await mount('EmailModal', { database: { ...database, databaseDestination: 'participant' } });
  await modal.change(node => node.props.id === 'database-email-addresses', 'student@campus.example person@gmail.com');
  await modal.submit();
  assert.ok(modal.calls[0].args[1].every(row => row.emailType === 'personal' && row.isCorporate === false));

  let create = await mount('CreateDatabaseModal', { initialDestination: 'participant' });
  await create.change(node => node.props.id === 'create-database-personal-email', 'student@campus.example;person@gmail.com student@campus.example');
  await create.submit();
  let writes = create.calls.filter(call => !call.name.startsWith('get'));
  assert.deepEqual(writes.map(call => call.name), ['createDatabase']);
  assert.deepEqual(writes[0].args[0].emails.map(row => row.email), ['student@campus.example', 'person@gmail.com']);
  assert.equal(writes[0].args[0].emails[0].isPrimary, true); assert.equal(writes[0].args[0].emails[1].isPrimary, false);
  create = await mount('CreateDatabaseModal', { initialDestination: 'participant' });
  await create.change(node => node.props.id === 'create-database-personal-email', 'person@gmail.com invalid');
  await create.submit(); assert.equal(create.calls.filter(call => !call.name.startsWith('get')).length, 0);
  create = await mount('CreateDatabaseModal', { initialDestination: 'participant' });
  await create.change(node => node.props.id === 'create-database-personal-email', 'invalid/person@gmail.com');
  await create.submit(); assert.equal(create.calls.filter(call => !call.name.startsWith('get')).length, 0);
  create = await mount('CreateDatabaseModal');
  for (const [placeholder, value] of [['e.g. John','Anonymous'],['e.g. Doe','Test'],['e.g. Senior Manager IT','Engineer'],['e.g. 0812345678','081234567890']]) {
    await create.change(node => node.props.placeholder === placeholder, value);
  }
  await create.change(node => node.type === 'select' && children(node).some(option => option?.props?.value === 'Mr'), 'Mr');
  await create.focus(node => node.props.placeholder === 'Type to search company...');
  await create.click(node => node.type === 'button' && text(node) === company.name);
  await create.change(node => node.props.id === 'create-database-company-email', 'ONE@company.example two@company.example');
  await create.change(node => node.props.id === 'create-database-personal-email', 'person@gmail.com');
  await create.submit(); writes = create.calls.filter(call => !call.name.startsWith('get'));
  assert.deepEqual(writes.map(call => call.name), ['createDatabase']);
  assert.equal(writes[0].args[0].emails.length, 3);
  assert.ok(writes[0].args[0].emails.slice(0,2).every(row => row.emailType === 'company' && row.isCorporate));
  assert.equal(writes[0].args[0].emails.filter(row => row.isPrimary).length, 1);

  let edit = await mount('EditDatabaseModal');
  await edit.submit(); writes = edit.calls.filter(call => !call.name.startsWith('get'));
  assert.deepEqual(writes.map(call => call.name), ['updateDatabase','saveDatabaseEmails']);
  assert.equal(writes[1].args[1].length, 3);
  assert.equal(writes[1].args[1][0].id, 77); assert.equal(writes[1].args[1][1].id, undefined); assert.equal(writes[1].args[1][2].id, 79);
  assert.ok(writes[1].args[1].every(row => row.id !== 78 && !('isPrimary' in row) && !('isVerified' in row)));
  edit = await mount('EditDatabaseModal');
  await edit.change(node => node.props.id === 'edit-database-company-email', 'good@company.example invalid');
  await edit.submit(); assert.equal(edit.calls.filter(call => !call.name.startsWith('get')).length, 0);
  edit = await mount('EditDatabaseModal');
  await edit.change(node => node.props.id === 'edit-database-company-email', 'invalid/good@company.example');
  await edit.submit(); assert.equal(edit.calls.filter(call => !call.name.startsWith('get')).length, 0);
  edit = await mount('EditDatabaseModal');
  await edit.change(node => node.props.id === 'edit-database-company-email', '');
  await edit.change(node => node.props.id === 'edit-database-personal-email', '');
  await edit.submit();
  assert.deepEqual(edit.calls.filter(call => !call.name.startsWith('get')).map(call => call.name), ['updateDatabase']);

  const calls = [];
  class ApiService { async post(...args) { calls.push(args); return { createdCount: 2 }; } }
  const { CrmService } = compile('lib/services/crmService.ts', name => name === './apiService' ? { ApiService } : unexpected(name));
  await new CrmService().saveDatabaseEmails(72, entries);
  assert.equal(calls[0][0], '/api/databases/72/emails/batch');
  assert.deepEqual(plain(calls[0][1]), { emails: plain(entries) });
  await checkEmailMenu();
  console.log('PASS: multiemail forms/service, validation before writes, scoped IDs/flags, Participant rules, reachable role-scoped row menu, and stale-request guards.');
})().catch(error => { console.error(error); process.exitCode = 1; });
