// Run: node scripts/check-partial-database-edit.cjs. Real submit handler, anonymous fixtures, no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const project = path.resolve(__dirname, '..');
function compile(file, requireModule) {
  const sandbox = { exports: {}, require: requireModule, console };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(project, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, sandbox, { filename: file });
  return sandbox.exports;
}
const phone = compile('app/dashboard/database/utils/phoneHelper.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : (node.props?.children || []).flat(Infinity).map(text).join('');
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
}

async function mount(database = {}, { branchValid = true, emails = [] } = {}) {
  const hooks = [], effects = [], calls = [], messages = [];
  let cursor = 0, changed = false, tree, closed = 0, updated = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
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
  const company = database.company;
  const service = {
    getDatabaseEmails: async () => emails,
    getCompaniesList: async () => ({ items: company ? [company] : [] }),
    getGroups: async () => company?.group ? [company.group] : [],
  };
  for (const operation of ['createCompany', 'updateCompany', 'updateDatabase', 'addDatabaseEmail', 'updateDatabaseEmail', 'deleteDatabaseEmail']) {
    service[operation] = async (...args) => {
      calls.push({ operation, args });
      return operation === 'createCompany' ? { id: 100 } : {};
    };
  }
  const modules = {
    react: React,
    'lucide-react': {},
    '../../../../lib/services/crmService': { crmService: service },
    sonner: { toast: Object.fromEntries(['error', 'warning', 'success'].map(kind => [kind, message => messages.push({ kind, message })])) },
    '../utils/phoneHelper': phone,
    '../../../../lib/constants': { INDUSTRIES: [], REVENUE_SIZES: [], EMPLOYEE_SIZES: [] },
    './CompanyBranchSelect': { CompanyBranchSelect() {}, useCompanyBranches: () => ({ valid: branchValid }) },
  };
  const { EditDatabaseModal } = compile('app/dashboard/database/components/EditDatabaseModal.tsx', name => {
    assert(name in modules, 'Unexpected component dependency: ' + name);
    return modules[name];
  });
  const props = { isOpen: true, database: { id: 41, ...database }, companies: company ? [company] : [],
    onClose: () => closed++, onUpdated: () => updated++ };
  function render() {
    cursor = 0; changed = false; tree = EditDatabaseModal(props);
    while (effects.length) effects.shift()();
  }
  async function settle() {
    for (let i = 0; i < 12; i++) {
      await new Promise(setImmediate);
      if (!changed) return;
      render();
    }
    throw new Error('Component state did not settle');
  }
  render(); await settle();
  return {
    calls, messages,
    get closed() { return closed; }, get updated() { return updated; },
    find(predicate) { const result = nodes(tree).find(predicate); assert(result, 'Control not found'); return result; },
    async change(placeholder, value) {
      this.find(node => node.type === 'input' && node.props.placeholder === placeholder).props.onChange({ target: { value } });
      render(); await settle();
    },
    async click(label) {
      this.find(node => node.type === 'button' && text(node).includes(label)).props.onClick();
      render(); await settle();
    },
    async clickTitle(title) {
      this.find(node => node.type === 'button' && node.props.title === title).props.onClick();
      render(); await settle();
    },
    async submit() {
      await this.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
      await settle();
    },
  };
}

(async () => {
  const partial = await mount();
  assert.equal(partial.find(node => node.type === 'fieldset').props.disabled, true, 'Company details require a selected or newly created company');
  await partial.change('e.g. John', '  Alex  ');
  await partial.submit();
  assert.deepEqual(partial.calls.map(call => call.operation), ['updateDatabase']);
  const partialCall = partial.calls[0];
  assert.equal(partialCall.args[1].firstName, 'Alex');
  for (const field of ['lastName', 'salutation', 'jobTitle', 'mobilePhone', 'normalizedPhone']) assert.equal(partialCall.args[1][field], '');
  assert.equal(partialCall.args[1].positionLevel, 'unknown');
  assert.equal(partialCall.args[2], undefined, 'Missing company must not prevent a partial contact update');
  assert.equal(partial.updated, 1); assert.equal(partial.closed, 1);
  assert(!partial.messages.some(message => message.kind === 'error'));

  const cleared = await mount({ firstName: 'Alex', jobTitle: 'Manager', mobilePhone: '0812345678' });
  await cleared.change('e.g. Senior Manager IT', '');
  await cleared.change('e.g. 0812345678', '');
  await cleared.submit();
  assert.equal(cleared.calls[0].args[1].jobTitle, '');
  assert.equal(cleared.calls[0].args[1].mobilePhone, '');
  assert.equal(cleared.calls[0].args[1].normalizedPhone, '');

  const multiplePhones = await mount({ firstName: '', databaseDestination: 'participant', mobilePhone: '081200001111, 081300002222' });
  await multiplePhones.change('e.g. John', 'Nama Dilengkapi');
  await multiplePhones.submit();
  assert.equal(multiplePhones.calls[0].args[1].mobilePhone, '+6281200001111, +6281300002222', 'Filling a name must preserve both stored numbers');
  assert.equal(multiplePhones.calls[0].args[1].normalizedPhone, '+6281200001111', 'Only the primary number is used as the normalized lookup');

  const company = { id: 7, name: 'Example Company', group: { id: 2, name: 'Example Group' },
    brandName: 'Example', address: 'Example street', officePhone: '02112345', website: 'example.test',
    industry: 'Technology', companySizeRevenue: 'Small', companySizeEmployee: 'Small', companyHardware: 'Laptop',
    city: 'Example City', postalCode: '12345' };
  const unchanged = await mount({ firstName: 'Alex', company });
  await unchanged.change('e.g. John', 'Alexa');
  await unchanged.submit();
  assert.deepEqual(unchanged.calls.map(call => call.operation), ['updateDatabase'], 'Contact-only edits must not rewrite shared company details');
  assert.equal(unchanged.calls[0].args[2], 7);

  const branch = { id: 11, companyId: company.id, name: 'Example branch' };
  for (const pendingAction of ['clear', 'search']) {
    const pending = await mount({ firstName: 'Alex', company, branch });
    if (pendingAction === 'clear') await pending.clickTitle('Clear selection');
    else await pending.change('Type to search company...', 'Unselected company');
    assert.equal(pending.find(node => node.type === 'fieldset').props.disabled, true);
    await pending.submit();
    assert.equal(pending.calls.length, 0, 'Pending company selection must not erase an existing company or branch');
    assert.equal(pending.updated, 0); assert.equal(pending.closed, 0);
    assert(pending.messages.some(message => message.kind === 'error' && message.message.includes('Pilih perusahaan')));
  }

  const unselected = await mount();
  await unselected.change('Type to search company...', 'Unselected company');
  await unselected.submit();
  assert.equal(unselected.calls.length, 0, 'Typed company names must not be silently discarded');
  assert(unselected.messages.some(message => message.kind === 'error' && message.message.includes('Pilih perusahaan')));

  const changedCompany = await mount({ firstName: 'Alex', company });
  await changedCompany.change('e.g. Toyota', 'New Example');
  await changedCompany.submit();
  assert.deepEqual(changedCompany.calls.map(call => call.operation), ['updateCompany', 'updateDatabase']);
  assert.deepEqual(plain(changedCompany.calls[0].args), [7, { ...company, group: undefined, id: undefined, brandName: 'New Example' }, 2].map(plain));

  const newCompany = await mount();
  await newCompany.click('+ Create New Company');
  assert.equal(newCompany.find(node => node.type === 'fieldset').props.disabled, false);
  await newCompany.submit();
  assert.equal(newCompany.calls.length, 0);
  assert(newCompany.messages.some(message => message.kind === 'error' && message.message.includes('nama perusahaan')));

  const invalidBranch = await mount({ company }, { branchValid: false });
  assert.equal(invalidBranch.find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  await invalidBranch.submit();
  assert.equal(invalidBranch.calls.length, 0);
  assert(invalidBranch.messages.some(message => message.kind === 'error' && message.message.includes('cabang')));
  console.log('Partial database edit checks passed: progressive saves, empty-field clearing, company preservation, explicit company edits and branch/new-company guards. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
