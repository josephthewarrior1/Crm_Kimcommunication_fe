// Run: node scripts/check-event-approval-remarks.cjs. Mounted page handlers and real service serialization; no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function compile(file, requireModule, globals = {}) {
  const context = { exports: {}, require: requireModule, console, URLSearchParams, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, context, { filename: file });
  return context.exports;
}
const unexpected = name => { throw Error('Unexpected dependency: ' + name); };
const children = node => [node?.props?.children].flat(Infinity);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');
const status = compile('app/dashboard/events/utils/statusHelper.ts', unexpected);
const notes = compile('app/dashboard/events/utils/notesHelper.ts', unexpected);
for (const [raw, canonical] of [[undefined, 'not_respon_yet'], ['white', 'not_respon_yet'], ['not_respond_yet', 'not_respon_yet'],
  ['yellow', 'tentative'], ['green', 'registered'], ['confirm', 'registered'], ['red', 'not_interest'], ['not_respond_9x', 'not_respond_9x']]) {
  assert.equal(status.getRemarksValue(raw), canonical);
}
assert.equal(notes.getPreEventApprovalStatus({ preEventApprovalStatus: 'pending', notes: '[PreEventApproval: decline]' }), 'pending');
assert.equal(notes.getPreEventApprovalStatus({ preEventApprovalStatus: 'declined', notes: '[PreEventApproval: approve]' }), 'decline');
assert.equal(notes.getPreEventApprovalStatus({ preEventApprovalStatus: '', notes: '[PreEventApproval: declined]' }), 'decline');

async function checkService() {
  const urls = [];
  class ApiService { async get(url) { urls.push(url); return {}; } }
  const { CrmService } = compile('lib/services/crmService.ts', name => name === './apiService' ? { ApiService } : unexpected(name));
  const service = new CrmService();
  for (const method of ['getEventParticipantsByEvent', 'getEventParticipantsSummary', 'getEventParticipantsSummaryByPic',
    'getEventStatistics', 'getEventParticipantFilterOptions', 'exportEventParticipants']) {
    await service[method](17, { tab: 'pre_event', remarks: 'not_respond_2x', company: 'Company & Branch' });
    const query = new URL('http://local' + urls.at(-1)).searchParams;
    assert.equal(query.get('remarks'), 'not_respond_2x', method);
    assert.equal(query.get('company'), 'Company & Branch', method);
    await service[method](17, { tab: 'request', remarks: 'registered' });
    assert.equal(new URL('http://local' + urls.at(-1)).searchParams.has('remarks'), false, method + ' scopes Remarks to Pre-Event');
  }
}

async function checkPage() {
  const hooks = [], effects = [], calls = [], writes = [];
  let cursor = 0, changed = false, tree, eventId = '17';
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
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
      hooks[index] = deps;
    },
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
  };
  const admin = { id: 1, username: 'admin', fullName: 'Local Test', roles: ['ADMIN'], allowedEventIds: [17, 18] };
  const event = { id: 17, name: 'Local fixture', syncDestination: 'company', emsSource: 'V2', emsEventId: 9 };
  const make = (id, participantStatus, expectedRemark, confirmationStatus = 'approve') => ({
    id, event, database: { id, firstName: 'Anonymous ' + id, lastName: 'Test', company: { name: 'Fixture' }, emails: [] },
    participantStatus, expectedRemark, attendanceStatus: 'registered', confirmationStatus, preEventApprovalStatus: 'pending',
    notes: '[Origin: Request] [Origin: EMS Sync]',
  });
  const rows = [make(1, 'registered', 'registered', 'decline'),
    ...Array.from({ length: 601 }, (_, index) => make(index + 2, 'registered', 'registered')),
    make(603, 'white', 'not_respon_yet'), make(604, 'yellow', 'tentative'), make(605, 'not_respond_2x', 'not_respond_2x')];
  const filtered = params => rows.filter(row => (params.tab !== 'pre_event' || row.confirmationStatus !== 'decline') &&
    (!params.remarks || row.expectedRemark === params.remarks));
  const methods = {
    async getEventsList() { return { items: [event], total: 1, totalPages: 1 }; },
    async getEventById(id) { return { ...event, id }; },
    async getDatabases() { return []; }, async getUsers() { return [admin]; }, async getEligibleManagersForEvent() { return [admin]; },
    async getEventParticipantsByEvent(id, params) {
      const result = filtered(params), size = Math.min(params.size || 25, 500), page = params.page || 1;
      return { items: result.slice((page - 1) * size, page * size), total: result.length, totalPages: Math.ceil(result.length / size) };
    },
    async getEventParticipantsSummary(id, params) { return { totalParticipants: filtered(params).length }; },
    async getEventStatistics(id, params) { return { eventId: id, tab: params.tab, scopes: { all: {}, mine: {} } }; },
    async getEventParticipantFilterOptions() { return { companies: [], positions: [], industries: [], pics: [] }; },
    async exportEventParticipants(id, params) {
      const result = filtered(params);
      return { rows: result.map(row => ({ No: row.id, 'Client Approval': row.confirmationStatus })), sheetName: 'Filtered participants', fileName: 'local.xlsx', total: result.length };
    },
  };
  const service = Object.fromEntries(Object.entries(methods).map(([name, method]) => [name, async (...args) => {
    calls.push({ name, args }); return method(...args);
  }]));
  const components = {};
  const component = name => components[name] ||= Object.defineProperty(() => null, 'name', { value: name });
  const router = { push() {} };
  const dependency = name => {
    if (name === 'react') return React;
    if (name === 'next/navigation') return { useRouter: () => router, useSearchParams: () => ({ get: key => key === 'eventId' ? eventId : null }) };
    if (name.endsWith('/services/crmService')) return { crmService: service };
    if (name.endsWith('/context/AuthContext')) return { useAuth: () => ({ isAdmin: true, isManager: false, isUser: false, user: admin, token: 'local', isLoading: false }) };
    if (name === 'lucide-react') return {};
    if (name === 'sonner') return { toast: { error(message) { throw Error(message); }, success() {}, warning() {} } };
    if (name === 'xlsx') return { utils: { json_to_sheet: rows => ({ rows }), book_new: () => ({}), book_append_sheet: (book, sheet) => { book.sheet = sheet; } }, writeFile: book => writes.push(book) };
    if (name.endsWith('/utils/notesHelper')) return notes;
    if (name.endsWith('/utils/statusHelper')) return status;
    if (name.endsWith('/utils/columnConfigHelper')) return { getEventColumnConfig: () => ({}) };
    if (name.endsWith('/utils/validationHelper')) return { checkDatabaseCompleteness: () => ({ isIncomplete: false, missingFields: [] }) };
    if (name.includes('/components/')) return new Proxy({}, { get: (_, key) => component(key) });
    return unexpected(name);
  };
  const Page = compile('app/dashboard/events/page.tsx', dependency).default;
  const toolbarComponent = compile('app/dashboard/events/components/ParticipantToolbar.tsx', name => name === 'react' ? React :
    name === 'lucide-react' ? {} : name.endsWith('/statusHelper') ? status : unexpected(name)).ParticipantToolbar;
  const find = name => nodes(tree).find(node => node.type === components[name]);
  const button = label => nodes(tree).find(node => node.type === 'button' && text(node) === label);
  function render() { cursor = 0; changed = false; tree = Page(); while (effects.length) effects.shift()(); }
  async function settle() {
    for (let i = 0; i < 40; i++) {
      await new Promise(setImmediate);
      if (changed) { render(); continue; }
      await new Promise(setImmediate);
      if (!changed) return;
    }
    throw Error('Page did not settle');
  }
  const toolbar = () => toolbarComponent(find('ParticipantToolbar').props);
  const remarksSelect = () => nodes(toolbar()).find(node => node.type === 'select' && node.props.id === 'participant-remarks-filter');
  render(); await settle();
  assert.equal(find('RequestPreEventTable').props.filteredParticipants[0].confirmationStatus, 'decline', 'registered EMS must not display a saved Decline as Approve');
  assert.equal(remarksSelect(), undefined, 'Data List has no Remarks filter');
  button('Pre-Event').props.onClick(); await settle();
  assert.equal(remarksSelect().props.value, '');
  assert.ok(nodes(toolbar()).some(node => node.type === 'label' && node.props.htmlFor === 'participant-remarks-filter'));
  remarksSelect().props.onChange({ target: { value: 'registered' } }); await settle();
  assert.equal(remarksSelect().props.value, 'registered');
  assert.equal(find('RequestPreEventTable').props.filteredParticipants.length, 25, 'table uses requested page size');
  assert.ok(find('RequestPreEventTable').props.filteredParticipants.every(row => row.expectedRemark === 'registered'));
  for (const name of ['getEventParticipantsByEvent', 'getEventParticipantsSummary', 'getEventStatistics', 'getEventParticipantFilterOptions']) {
    assert.equal(calls.filter(call => call.name === name).at(-1).args[1].remarks, 'registered', name + ' receives Remarks');
  }
  await button('Export Excel').props.onClick();
  assert.equal(calls.filter(call => call.name === 'exportEventParticipants').at(-1).args[1].remarks, 'registered');
  assert.equal(writes.at(-1).sheet.rows.length, 601, 'export must include all filtered rows beyond the 500-row stats cap');
  find('ParticipantToolbar').props.handleResetFilters(); await settle();
  assert.equal(remarksSelect().props.value, '');
  remarksSelect().props.onChange({ target: { value: 'not_respond_2x' } }); await settle();
  assert.equal(find('RequestPreEventTable').props.filteredParticipants.length, 1);
  button('Data List').props.onClick(); await settle();
  assert.equal(remarksSelect(), undefined);
  assert.equal(calls.filter(call => call.name === 'getEventParticipantsByEvent').at(-1).args[1].remarks, undefined);
  button('Pre-Event').props.onClick(); await settle();
  assert.equal(remarksSelect().props.value, '', 'changing tabs clears Remarks');
  remarksSelect().props.onChange({ target: { value: 'tentative' } }); await settle();
  eventId = '18'; render(); await settle();
  assert.equal(remarksSelect().props.value, '', 'changing events clears Remarks');
  assert.equal(calls.filter(call => call.name === 'getEventParticipantsByEvent' && call.args[0] === 18).at(-1).args[1].remarks, undefined);
}

(async () => {
  await checkService(); await checkPage();
  console.log('PASS: saved Decline, Remarks aliases/UI/query/reset/tab/event scope, six API paths and complete filtered export.');
})().catch(error => { console.error(error); process.exitCode = 1; });
