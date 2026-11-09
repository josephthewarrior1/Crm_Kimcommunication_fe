// Run: node scripts/check-personal-database-create.cjs. Actual create handler, anonymous fixtures, no network.
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
const notes = compile('app/dashboard/events/utils/notesHelper.ts');
const category = compile('app/dashboard/database/utils/emailCategory.ts', name => {
  assert.equal(name, '../../events/utils/notesHelper');
  return notes;
});
const plain = value => JSON.parse(JSON.stringify(value));
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : (node.props?.children || []).flat(Infinity).map(text).join('');
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
}

async function mount({ branchValid = true, emailFailure = false, initialDestination = 'company' } = {}) {
  const hooks = [], effects = [], calls = [], messages = [];
  let cursor = 0, changed = false, tree, closed = 0, created = 0;
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
  const company = { id: 7, name: 'Example Company' };
  const service = { getCompaniesList: async () => ({ items: [company] }) };
  for (const operation of ['createCompany', 'createDatabase', 'addDatabaseEmail']) {
    service[operation] = async (...args) => {
      calls.push({ operation, args });
      if (operation === 'createDatabase' && args[0].databaseDestination === 'participant' && emailFailure) throw new Error('Email save failed in fixture');
      if (operation === 'addDatabaseEmail' && emailFailure) throw new Error('Email save failed in fixture');
      return { id: operation === 'createCompany' ? 100 : 41 };
    };
  }
  const modules = {
    react: React,
    'lucide-react': {},
    '../../../../lib/services/crmService': { crmService: service },
    '../../../../lib/services/auditLogService': { auditLogService: { recordLog() {} } },
    '../../../../lib/context/AuthContext': { useAuth: () => ({ user: null }) },
    sonner: { toast: Object.fromEntries(['error', 'warning', 'success'].map(kind => [kind, message => messages.push({ kind, message })])) },
    '../utils/phoneHelper': phone,
    '../utils/emailCategory': category,
    './CompanyBranchSelect': { CompanyBranchSelect() {}, useCompanyBranches: () => ({ valid: branchValid }) },
  };
  const { CreateDatabaseModal } = compile('app/dashboard/database/components/CreateDatabaseModal.tsx', name => {
    assert(name in modules, 'Unexpected component dependency: ' + name);
    return modules[name];
  });
  const props = { initialDestination, isOpen: true, companies: [company], onClose: () => closed++, onCreated: () => created++ };
  function render() {
    cursor = 0; changed = false; tree = CreateDatabaseModal(props);
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
    get closed() { return closed; }, get created() { return created; },
    find(predicate) { const result = nodes(tree).find(predicate); assert(result, 'Control not found'); return result; },
    label(label) { const node = nodes(tree).find(node => node.type === 'label' && text(node).trim().startsWith(label)); assert(node, 'Label not found: ' + label); return node; },
    async change(placeholder, value) {
      this.find(node => node.type === 'input' && node.props.placeholder === placeholder).props.onChange({ target: { value } });
      render(); await settle();
    },
    async salutation(value) {
      this.find(node => node.type === 'select' && nodes(node).some(child => child.type === 'option' && child.props.value === 'Mr')).props.onChange({ target: { value } });
      render(); await settle();
    },
    async select(label, value) {
      this.find(node => node.type === 'select' && node.props['aria-label'] === label).props.onChange({ target: { value } });
      render(); await settle();
    },
    async click(label) {
      this.find(node => node.type === 'button' && text(node).includes(label)).props.onClick();
      render(); await settle();
    },
    async submit() {
      await this.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
      await settle();
    },
  };
}

(async () => {
  const legacyDefault = await mount();
  await legacyDefault.change('e.g. John', 'Alex');
  await legacyDefault.change('e.g. name@gmail.com', 'alex@gmail.com');
  assert.equal(legacyDefault.find(node => node.type === 'select' && node.props['aria-label'] === 'Tujuan database').props.value, 'company');
  await legacyDefault.submit();
  assert.equal(legacyDefault.calls.length, 0, 'Gmail must not automatically choose the participant database');

  for (const address of ['alex@gmail.com', 'alex@yahoo.com', 'alex@outlook.com', 'alex@campus.ac.id', 'alex@employer.example']) {
    const personal = await mount();
    await personal.select('Tujuan database', 'participant');
    await personal.change('e.g. John', '  Alex  ');
    await personal.change('e.g. name@gmail.com', address);
    await personal.change('Nama sekolah, kampus, atau instansi (opsional)', '  Example Campus  ');
    await personal.select('Kategori peserta', 'mahasiswa');
    for (const label of ['Salutation', 'Last Name', 'Job Title', 'Mobile Phone', 'Email tambahan', 'Position Level']) {
      assert(!text(personal.label(label)).includes('*'), label + ' must be optional for personal-only contacts');
    }
    assert(!text(personal.label('First Name')).includes('*'), 'Participant name may be filled later');
    assert(text(personal.label('Email Peserta')).includes('*'));
    await personal.submit();
    assert.deepEqual(personal.calls.map(call => call.operation), ['createDatabase'], 'Participant profile and email must be saved in one request');
    const saved = personal.calls[0];
    assert.equal(saved.args[0].firstName, 'Alex');
    assert.equal(saved.args[0].databaseDestination, 'participant');
    assert.equal(saved.args[0].institutionName, 'Example Campus');
    assert.equal(saved.args[0].participantCategory, 'mahasiswa');
    assert.equal(saved.args[0].lastName, '');
    assert.equal(saved.args[0].salutation, '', 'An unselected optional salutation must not fabricate Mr');
    assert.equal(saved.args[0].jobTitle, undefined);
    assert.equal(saved.args[0].mobilePhone, undefined);
    assert.equal(saved.args[0].positionLevel, 'unknown');
    assert.equal(saved.args[1], undefined, 'Personal contact must not need a company');
    assert.deepEqual(plain(saved.args[0].emails), [{ email: address, emailType: 'personal', isPrimary: true, isVerified: true, isCorporate: false }]);
    assert.equal(personal.created, 1); assert.equal(personal.closed, 1);
    assert(!personal.messages.some(message => message.kind === 'error'));
  }

  const publicCompanyField = await mount();
  await publicCompanyField.select('Tujuan database', 'participant');
  await publicCompanyField.change('e.g. John', 'Alex');
  await publicCompanyField.change('e.g. name@company.com', 'alex@gmail.com');
  await publicCompanyField.submit();
  assert.equal(publicCompanyField.created, 1, 'Explicit participant destination accepts public email in either legacy email field');
  assert.equal(publicCompanyField.calls[0].args[0].databaseDestination, 'participant');

  const dualParticipant = await mount({ initialDestination: 'participant' });
  await dualParticipant.change('e.g. John', 'Participant');
  await dualParticipant.change('e.g. name@company.com', 'person@employer.example');
  await dualParticipant.change('e.g. name@gmail.com', 'person@gmail.com');
  await dualParticipant.submit();
  assert.equal(dualParticipant.created, 1);
  assert.deepEqual(dualParticipant.calls.map(call => call.operation), ['createDatabase']);
  assert.deepEqual(plain(dualParticipant.calls[0].args[0].emails).map(email => [email.email, email.emailType, email.isCorporate]),
    [['person@gmail.com', 'personal', false], ['person@employer.example', 'personal', false]]);
  assert.equal(dualParticipant.calls[0].args[0].databaseDestination, 'participant', 'Adding a company email must not reroute an explicit participant');

  for (const contact of [
    ['e.g. name@gmail.com', 'unnamed@campus.ac.id'],
    ['e.g. 0812345678', '081200001111, 081300002222'],
  ]) {
    const unnamed = await mount({ initialDestination: 'participant' });
    await unnamed.change(...contact); await unnamed.submit();
    assert.equal(unnamed.created, 1, 'Names may be filled later when a valid contact is present');
    assert.equal(unnamed.calls[0].args[0].firstName, '');
    if (contact[0].includes('0812')) {
      assert.equal(unnamed.calls[0].args[0].mobilePhone, '+6281200001111, +6281300002222');
      assert.equal(unnamed.calls[0].args[0].normalizedPhone, '+6281200001111');
      assert.equal(unnamed.calls[0].args[0].emails.length, 0);
    }
  }
  const noContact = await mount({ initialDestination: 'participant' });
  await noContact.change('e.g. John', 'Alex'); await noContact.submit();
  assert.equal(noContact.calls.length, 0, 'A name alone cannot create a participant');
  const badPhone = await mount({ initialDestination: 'participant' });
  await badPhone.change('e.g. name@gmail.com', 'valid@example.org');
  await badPhone.change('e.g. 0812345678', '081200001111, call 081300002222');
  await badPhone.submit(); assert.equal(badPhone.calls.length, 0, 'Invalid second numbers cannot be discarded');

  for (const inputs of [
    [['e.g. name@gmail.com', 'alex.gmail.com']],
    [['e.g. name@gmail.com', 'alex@gmail.com'], ['e.g. name@company.com', 'invalid-company-email']],
  ]) {
    const invalid = await mount({ initialDestination: 'participant' });
    await invalid.change('e.g. John', 'Alex');
    for (const [placeholder, value] of inputs) await invalid.change(placeholder, value);
    await invalid.submit();
    assert.equal(invalid.calls.length, 0);
    assert(invalid.messages.some(message => message.kind === 'error' && message.message.includes('format email')));
  }

  const corporate = await mount();
  await corporate.change('e.g. John', 'Alex');
  await corporate.change('e.g. name@company.com', 'alex@example.test');
  await corporate.change('e.g. name@gmail.com', 'alex@gmail.com');
  assert(text(corporate.label('Associated Company')).includes('*'), 'Dual-address contacts follow the corporate profile');
  await corporate.submit();
  assert.equal(corporate.calls.length, 0, 'Corporate mandatory fields remain required');
  await corporate.change('e.g. Doe', 'Example');
  await corporate.change('e.g. Senior Manager IT', 'Officer');
  await corporate.change('e.g. 0812345678', '0812345678');
  await corporate.change('Type to search company...', 'Example');
  await corporate.click('Example Company');
  await corporate.submit();
  assert.equal(corporate.calls.length, 0, 'Corporate contacts still require an explicitly selected salutation');
  await corporate.salutation('Mr');
  await corporate.submit();
  assert.deepEqual(corporate.calls.map(call => call.operation), ['createDatabase', 'addDatabaseEmail', 'addDatabaseEmail']);
  assert.equal(corporate.calls[0].args[1], 7);
  assert.equal(corporate.calls[0].args[0].positionLevel, 'unknown', 'Unknown is accepted as before');
  assert.equal(corporate.calls[0].args[0].salutation, 'Mr');
  assert.equal(corporate.calls[0].args[0].databaseDestination, 'company');
  assert.equal(corporate.created, 1);

  const companyGmail = await mount();
  await companyGmail.change('e.g. John', 'Alex');
  await companyGmail.change('e.g. name@company.com', 'alex@gmail.com');
  await companyGmail.submit();
  assert.equal(companyGmail.calls.length, 0);
  assert(companyGmail.messages.some(message => message.kind === 'error' && message.message.includes('Email pribadi masuk melalui Database Peserta')));

  const separateParticipant = await mount({ initialDestination: 'participant', branchValid: false });
  await separateParticipant.change('e.g. John', 'Alex');
  await separateParticipant.change('e.g. name@gmail.com', 'alex@gmail.com');
  await separateParticipant.submit();
  assert.deepEqual(separateParticipant.calls.map(call => call.operation), ['createDatabase'], 'Participant create never creates or updates Company masters');
  assert.equal(separateParticipant.calls[0].args[1], undefined);
  assert.equal(separateParticipant.calls[0].args[2], null);

  const failedEmail = await mount({ initialDestination: 'participant', emailFailure: true });
  await failedEmail.change('e.g. John', 'Alex');
  await failedEmail.change('e.g. name@gmail.com', 'alex@gmail.com');
  await failedEmail.submit();
  assert.deepEqual(failedEmail.calls.map(call => call.operation), ['createDatabase']);
  assert.equal(failedEmail.created, 0);
  assert.equal(failedEmail.closed, 0);
  assert(failedEmail.messages.some(message => message.kind === 'error' && message.message.includes('Email save failed')));
  assert(!failedEmail.messages.some(message => message.kind === 'success'), 'Failed atomic save must not show success or close the form');
  console.log('Database destination create checks passed: explicit choice, campus/company participant email, metadata, company requirements, invalid input and guards. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
