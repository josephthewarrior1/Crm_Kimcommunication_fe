// Actual PMS service + dialog handlers; anonymous in-memory fixtures, no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
function compile(file, dependencies, globals = {}) {
  const context = { exports: {}, console, Error, require: name => {
    if (!(name in dependencies)) throw Error('Unexpected import: ' + name);
    return dependencies[name];
  }, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, context, { filename: file });
  return context.exports;
}

async function serviceFlow() {
  let events = [], source = [], failName = '', gets = 0;
  const writes = [];
  class ApiService {
    async get(url) { assert.equal(url, '/api/events'); gets++; return clone(events); }
    async post(url, data) {
      assert.equal(url, '/api/events');
      if (data.name === failName) throw Error('Simulated create failure');
      assert(['company', 'participant'].includes(data.syncDestination));
      const event = { ...clone(data), id: events.length + 1 }; events.push(event); writes.push({ url, data: clone(data) }); return clone(event);
    }
    async put(url, data) {
      assert.match(url, /^\/api\/events\/\d+$/);
      const event = events.find(item => url.endsWith('/' + item.id));
      assert(event); Object.assign(event, clone(data)); writes.push({ url, data: clone(data) }); return clone(event);
    }
  }
  const { crmService } = compile('lib/services/crmService.ts', { './apiService': { ApiService } }, {
    process: { env: { NEXT_PUBLIC_PMS_URL: 'http://pms-preview.invalid/events' } }, AbortSignal,
    fetch: async url => { assert.equal(url, 'http://pms-preview.invalid/events'); return { ok: true, json: async () => clone(source) }; },
  });
  source = [{ id: 11, name: 'Open Day', eventType: 'partner', package: 'WA' }, { id: 12, name: 'Business Event', eventType: 'end_user' }];
  let preview = await crmService.previewPmsEvents();
  assert.equal(preview.rows.length, 2); assert.equal(writes.length, 0, 'Preview must not save anything');
  assert(preview.rows.every(row => row.status === 'NEW' && !row.event.syncDestination));
  await assert.rejects(crmService.syncPmsEvents(preview, {}), /Pilih jenis event/); assert.equal(writes.length, 0);
  let result = await crmService.syncPmsEvents(preview, { 11: 'participant', 12: 'company' });
  assert.equal(result.createdCount, 2); assert.equal(result.failedCount, 0);
  assert.equal(events[0].syncDestination, 'participant'); assert.equal(events[1].syncDestination, 'company');
  assert.equal(events[0].pmsEventId, 11); assert.equal(events[0].notes, 'Package: WA');
  const firstWriteCount = writes.length;
  preview = await crmService.previewPmsEvents(); result = await crmService.syncPmsEvents(preview, {});
  assert.equal(result.unchangedCount, 2); assert.equal(writes.length, firstWriteCount, 'Repeated package sync must not rewrite events');
  source[0].name = 'Open Day Renamed';
  preview = await crmService.previewPmsEvents(); assert.equal(preview.rows[0].existingEvent.id, events[0].id);
  result = await crmService.syncPmsEvents(preview, {}); assert.equal(result.createdCount, 0); assert.equal(events.length, 2);
  source = [{ id: 99, name: events[0].name }];
  preview = await crmService.previewPmsEvents(); assert.equal(preview.rows[0].status, 'CONFLICT');
  result = await crmService.syncPmsEvents(preview, { 99: 'company' }); assert.equal(result.failedCount, 1); assert.equal(events.length, 2);
  assert(result.errors[0].message.includes('ID PMS lain'));

  events = [{ id: 50, name: 'Legacy', syncDestination: 'participant', notes: 'Package: WA', emsEventId: 7, emsSource: 'V2' }];
  source = [{ id: 21, name: 'Legacy', package: 'WA' }];
  preview = await crmService.previewPmsEvents(); result = await crmService.syncPmsEvents(preview, {});
  assert.equal(result.updatedCount, 1); assert.equal(events[0].pmsEventId, 21); assert.equal(events[0].syncDestination, 'participant');
  assert.equal(events[0].emsEventId, 7); assert(!('syncDestination' in writes.at(-1).data), 'Existing destination must be omitted from PMS updates');
  preview = await crmService.previewPmsEvents(); result = await crmService.syncPmsEvents(preview, {}); assert.equal(result.unchangedCount, 1);

  events = [{ id: 60, name: 'Untyped', notes: 'Keep CRM notes' }]; source = [{ id: 22, name: 'Untyped' }];
  preview = await crmService.previewPmsEvents(); await assert.rejects(crmService.syncPmsEvents(preview, {}), /Pilih jenis event/);
  result = await crmService.syncPmsEvents(preview, { 22: 'participant' }); assert.equal(result.updatedCount, 1);
  assert.equal(events[0].notes, 'Keep CRM notes'); assert.equal(events[0].syncDestination, 'participant');
  preview = await crmService.previewPmsEvents(); events[0].syncDestination = 'company';
  result = await crmService.syncPmsEvents(preview, { 22: 'participant' }); assert.equal(result.failedCount, 1); assert.equal(events[0].syncDestination, 'company');
  assert(result.errors[0].message.includes('berubah sejak preview'));

  events = [{ id: 1, name: 'Ambiguous' }, { id: 2, name: ' ambiguous ' }]; source = [{ id: 31, name: 'Ambiguous' }];
  preview = await crmService.previewPmsEvents(); assert.equal(preview.rows[0].status, 'CONFLICT');
  source = [{ id: 31, name: 'One' }, { id: 31, name: 'Two' }];
  await assert.rejects(crmService.previewPmsEvents(), /ID event PMS tidak valid atau berulang/);
  source = [{ id: 31, name: 'Same title' }, { id: 32, name: 'Same title' }]; events = [];
  preview = await crmService.previewPmsEvents(); assert(preview.rows.every(row => row.status === 'CONFLICT'));
  source = { events: [] }; await assert.rejects(crmService.previewPmsEvents(), /Daftar event PMS tidak valid/);
  source = [{ id: 41, name: 'Good' }, { id: 42, name: 'Failed' }]; failName = 'Failed';
  preview = await crmService.previewPmsEvents(); result = await crmService.syncPmsEvents(preview, { 41: 'company', 42: 'participant' });
  assert.equal(result.createdCount, 1); assert.equal(result.failedCount, 1); assert.equal(result.totalCount, 2);
  assert.equal(result.errors[0].name, 'Failed'); assert.equal(result.errors[0].message, 'Simulated create failure');
  assert(gets > 10); assert(writes.every(write => !/participants|databases/.test(write.url)), 'PMS sync writes events only');
}

async function dialogFlow() {
  const hooks = [], effects = []; let cursor = 0, changed = false, tree, savedChoices;
  const preview = { totalCount: 1, rows: [{ pmsEventId: 77, event: { name: 'Campus Event' }, status: 'NEW', message: '', packageName: '' }] };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; changed = true; }]; },
    useEffect(effect, deps) { const i = cursor++; if (!hooks[i]) effects.push(effect); hooks[i] = deps; },
  };
  const { PmsSyncDialog } = compile('app/dashboard/events/components/PmsSyncDialog.tsx', {
    react: React, 'lucide-react': {}, '../../../../components/ui/dialog': {},
    '../../../../lib/services/crmService': { crmService: {
      previewPmsEvents: async () => preview,
      syncPmsEvents: async (value, choices) => { assert.equal(value, preview); savedChoices = choices; return { createdCount: 0, updatedCount: 0, unchangedCount: 0, failedCount: 1, errors: [{ pmsEventId: 77, name: 'Campus Event', message: 'Visible save failure' }] }; },
    } },
  });
  const element = PmsSyncDialog({ isOpen: true, onClose() {}, onSynced: async () => {} });
  function render() { cursor = 0; changed = false; tree = element.type(element.props); while (effects.length) effects.shift()(); }
  async function settle() { for (let i = 0; i < 10; i++) { await new Promise(setImmediate); if (!changed) return; render(); } throw Error('Dialog did not settle'); }
  const children = node => [node?.props?.children].flat(Infinity);
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');
  const button = label => nodes(tree).find(node => node.type === 'button' && text(node).includes(label));
  render(); await settle();
  const select = nodes(tree).find(node => node.type === 'select');
  assert.equal(select.props.value, ''); assert.equal(button('Simpan event ke CRM').props.disabled, true);
  select.props.onChange({ target: { value: 'participant' } }); render(); await settle();
  assert.equal(button('Simpan event ke CRM').props.disabled, false);
  button('Simpan event ke CRM').props.onClick(); await settle();
  assert.equal(savedChoices[77], 'participant'); assert(text(tree).includes('Visible save failure'));
  assert.equal(button('Simpan event ke CRM').props.disabled, true);
}

(async () => { await serviceFlow(); await dialogFlow(); console.log('PMS preview/apply checks passed: explicit per-event destinations, stable PMS IDs, repeat/name changes, legacy/conflicts, preserved types, visible failures, and events-only writes. No network.'); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
