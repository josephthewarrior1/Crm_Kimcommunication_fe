// Run: node scripts/check-ems-integration.cjs (anonymous fixtures, no network).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mockRequire) {
  const sandbox = { exports: {}, require: mockRequire };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, sandbox);
  return sandbox.exports;
}
const { resolveEmsEventId } = load('app/dashboard/events/components/EmsEventSelector.tsx', require);
const events = [{ id: 42, name: 'Conference 2026' }, { id: 43, name: 'Repeated name' }, { id: 44, name: 'Repeated name' }];
assert.equal(resolveEmsEventId('Conference 2026', events), 42);
assert.equal(resolveEmsEventId('Conference 202', events), 0); // A year in typed search is not an ID.
assert.equal(resolveEmsEventId('Repeated name', events), 0); // Ambiguous name must be selected by its ID label.
assert.equal(resolveEmsEventId('[ID: 44] Repeated name', events), 44);
assert.equal(resolveEmsEventId(' 42 ', events), 42);
for (const value of ['', '-1', '1.2', '1e3', '9007199254740992']) assert.equal(resolveEmsEventId(value, events), 0);

let response;
let failure;
const calls = [];
class MockApiService {
  async get(endpoint) { calls.push(endpoint); if (failure) throw failure; return response; }
}
const { crmService } = load('lib/services/crmService.ts', name => {
  if (name === '../utils/tagtogAuth') return { tagtogSsoEnabled: true, notifyCrmSessionEnded() {} };
  assert.equal(name, './apiService'); return { ApiService: MockApiService };
});
(async () => {
  response = [{ id: '42', name: 'Legacy fixture' }];
  assert.equal((await crmService.getEmsEvents())[0].id, 42);
  assert.equal(calls.pop(), '/api/events/ems-upcoming?source=LEGACY');
  // An old CRM backend may ignore query params. Never label its legacy result as V2.
  await assert.rejects(crmService.getEmsEvents('V2'), /belum mendukung EMS baru/);
  response = { source: 'V2', data: [{ id: 42, name: 'New fixture' }] };
  assert.equal((await crmService.getEmsEvents('V2'))[0].name, 'New fixture');
  assert.equal(calls.pop(), '/api/events/ems-upcoming?source=V2');
  for (const data of [null, {}, [{ id: 0 }], [{ id: '1e2' }], [{ id: 42 }, { id: 42 }]]) {
    response = { source: 'V2', data };
    await assert.rejects(crmService.getEmsEvents('V2'));
  }
  response = { source: 'V2', data: [] };
  assert.equal((await crmService.getEmsEvents('V2')).length, 0);
  failure = new Error('Fixture unavailable');
  await assert.rejects(crmService.getEmsEvents('V2'), /Fixture unavailable/);
  console.log('EMS checks passed: strict event selection, per-source routes, V2 capability marker, invalid responses and propagated failures. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
