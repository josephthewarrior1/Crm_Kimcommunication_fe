'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports, globals = {}) {
  const context = { exports: {}, require: name => {
    assert.ok(Object.hasOwn(imports, name), 'Unexpected runtime import: ' + name);
    return imports[name];
  }, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
}
function helper(enabled = true, globals = {}) {
  return load('lib/utils/tagtogDataSync.ts', { './tagtogAuth': { tagtogSsoEnabled: enabled } }, globals);
}
function service(enabled, eventContext) {
  const calls = [];
  class ApiService {
    async get(route) { calls.push(['GET', route]); return route.endsWith('/context') ? eventContext : [{ id: 42, name: 'Standalone EMS fixture' }]; }
    async post(route, body) { calls.push(['POST', route, body]); return { count: 0, message: 'Standalone fixture' }; }
  }
  const value = load('lib/services/crmService.ts', {
    './apiService': { ApiService },
    '../utils/tagtogAuth': { tagtogSsoEnabled: enabled, notifyCrmSessionEnded() {} },
    '../utils/tagtogDataSync': helper(enabled),
  }, { fetch() { throw new Error('Unexpected external request'); } });
  return { ...value, calls };
}

test('CRM return context accepts exactly one positive safe event identity', () => {
  const { positiveCrmEventId, crmEventIdFromQuery } = helper();
  for (const value of ['', '0', '-1', '01', '1.2', '1e3', ' 18 ', '9007199254740992', Infinity, NaN, null, {}, true]) {
    assert.equal(positiveCrmEventId(value), null);
  }
  assert.equal(positiveCrmEventId(18), 18);
  assert.equal(crmEventIdFromQuery(new URLSearchParams('eventId=18')), 18);
  assert.equal(crmEventIdFromQuery(new URLSearchParams('id=18')), 18);
  for (const query of ['', 'eventId=18&eventId=19', 'eventId=18&id=18', 'eventId=1e3', 'eventId=https://foreign.test']) {
    assert.equal(crmEventIdFromQuery(new URLSearchParams(query)), null);
  }
});

test('data-sync navigation uses only the local BFF route and same-tab navigation', () => {
  const assigned = [];
  const { crmDataSyncHref, openTagtogDataSync } = helper(true, {
    window: { location: { assign: value => assigned.push(value) }, open() { throw new Error('No popup'); } },
    localStorage: { getItem() { throw new Error('Do not read bearer storage'); } },
  });
  assert.equal(crmDataSyncHref(), '/api/tagtog/data-sync');
  assert.equal(crmDataSyncHref(18), '/api/tagtog/data-sync?eventId=18');
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => crmDataSyncHref(value));
  openTagtogDataSync(); openTagtogDataSync(18);
  assert.deepEqual(assigned, ['/api/tagtog/data-sync', '/api/tagtog/data-sync?eventId=18']);
});

test('TAGTOG refuses every legacy EMS/PMS adapter path before API or external requests', async () => {
  const { crmService, calls } = service(true);
  for (const operation of [() => crmService.previewPmsEvents(), () => crmService.syncPmsEvents(), () => crmService.getEmsEvents('V2'),
    () => crmService.getEmsEventParticipants(1), () => crmService.previewEmsParticipants(18), () => crmService.syncEmsParticipants(18)]) {
    await assert.rejects(operation, /Sync melalui TAGTOG/);
  }
  assert.deepEqual(calls, []);
});

test('standalone CRM keeps explicit EMS list and sync routes', async () => {
  const { crmService, calls } = service(false);
  const events = await crmService.getEmsEvents('LEGACY');
  assert.equal(events[0].id, 42);
  await crmService.syncEmsParticipants(18, { previewToken: 'reviewed-fixture' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['GET', '/api/events/ems-upcoming?source=LEGACY'], ['POST', '/api/events/18/sync-ems', { previewToken: 'reviewed-fixture' }],
  ]);
});

const context = { companyId: 3, datasetId: '11111111-1111-4111-8111-111111111111', eventId: 18, linked: true,
  pmsProjectId: 1650, emsEventId: 1, pmsDatasetId: '22222222-2222-4222-8222-222222222222',
  emsDatasetId: '33333333-3333-4333-8333-333333333333', version: 1, updatedAt: '2026-11-04T06:07:00Z' };

test('native event context is a GET-only read pinned to the selected CRM event', async () => {
  const { crmService, calls } = service(true, context);
  assert.equal((await crmService.getTagtogEventContext(18)).pmsProjectId, 1650);
  await assert.rejects(() => crmService.getTagtogEventContext(19), /Informasi hubungan/);
  await assert.rejects(() => crmService.getTagtogEventContext(-1), /event CRM yang valid/);
  assert.deepEqual(calls, [['GET', '/api/integrations/tagtog/events/18/context'], ['GET', '/api/integrations/tagtog/events/19/context']]);
});

test('source panel rejects mismatched identities, namespaces, and ambiguous timestamps', () => {
  const { readCrmTagtogEventContext } = helper();
  for (const change of [{ companyId: 0 }, { eventId: 19 }, { pmsProjectId: -1 }, { emsEventId: 0 },
    { emsDatasetId: context.datasetId }, { updatedAt: '2026-11-04T13:07:00' }, { version: 0 }]) {
    assert.throws(() => readCrmTagtogEventContext({ ...context, ...change }, 18), /Informasi hubungan/);
  }
  const unlinked = readCrmTagtogEventContext({ companyId: 3, datasetId: context.datasetId, eventId: 18, linked: false }, 18);
  assert.equal(unlinked.linked, false);
  assert.equal(Object.keys(unlinked).length, 4);
});

test('context panel loads only context and discards responses after the event is left', async () => {
  const effects = [], reads = [], changes = [];
  let resolve;
  const jsx = (type, props) => ({ type, props });
  const { TagtogEventSyncPanel } = load('app/dashboard/events/components/TagtogEventSyncPanel.tsx', {
    react: { useEffect: fn => effects.push(fn), useId: () => 'fixture-context', useState: initial => [initial, value => changes.push(value)] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': { RefreshCw() {}, Link2() {} },
    '../../../../lib/services/crmService': { crmService: { getTagtogEventContext(eventId, signal) { reads.push({ eventId, signal }); return new Promise(done => { resolve = done; }); } } },
  }, { AbortController });
  const view = TagtogEventSyncPanel({ eventId: 18, canManage: true });
  assert.equal(view.type, 'section');
  const cleanup = effects[0]();
  assert.equal(reads.length, 1);
  assert.equal(reads[0].eventId, 18);
  cleanup();
  resolve(context);
  await Promise.resolve();
  assert.equal(reads[0].signal.aborted, true);
  assert.deepEqual(changes, []);
});

test('TAGTOG mapping field neither reads legacy EMS nor changes saved source/reference', () => {
  const effects = [], reads = [], changes = [];
  const jsx = (type, props) => ({ type, props });
  const { EmsMappingField } = load('app/dashboard/events/components/EmsMappingField.tsx', {
    react: { useEffect: fn => effects.push(fn), useId: () => 'fixture-source', useState: initial => [initial, () => changes.push('state')] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': { RefreshCw() {} },
    '../../../../lib/services/crmService': { crmService: { getEmsEvents() { reads.push('EMS'); throw new Error('No legacy read'); } } },
    '../../../../lib/utils/tagtogAuth': { tagtogSsoEnabled: true },
    './EmsEventSelector': { EmsEventSelector() {} },
  });
  const view = EmsMappingField({ source: 'V2', eventId: 1, onSourceChange: () => changes.push('source'), onEventIdChange: () => changes.push('reference') });
  for (const effect of effects) effect();
  assert.equal(view.type, 'fieldset');
  assert.deepEqual(reads, []);
  assert.deepEqual(changes, []);
});

test('PIC assignment does not perform an unreviewed legacy EMS sync', () => {
  const file = ts.createSourceFile('EventStatistics.tsx', fs.readFileSync(path.join(root, 'app/dashboard/events/components/EventStatistics.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let syncCalls = 0, assignmentCalls = 0;
  function walk(node) {
    if (ts.isCallExpression(node)) {
      if (node.expression.getText(file) === 'crmService.syncEmsParticipants') {
        syncCalls++;
        let ancestor = node.parent;
        while (ancestor && !(ts.isIfStatement(ancestor) && ancestor.expression.getText(file) === 'eventId && !tagtogSsoEnabled')) ancestor = ancestor.parent;
        assert.ok(ancestor, 'PIC assignment must not run a legacy sync in TAGTOG mode');
      }
      if (['onAssignPic', 'onAutoSplit'].includes(node.expression.getText(file))) assignmentCalls++;
    }
    ts.forEachChild(node, walk);
  }
  walk(file);
  assert.equal(syncCalls, 0);
  assert.ok(assignmentCalls >= 3, 'Native PIC assignment actions remain available');
});

test('sandbox production preview routes are absent from the release source', () => {
  assert.equal(fs.existsSync(path.join(root, 'app', 'preview')), false);
});
