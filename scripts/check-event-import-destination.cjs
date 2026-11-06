// Run: node scripts/check-event-import-destination.cjs. Actual event import handlers and service requests; no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const unexpected = name => { throw new Error('Unexpected dependency: ' + name); };
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
const file = new File(['anonymous workbook fixture'], 'anonymous-event.xlsx');

async function mount({ initialDestination, mismatch = false, rows, deferPreview = false } = {}) {
  const hooks = [], effects = [], calls = [], messages = [], applied = [];
  let releasePreview;
  const gate = deferPreview ? new Promise(resolve => { releasePreview = resolve; }) : Promise.resolve();
  let cursor = 0, changed = false, tree;
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
  const service = { async validateEventParticipantsImport(...args) {
    calls.push(args);
    await gate;
    const previewRows = rows || [{ rowNumber: 2, status: 'valid', firstName: 'Alex', lastName: 'Example',
      companyName: 'Example Campus', companyEmail: '', personalEmail: 'alex@campus.ac.id', issues: [] }];
    return { destination: mismatch ? 'company' : args[2], summary: { totalRows: previewRows.length }, rows: previewRows };
  } };
  const dependencies = {
    react: React, 'lucide-react': {}, '../../../../lib/services/crmService': { crmService: service },
    sonner: { toast: Object.fromEntries(['success', 'warning', 'error'].map(kind => [kind, message => messages.push({ kind, message })])) },
  };
  const { ExcelImportModal } = compile('app/dashboard/events/components/ExcelImportModal.tsx', name => dependencies[name] || unexpected(name), {
    setInterval: () => 0, clearInterval() {}, setTimeout: callback => queueMicrotask(callback),
  });
  const props = { eventDestination: initialDestination, isOpen: true, eventId: 17, activeTab: 'pre_event', importParticipantsFile: null,
    setImportParticipantsFile(value) { props.importParticipantsFile = value; },
    isImportingParticipants: false, importParticipantsProgress: 0,
    onClose() {}, onImport: destination => applied.push(destination), onDownloadTemplate() {},
  };
  function render() { cursor = 0; changed = false; tree = ExcelImportModal(props); while (effects.length) effects.shift()(); }
  async function settle() {
    for (let i = 0; i < 10; i++) { await new Promise(setImmediate); if (!changed) return; render(); }
    throw new Error('Modal did not settle');
  }
  render(); await settle();
  props.importParticipantsFile = file; render(); await settle();
  return {
    calls, messages, applied,
    content() { return text(tree); },
    selector() { return nodes(tree).find(node => node.type === 'select' && node.props['aria-label'] === 'Tujuan import peserta event'); },
    importButton() { return nodes(tree).find(node => node.type === 'button' && text(node).includes('Mulai Import')); },
    closeButton() { return nodes(tree).find(node => node.type === 'button' && node.props.className?.includes('ms-modal-close')); },
    replaceFileButton() { return nodes(tree).find(node => node.type === 'button' && text(node).includes('Ganti File')); },
    async beginPreview() {
      const work = nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
      await settle();
      return { async finish() { releasePreview(); await work; await settle(); } };
    },
    async changeEventType(value) {
      props.eventDestination = value; render(); await settle();
      props.importParticipantsFile = file; render(); await settle();
    },
    async preview() {
      const form = nodes(tree).find(node => node.type === 'form'); assert(form, 'Preview form must be visible');
      await form.props.onSubmit({ preventDefault() {} }); await settle();
    },
  };
}

async function componentFlow() {
  const pending = await mount({ initialDestination: 'company', deferPreview: true });
  const inFlight = await pending.beginPreview();
  assert.equal(pending.closeButton().props.disabled, true, 'Cannot close/reopen while old preview is pending');
  assert.equal(pending.replaceFileButton().props.disabled, true, 'Cannot change files under an in-flight preview');
  await inFlight.finish();
  assert.equal(pending.importButton().props.disabled, false);

  const modal = await mount();
  assert.equal(modal.selector(), undefined, 'Import has no independent destination selector');
  await modal.preview();
  assert.equal(modal.calls.length, 0, 'Destination is required before preview');
  assert(modal.messages.some(message => message.kind === 'error' && message.message.includes('Tentukan jenis event')));
  assert.equal(modal.importButton(), undefined);
  await modal.changeEventType('participant'); await modal.preview();
  assert.equal(modal.calls.length, 1);
  assert.deepEqual(modal.calls[0], [17, file, 'participant', 'pre_event']);
  assert.equal(modal.importButton().props.disabled, false);
  modal.importButton().props.onClick();
  assert.deepEqual(modal.applied, ['participant']);
  await modal.changeEventType('company');
  assert.equal(modal.importButton(), undefined, 'Changing the event setting invalidates the previous preview');
  await modal.preview();
  assert.equal(modal.calls.at(-1)[2], 'company', 'An institutional email must not choose or change destination');
  modal.importButton().props.onClick();
  assert.deepEqual(modal.applied, ['participant', 'company']);

  const seeded = await mount({ initialDestination: 'participant' });
  assert.equal(seeded.selector(), undefined, 'The event setting fixes the destination');
  assert(seeded.content().includes('Jenis event: Peserta / Publik'));
  await seeded.preview(); assert.equal(seeded.calls[0][2], 'participant');
  const mismatch = await mount({ initialDestination: 'participant', mismatch: true });
  await mismatch.preview();
  assert.equal(mismatch.importButton(), undefined);
  assert.equal(mismatch.applied.length, 0);
  assert(mismatch.messages.some(message => message.kind === 'error' && message.message.includes('Tujuan preview tidak sesuai')));
}

async function incompleteEventFlow() {
  const phoneOnly = await mount({ initialDestination: 'company', rows: [{ rowNumber: 2, status: 'valid',
    firstName: 'Phone', lastName: 'Example', mobilePhone: '081234567890', companyEmail: '', personalEmail: '',
    issues: [], missingFields: ['Company Name', 'Company Email', 'Industry'], warnings: [] }] });
  await phoneOnly.preview();
  assert.equal(phoneOnly.importButton().props.disabled, false, 'Missing corporate metadata is not an Event import error');
  assert(phoneOnly.content().includes('081234567890'), 'Phone-only data must be visible in preview');
  assert(phoneOnly.content().includes('Data Kotor — boleh import.'));
  assert(phoneOnly.content().includes('Company Email, Industry'));
  phoneOnly.importButton().props.onClick(); assert.deepEqual(phoneOnly.applied, ['company']);

  const emailOnly = await mount({ initialDestination: 'participant', rows: [{ rowNumber: 2, status: 'valid',
    firstName: 'Campus', personalEmail: 'campus@school.ac.id', mobilePhone: '', issues: [], missingFields: [],
    warnings: ['Nomor HP/WhatsApp belum diisi; peserta belum bisa ditelepon.'] }] });
  await emailOnly.preview();
  assert.equal(emailOnly.importButton().props.disabled, false, 'Missing HP is a tele warning when a valid email is available');
  assert(emailOnly.content().includes('belum bisa ditelepon'));
  assert(!emailOnly.content().includes('Data Kotor — boleh import.'), 'Email-only participant quality is unchanged');

  const existing = await mount({ initialDestination: 'company', rows: [{ rowNumber: 2, status: 'valid',
    existingDatabaseId: 9, firstName: 'Known', mobilePhone: '081234567890', issues: [], missingFields: ['Company Email'] }] });
  await existing.preview();
  assert.equal(existing.importButton().props.disabled, false);
  assert(existing.content().includes('Kelengkapan Excel.'));
  assert(existing.content().includes('Kontak sudah ada di database'));
  assert(!existing.content().includes('Data Kotor — boleh import.'), 'Sparse Excel cannot reclassify an enriched existing profile');

  for (const issue of ['Email atau nomor HP/WhatsApp wajib diisi', 'Format email tidak valid', 'Nomor HP tidak valid']) {
    const blocked = await mount({ initialDestination: 'participant', rows: [{ rowNumber: 2,
      status: 'error', firstName: 'Blocked', issues: [issue], missingFields: [], warnings: [] }] });
    await blocked.preview();
    assert.equal(blocked.importButton().props.disabled, true, issue);
    assert(blocked.content().includes(issue));
    assert(blocked.content().includes('Perlu perbaikan'));
    assert.equal(blocked.applied.length, 0);
  }

  const mixed = await mount({ initialDestination: 'company', rows: [
    { rowNumber: 2, status: 'valid', firstName: 'Ready', mobilePhone: '081234567890', issues: [], missingFields: ['Company Email'] },
    { rowNumber: 3, status: 'conflict', firstName: 'Conflict', issues: ['Identitas kontak ambigu'] },
  ] });
  await mixed.preview();
  assert.equal(mixed.importButton().props.disabled, true, 'A genuine identity conflict still blocks the batch');
}

async function serviceFlow() {
  const calls = [];
  class ApiService { postFormData(url, body) { calls.push({ url, body }); return Promise.resolve({}); } }
  const { crmService } = compile('lib/services/crmService.ts', name => name === './apiService' ? { ApiService } : unexpected(name), { FormData, URLSearchParams });
  for (const destination of ['company', 'participant']) {
    await crmService.validateEventParticipantsImport(17, file, destination, 'pre_event');
    await crmService.importEventParticipants(17, file, destination, 'pre_event');
  }
  assert.equal(calls.length, 4);
  calls.forEach((call, index) => {
    assert.equal(call.body.get('destination'), index < 2 ? 'company' : 'participant');
    assert.equal(call.body.get('tab'), 'pre_event'); assert.equal(call.body.get('file').name, file.name);
    assert.equal(call.url, `/api/events/17/participants/import${index % 2 === 0 ? '/validate' : ''}`);
  });
}

(async () => { await componentFlow(); await incompleteEventFlow(); await serviceFlow(); console.log('Event import checks passed: fixed event target, phone/email-only preview, soft warnings, blocking errors/conflicts, pending-preview controls and FormData. No network.'); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
