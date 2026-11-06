// Run: node scripts/check-event-import-incomplete.cjs. Actual Event modal handlers/services; anonymous data, no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const unexpected = name => { throw Error('Unexpected dependency: ' + name); };
function compile(file, requireModule, globals = {}) {
  const context = { exports: {}, require: requireModule, console, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, context, { filename: file });
  return context.exports;
}
const children = node => [node?.props?.children].flat(Infinity);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');
const file = new File(['anonymous fixture'], 'uji-event.xlsx');
async function mount(rows, deferPreview = false) {
  const hooks = [], effects = [], calls = [], messages = [];
  let cursor = 0, changed = false, tree, applied = 0, closed = 0, releasePreview;
  const gate = deferPreview ? new Promise(resolve => { releasePreview = resolve; }) : Promise.resolve();
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
    useMemo(factory) { cursor++; return factory(); },
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
  };
  const service = { async validateEventParticipantsImport(...args) { calls.push(args); await gate; return { summary: { totalRows: rows.length }, rows }; } };
  const dependencies = { react: React, 'lucide-react': {}, '../../../../lib/services/crmService': { crmService: service },
    sonner: { toast: Object.fromEntries(['success', 'warning', 'error'].map(kind => [kind, message => messages.push({ kind, message })])) } };
  const { ExcelImportModal } = compile('app/dashboard/events/components/ExcelImportModal.tsx', name => dependencies[name] || unexpected(name), {
    setInterval: () => 0, clearInterval() {}, setTimeout: callback => queueMicrotask(callback),
  });
  const props = { isOpen: true, eventId: 17, activeTab: 'request', importParticipantsFile: null,
    setImportParticipantsFile(value) { props.importParticipantsFile = value; }, isImportingParticipants: false, importParticipantsProgress: 0,
    onClose() { closed++; }, onImport() { applied++; }, onDownloadTemplate() {} };
  function render() { cursor = 0; changed = false; tree = ExcelImportModal(props); while (effects.length) effects.shift()(); }
  async function settle() {
    for (let i = 0; i < 10; i++) { await new Promise(setImmediate); if (!changed) return; render(); }
    throw Error('Modal did not settle');
  }
  render(); await settle(); props.importParticipantsFile = file; render(); await settle();
  return {
    calls, messages, content: () => text(tree), applied: () => applied, closed: () => closed,
    button: label => nodes(tree).find(node => node.type === 'button' && text(node).includes(label)),
    closeButton: () => nodes(tree).find(node => node.props?.['aria-label'] === 'Tutup import peserta'),
    async preview() { await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle(); },
    async beginPreview() {
      const work = nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle();
      return async () => { releasePreview(); await work; await settle(); };
    },
    async search(value) {
      nodes(tree).find(node => node.props?.['aria-label'] === 'Cari baris preview import event').props.onChange({ target: { value } });
      render(); await settle();
    },
  };
}
const row = extra => ({ rowNumber: 2, status: 'valid', firstName: 'Uji Kontak', issues: [], ...extra });
async function modalFlow() {
  const phone = await mount([row({ mobilePhone: '081200009601', companyEmail: '',
    missingFields: ['Nama Group Holding', 'Company Name', 'Company Email', 'Industry'], warnings: [] })]);
  await phone.preview(); assert.deepEqual(phone.calls[0], [17, file, 'request']);
  assert.equal(phone.button('Mulai Import').props.disabled, false);
  assert(phone.content().includes('Belum lengkap — boleh import.'));
  assert(phone.content().includes('Company Email, Industry'));
  assert(phone.content().includes('081200009601'));
  await phone.search('no-matching-phone'); assert(phone.content().includes('Tidak ada baris yang cocok'));
  await phone.search('009601'); assert(phone.content().includes('Uji Kontak'));
  phone.button('Mulai Import').props.onClick(); assert.equal(phone.applied(), 1);

  const email = await mount([row({ companyEmail: 'uji@example.org', mobilePhone: '', missingFields: ['Mobile Phone'],
    warnings: ['Nomor HP/WhatsApp belum diisi; peserta belum bisa ditelepon.'] })]);
  await email.preview(); assert.equal(email.button('Mulai Import').props.disabled, false);
  assert(email.content().includes('belum bisa ditelepon'));
  const gmail = await mount([row({ companyEmail: 'uji@gmail.com' })]);
  await gmail.preview(); assert.equal(gmail.button('Mulai Import').props.disabled, false, 'No new domain policy in the original CRM');

  const known = await mount([row({ existingDatabaseId: 9, mobilePhone: '081200009601', missingFields: ['Company Email'] })]);
  await known.preview(); assert.equal(known.button('Mulai Import').props.disabled, false);
  assert(known.content().includes('Kelengkapan Excel.'));
  assert(known.content().includes('akan ditautkan ke event'));
  assert(!known.content().includes('Belum lengkap — boleh import.'), 'Sparse Excel must not relabel an enriched existing profile');

  for (const issue of ['Isi minimal satu kontak: email atau nomor HP/WhatsApp.', 'First Name wajib diisi', 'Format email tidak valid', 'Mobile Phone tidak valid']) {
    const blocked = await mount([row({ status: 'error', existingDatabaseId: 9, issues: [issue] })]);
    await blocked.preview(); assert.equal(blocked.button('Mulai Import').props.disabled, true, issue);
    assert(blocked.content().includes(issue)); assert(blocked.content().includes('Perlu perbaikan')); assert.equal(blocked.applied(), 0);
  }
  const mixed = await mount([row({ missingFields: ['Company Email'] }), row({ rowNumber: 3, status: 'conflict', issues: ['Identitas ambigu'] })]);
  await mixed.preview(); assert.equal(mixed.button('Mulai Import').props.disabled, true, 'Identity conflicts still block the whole batch');

  const pending = await mount([row({ mobilePhone: '081200009601' })], true);
  const finish = await pending.beginPreview();
  assert.equal(pending.closeButton().props.disabled, true);
  assert.equal(pending.button('Ganti File').props.disabled, true);
  pending.closeButton().props.onClick(); assert.equal(pending.closed(), 0);
  await pending.preview(); assert.equal(pending.calls.length, 1, 'Pending preview cannot be submitted twice');
  await finish(); assert.equal(pending.button('Mulai Import').props.disabled, false);
  assert.equal(pending.closeButton().props.disabled, false);
}
async function serviceFlow() {
  const calls = [];
  class ApiService { postFormData(url, body) { calls.push({ url, body }); return Promise.resolve({}); } }
  const { crmService } = compile('lib/services/crmService.ts', name => name === './apiService' ? { ApiService } : unexpected(name), { FormData, URLSearchParams });
  await crmService.validateEventParticipantsImport(17, file, 'request');
  await crmService.importEventParticipants(17, file, 'request');
  assert.deepEqual(calls.map(call => call.url), ['/api/events/17/participants/import/validate', '/api/events/17/participants/import']);
  for (const call of calls) {
    assert.equal(call.body.get('file'), file); assert.equal(call.body.get('tab'), 'request');
    assert.equal(call.body.get('destination'), null, 'Original import API has no destination parameter');
  }
}
(async () => { await modalFlow(); await serviceFlow(); console.log('Event incomplete import passed: phone/email-only, soft corporate warnings, existing profiles, blocking issues, pending guards and original API. No network.'); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
