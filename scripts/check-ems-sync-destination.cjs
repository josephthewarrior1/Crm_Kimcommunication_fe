// Actual dialog handlers; all services are anonymous in-memory fixtures, no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const plain = value => JSON.parse(JSON.stringify(value));
const children = node => [node?.props?.children].flat(Infinity);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');

function mount({ savedDestination = null, failPreview = false, failSync = false, failRefresh = false, mismatch = false } = {}) {
  let index = 0, tree, closed = 0, refreshed = 0;
  const state = [], calls = [], messages = [];
  const hookReact = { ...React, useState(initial) {
    const cursor = index++;
    if (!(cursor in state)) state[cursor] = typeof initial === 'function' ? initial() : initial;
    return [state[cursor], value => { state[cursor] = typeof value === 'function' ? value(state[cursor]) : value; }];
  } };
  const event = { id: 7, name: 'Example Education Event', syncDestination: savedDestination };
  const preview = { destination: savedDestination || 'participant', totalRows: 3, newCount: 1, existingCount: 1, rejectedCount: 1, previewToken: 'example-token', rows: [
    { rowNum: 1, name: 'Example Student', email: 'student@campus.ac.id', status: 'NEW', message: 'New profile at chosen destination' },
    { rowNum: 2, name: 'Existing Student', email: 'existing@company.example', status: 'EXISTING', message: 'Reuse profile and event history' },
    { rowNum: 3, name: 'Invalid Row', email: 'invalid', status: 'REJECTED', message: 'Periksa email' },
  ] };
  const service = {
    async setEventSyncDestination(id, destination) { calls.push({ name: 'saveDestination', id, destination }); preview.destination = destination; return { ...event, syncDestination: destination }; },
    async previewEmsParticipants(id) { calls.push({ name: 'preview', id }); if (failPreview) throw new Error('Fixture preview unavailable'); return mismatch ? {...preview, destination: savedDestination === 'company' ? 'participant' : 'company'} : preview; },
    async syncEmsParticipants(id, body) { calls.push({ name: 'apply', id, body }); if (failSync) throw new Error('Data berubah. Preview ulang.'); return { ...preview, count: 2 }; },
  };
  const modules = {
    react: hookReact,
    'lucide-react': { Loader2: props => React.createElement('span', props) },
    '../../../../lib/services/crmService': { crmService: service },
    '../../../../components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription'].map(name => [name, ({ children }) => React.createElement('div', null, children)])),
    sonner: { toast: Object.fromEntries(['success', 'warning'].map(kind => [kind, message => messages.push({ kind, message })])) },
  };
  const sandbox = { exports: {}, console, Error, require(name) { assert(name in modules, name); return modules[name]; } };
  const source = fs.readFileSync('app/dashboard/events/components/EmsSyncDialog.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText + '\nexports.SyncContent = SyncContent;', sandbox);
  const props = { isOpen: true, event, onClose: () => closed++, onDestinationSaved(updated) { calls.push({ name: 'savedCallback', destination: updated.syncDestination }); }, async onSynced() { refreshed++; if (failRefresh) throw new Error('Fixture refresh failed'); } };
  function render() { index = 0; tree = sandbox.exports.SyncContent(props); }
  render();
  return {
    calls, messages, preview,
    get closed() { return closed; }, get refreshed() { return refreshed; },
    get html() { return renderToStaticMarkup(tree); },
    find(predicate) { const node = nodes(tree).find(predicate); assert(node, 'Missing control'); return node; },
    button(label) { return this.find(node => node.type === 'button' && text(node).toLowerCase().includes(label.toLowerCase())); },
    hasSelector() { return nodes(tree).some(node => node.type === 'select'); },
    async click(label) { const control = this.button(label); assert(!control.props.disabled, 'Control disabled: ' + label); await control.props.onClick(); render(); },
    isClosedWrapperNull() { return sandbox.exports.EmsSyncDialog({ ...props, isOpen: false }) === null; },
  };
}

(async () => {
  const fresh = mount();
  assert(fresh.isClosedWrapperNull());
  assert(fresh.button('Muat ulang preview').props.disabled, 'Unconfigured event cannot preview');
  assert(fresh.button('Konfirmasi sync').props.disabled, 'No apply before preview');
  assert.equal(fresh.calls.length, 0, 'Opening dialog does not write or sync');
  assert(!fresh.hasSelector(), 'Sync cannot independently change the event type');
  assert.match(fresh.html, /Edit Event sebelum sync/);

  const participant = mount({ savedDestination: 'participant' });
  await participant.click('Muat ulang preview');
  assert.deepEqual(plain(participant.calls.map(call => call.name)), ['preview']);
  assert.match(participant.html, /Database Peserta/);
  assert.match(participant.html, /student@campus.ac.id/);
  assert.match(participant.html, /existing@company.example/);
  assert.match(participant.html, /Ditolak/);
  assert(!participant.button('Konfirmasi sync 2').props.disabled);
  await participant.click('Konfirmasi sync 2');
  assert.deepEqual(plain(participant.calls.find(call => call.name === 'apply')), { name: 'apply', id: 7, body: { previewToken: 'example-token' } });
  assert.equal(participant.closed, 1); assert.equal(participant.refreshed, 1);

  const existing = mount({ savedDestination: 'company' });
  await existing.click('Muat ulang preview');
  assert.deepEqual(plain(existing.calls.map(call => call.name)), ['preview'], 'Saved event target reused without implicit setting writes');
  assert(!existing.hasSelector());
  assert(!existing.calls.some(call => call.name === 'saveDestination'));
  const changed = mount({ savedDestination: 'company', mismatch: true });
  await changed.click('Muat ulang preview');
  assert(changed.button('Konfirmasi sync').props.disabled, 'Unexpected server target cannot be applied');
  assert.match(changed.html, /Tujuan event berubah/);

  const stale = mount({ savedDestination: 'participant', failSync: true });
  await stale.click('Muat ulang preview');
  await stale.click('Konfirmasi sync 2');
  assert.match(stale.html, /Preview ulang/);
  assert(stale.button('Konfirmasi sync').props.disabled, 'Stale sync requires new preview');
  assert.equal(stale.closed, 0); assert.equal(stale.refreshed, 0);

  const failed = mount({ savedDestination: 'participant', failPreview: true });
  await failed.click('Muat ulang preview');
  assert.match(failed.html, /Fixture preview unavailable/);
  assert(failed.button('Konfirmasi sync').props.disabled);
  assert(!failed.calls.some(call => call.name === 'apply'));

  const refresh = mount({ savedDestination: 'participant', failRefresh: true });
  await refresh.click('Muat ulang preview'); await refresh.click('Konfirmasi sync 2');
  assert(refresh.messages.some(message => message.kind === 'warning' && message.message.includes('Sync selesai')));
  assert.equal(refresh.closed, 1);
  const stats = fs.readFileSync('app/dashboard/events/components/EventStatistics.tsx', 'utf8');
  assert(!stats.includes('syncEmsParticipants'), 'PIC assignment must not implicitly import EMS data');
  console.log('EMS destination UI checks passed: event-fixed target, no target writes, campus emails, confirmation token, mismatch/stale/error recovery, no silent PIC sync. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
