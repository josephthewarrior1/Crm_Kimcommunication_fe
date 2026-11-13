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
assert.equal(notes.getPreEventApprovalStatus({ approvalSource: 'ems', preEventApprovalStatus: 'approve', notes: '[PreEventApproval: approve]' }), 'approve', 'Current manual approval remains effective until sync');
assert.equal(notes.getPreEventApprovalStatus({ approvalSource: 'ems', emsApprovalStatus: 'approve', preEventApprovalStatus: 'decline' }), 'decline');
assert.equal(notes.getPreEventApprovalStatus({ approvalSource: 'ems', emsApprovalStatus: 'decline', preEventApprovalStatus: 'approve' }), 'approve');
assert.equal(notes.getPreEventApprovalStatus({ event: { emsEventId: 9 }, preEventApprovalStatus: 'approve' }), 'approve');

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
    const reminderFilters = { reminderH7: 'confirm', reminderH3: 'not_respond_2x', reminderH1: '__empty__' };
    await service[method](17, { tab: 'reminder', ...reminderFilters, company: 'Company & Branch', pic: 'Local Test' });
    const reminderQuery = new URL('http://local' + urls.at(-1)).searchParams;
    for (const [key, value] of Object.entries(reminderFilters)) assert.equal(reminderQuery.get(key), value, method + ' preserves ' + key);
    assert.equal(reminderQuery.get('company'), 'Company & Branch');
    assert.equal(reminderQuery.get('pic'), 'Local Test');
    for (const tab of ['request', 'pre_event', 'declined', 'reminder_dday', undefined]) {
      await service[method](17, { tab, ...reminderFilters });
      const scopedQuery = new URL('http://local' + urls.at(-1)).searchParams;
      for (const key of Object.keys(reminderFilters)) assert.equal(scopedQuery.has(key), false, method + ' ignores ' + key + ' outside Reminder');
    }
    await service[method](17, { tab: 'reminder', reminderH7: '', reminderH3: '', reminderH1: '' });
    const emptyQuery = new URL('http://local' + urls.at(-1)).searchParams;
    for (const key of Object.keys(reminderFilters)) assert.equal(emptyQuery.has(key), false, method + ' omits empty ' + key);
  }
}

async function checkPage(initialQuery = '?eventId=17', expectedInitialTab) {
  const hooks = [], effects = [], calls = [], writes = [];
  let cursor = 0, changed = false, tree;
  let currentUrl = new URL('http://local/dashboard/events' + initialQuery);
  let currentSearchParams = new URLSearchParams(currentUrl.search);
  const historyEntries = [currentUrl.href];
  let historyIndex = 0;
  const updateUrl = url => {
    currentUrl = new URL(url, currentUrl);
    currentSearchParams = new URLSearchParams(currentUrl.search);
    changed = true; // Next's native History integration updates useSearchParams.
  };
  const nativeHistory = {
    pushState(_state, _title, url) {
      historyEntries.splice(++historyIndex);
      updateUrl(url);
      historyEntries.push(currentUrl.href);
    },
    replaceState(_state, _title, url) {
      updateUrl(url);
      historyEntries[historyIndex] = currentUrl.href;
    },
    back() { if (historyIndex > 0) updateUrl(historyEntries[--historyIndex]); },
    forward() { if (historyIndex < historyEntries.length - 1) updateUrl(historyEntries[++historyIndex]); },
  };
  const browserWindow = { history: nativeHistory, get location() { return currentUrl; } };
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
    reminderH7: id % 2 === 0 ? 'confirm' : 'not_respon_yet',
    reminderH3: id % 3 === 0 ? 'tentative' : 'confirm', reminderH1: id % 5 === 0 ? 'not_respond_2x' : undefined,
    notes: '[Origin: Request] [Origin: EMS Sync]',
  });
  const rows = [make(1, 'registered', 'registered', 'decline'),
    ...Array.from({ length: 601 }, (_, index) => make(index + 2, 'registered', 'registered')),
    make(603, 'white', 'not_respon_yet'), make(604, 'yellow', 'tentative'), make(605, 'not_respond_2x', 'not_respond_2x')];
  const filtered = params => rows.filter(row => (params.tab !== 'pre_event' || row.confirmationStatus !== 'decline') &&
    (!params.remarks || row.expectedRemark === params.remarks) &&
    ['reminderH7', 'reminderH3', 'reminderH1'].every(key => params.tab !== 'reminder' || !params[key]
      || (params[key] === '__empty__' ? !row[key] : row[key] === params[key])));
  const methods = {
    async updateParticipantStatus() { return {}; }, async updatePreEventApprovalStatus() { return {}; },
    async bulkUpdateEventParticipants() { return { updatedCount: 1 }; }, async addEventParticipantActivity() { return {}; },
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
  const router = { push(url) { nativeHistory.pushState(null, '', url); } };
  const dependency = name => {
    if (name === 'react') return React;
    if (name === 'next/navigation') return { useRouter: () => router, useSearchParams: () => currentSearchParams };
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
  const Page = compile('app/dashboard/events/page.tsx', dependency, {
    URL, window: browserWindow, localStorage: { getItem: key => key === 'session' ? 'local' : null, setItem() {} },
  }).default;
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
  if (expectedInitialTab !== undefined) {
    const initialEventId = Number(currentUrl.searchParams.get('eventId') || currentUrl.searchParams.get('id'));
    const participantRequests = () => calls.filter(call => call.name === 'getEventParticipantsByEvent' && call.args[0] === initialEventId);
    assert(participantRequests().length > 0, 'Initial deep link loads participants');
    assert(participantRequests().every(call => call.args[1].tab === expectedInitialTab), 'The initial participant requests use the URL tab, without a transient Data List request');
    assert.equal(find('EventStatistics').props.activeTab, expectedInitialTab, 'Visible active tab matches the deep link');
    const originalUrl = new URL(currentUrl);
    const switchTo = expectedInitialTab === 'reminder' ? 'pre_event' : 'reminder';
    button(switchTo === 'reminder' ? 'Reminder' : 'Pre-Event').props.onClick(); await settle();
    assert.equal(currentUrl.searchParams.get('tab'), switchTo, 'Clicking an event tab updates its URL');
    assert.equal(currentUrl.searchParams.get('eventId'), originalUrl.searchParams.get('eventId'));
    assert.equal(currentUrl.searchParams.get('id'), originalUrl.searchParams.get('id'));
    assert.equal(currentUrl.searchParams.get('view'), originalUrl.searchParams.get('view'), 'Tab changes preserve unrelated query parameters');
    assert.equal(currentUrl.hash, originalUrl.hash, 'Tab changes preserve the URL fragment');
    assert.equal(find('EventStatistics').props.activeTab, switchTo);
    assert.equal(participantRequests().at(-1).args[1].tab, switchTo);
    nativeHistory.back(); await settle();
    assert.equal(currentUrl.href, originalUrl.href);
    assert.equal(find('EventStatistics').props.activeTab, expectedInitialTab, 'Back restores the prior tab from the URL');
    assert.equal(participantRequests().at(-1).args[1].tab, expectedInitialTab);
    nativeHistory.forward(); await settle();
    assert.equal(find('EventStatistics').props.activeTab, switchTo, 'Forward restores the next URL tab');
    assert.equal(participantRequests().at(-1).args[1].tab, switchTo);
    const beforeChangingEvent = calls.length;
    router.push('/dashboard/events?eventId=18'); await settle();
    assert.equal(find('EventStatistics').props.activeTab, 'request', 'A URL for another event without tab defaults to Data List');
    const changedEventRequests = calls.slice(beforeChangingEvent).filter(call => call.name === 'getEventParticipantsByEvent');
    assert(changedEventRequests.length > 0 && changedEventRequests.every(call => call.args[0] === 18 && call.args[1].tab === 'request'), 'Changing event URLs does not fetch the previous event with a new tab');
    nativeHistory.back(); await settle();
    assert.equal(find('EventStatistics').props.activeTab, switchTo, 'Back restores the former event and its tab together');
    button('Back to Events List').props.onClick(); await settle();
    const card = nodes(tree).find(node => node.type === 'div' && node.props.onClick
      && nodes(node).some(child => child.type === 'h4' && text(child) === event.name));
    assert(card, 'Event list remains available after leaving a tab');
    const beforeOpeningEvent = calls.length;
    await card.props.onClick(); await settle();
    assert.equal(currentUrl.searchParams.get('eventId'), String(event.id));
    assert.equal(currentUrl.searchParams.get('tab'), null, 'Opening another event starts with its default tab');
    assert.equal(find('EventStatistics').props.activeTab, 'request');
    const newEventRequests = calls.slice(beforeOpeningEvent).filter(call => call.name === 'getEventParticipantsByEvent');
    assert(newEventRequests.length > 0 && newEventRequests.every(call => call.args[0] === event.id && call.args[1].tab === 'request'), 'The first request for a new event never inherits another event\'s tab');
    assert.equal(calls.filter(call => ['updateParticipantStatus', 'updatePreEventApprovalStatus', 'bulkUpdateEventParticipants'].includes(call.name)).length, 0, 'Tab navigation does not write business data');
    return;
  }
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
  updateUrl('/dashboard/events?eventId=18&tab=pre_event'); await settle();
  assert.equal(remarksSelect().props.value, '', 'changing events clears Remarks');
  assert.equal(calls.filter(call => call.name === 'getEventParticipantsByEvent' && call.args[0] === 18).at(-1).args[1].remarks, undefined);
  const mutationCount = () => calls.filter(call => ['updateParticipantStatus', 'updatePreEventApprovalStatus', 'bulkUpdateEventParticipants'].includes(call.name)).length;
  const beforeApproval = mutationCount();
  await find('RequestPreEventTable').props.handleDirectUpdateParticipant(rows[1], 'preEventApprovalStatus', 'approve');
  find('RequestPreEventTable').props.setSelectedParticipantIds([rows[1].id]); await settle();
  await find('BatchActionsBar').props.handleBatchUpdatePreEventApprovalStatus('approve');
  assert.equal(mutationCount(), beforeApproval + 2, 'Direct and batch page callbacks permit manual approval');
  assert.equal(calls.filter(call => call.name === 'updatePreEventApprovalStatus').at(-1).args[2], 'approve');
  assert.equal(calls.filter(call => call.name === 'bulkUpdateEventParticipants').at(-1).args[0].preEventApprovalStatus, 'approve');
  assert(!text(tree).includes(notes.SYNC_APPROVAL_HELP), 'No approval-source banner is added to Pre-Event');
  await find('RequestPreEventTable').props.handleDirectUpdateParticipant(rows[1], 'remarks', 'registered');
  const remarkWrite = calls.filter(call => call.name === 'updateParticipantStatus').at(-1);
  assert.equal(remarkWrite.args[1], 'registered');
  assert.equal(remarkWrite.args[16], undefined, 'Registered does not alter Client Approval');
  assert.equal(remarkWrite.args[17], undefined, 'Registered does not alter Pre-Event Approval');
  find('RequestPreEventTable').props.handleOpenUpdateParticipantModal(rows[1]); await settle();
  await find('UpdateParticipantModal').props.onSubmit({
    participantStatus: 'registered', attendanceStatus: 'registered', notes: '[PIC: Local Test] Qualification note',
    confirmationStatus: 'decline', preEventApprovalStatus: 'approve',
  });
  const editWrite = calls.filter(call => call.name === 'updateParticipantStatus').at(-1);
  assert.equal(editWrite.args[17], 'approve', 'Page edit forwards the manual Pre-Event choice');
  assert(editWrite.args[3].includes('[PreEventApproval: approve]'), 'Manual approval and its legacy tag stay consistent');
  assert.equal(editWrite.args[16], 'decline', 'Explicit CRM Client Decline remains the CRM decision');

  const beforeReminderFilters = mutationCount();
  const reminderSelect = stage => nodes(toolbar()).find(node => node.type === 'select' && node.props.id === 'participant-reminder-' + stage + '-filter');
  assert.equal(reminderSelect('h7'), undefined, 'Pre-Event has no H-7/H-3/H-1 filters');
  button('Reminder').props.onClick(); await settle();
  for (const stage of ['h7', 'h3', 'h1']) {
    const select = reminderSelect(stage);
    assert(select, 'Reminder renders the ' + stage + ' status filter');
    assert.equal(select.props.value, '');
    assert(nodes(toolbar()).some(node => node.type === 'label' && node.props.htmlFor === select.props.id), 'Reminder filter has an associated label');
    assert.deepEqual(nodes(select).filter(node => node.type === 'option').map(node => node.props.value),
      ['', '__empty__', 'not_respon_yet', 'not_respond_2x', 'tentative', 'confirm', 'unable_to_attend']);
  }
  reminderSelect('h7').props.onChange({ target: { value: 'confirm' } }); await settle();
  reminderSelect('h3').props.onChange({ target: { value: 'tentative' } }); await settle();
  button('Next').props.onClick(); await settle();
  const tableQuery = () => calls.filter(call => call.name === 'getEventParticipantsByEvent' && call.args[1].size === 25).at(-1).args[1];
  assert.equal(tableQuery().page, 2, 'Reminder can navigate the filtered result pages');
  reminderSelect('h1').props.onChange({ target: { value: '__empty__' } }); await settle();
  const selectedFilters = { reminderH7: 'confirm', reminderH3: 'tentative', reminderH1: '__empty__' };
  for (const name of ['getEventParticipantsByEvent', 'getEventParticipantsSummary', 'getEventStatistics', 'getEventParticipantFilterOptions']) {
    const query = calls.filter(call => call.name === name).at(-1).args[1];
    for (const [key, value] of Object.entries(selectedFilters)) assert.equal(query[key], value, name + ' receives ' + key);
  }
  assert.equal(tableQuery().page, 1, 'Changing a Reminder status filter returns to page 1');
  const expectedReminderRows = filtered({ tab: 'reminder', ...selectedFilters });
  assert(expectedReminderRows.length > 25, 'Reminder fixture spans several pages');
  assert.equal(find('ReminderTable').props.filteredParticipants.length, 25, 'Reminder table is paginated by the server response');
  assert.deepEqual(Array.from(find('ReminderTable').props.filteredParticipants, row => row.id), expectedReminderRows.slice(0, 25).map(row => row.id));
  assert(text(toolbar()).includes('Reset Filters'), 'Reminder status selection makes reset available');
  await button('Export Excel').props.onClick();
  const exportQuery = calls.filter(call => call.name === 'exportEventParticipants').at(-1).args[1];
  for (const [key, value] of Object.entries(selectedFilters)) assert.equal(exportQuery[key], value, 'Excel receives ' + key);
  assert.equal(writes.at(-1).sheet.rows.length, expectedReminderRows.length, 'Reminder export includes all matching rows, beyond the current page');
  assert.deepEqual(Array.from(writes.at(-1).sheet.rows, row => row.No), expectedReminderRows.map(row => row.id));

  const pic = await mountApprovalComponent('EventStatistics', { ...find('EventStatistics').props }, {
    getEventParticipantsSummaryByPic: { items: [], totalParticipants: expectedReminderRows.length, totalAssigned: 0, unassignedCount: expectedReminderRows.length },
  });
  await pic.act(pic.find(node => node.type === 'Dialog' && typeof node.props.onOpenChange === 'function').props.onOpenChange, true);
  const picQuery = pic.calls.filter(call => call.name === 'getEventParticipantsSummaryByPic').at(-1).args[1];
  for (const [key, value] of Object.entries(selectedFilters)) assert.equal(picQuery[key], value, 'PIC summary receives the page ' + key);
  const picQueryCount = pic.calls.length;
  await pic.updateProps({ participantFilters: { ...picQuery, reminderH3: 'confirm' } });
  assert(pic.calls.length > picQueryCount, 'An open PIC summary reloads when a Reminder filter changes');
  assert.equal(pic.calls.at(-1).args[1].reminderH3, 'confirm');

  find('ParticipantToolbar').props.handleResetFilters(); await settle();
  for (const stage of ['h7', 'h3', 'h1']) assert.equal(reminderSelect(stage).props.value, '', 'Reset clears ' + stage);
  reminderSelect('h7').props.onChange({ target: { value: 'not_respon_yet' } }); await settle();
  button('Pre-Event').props.onClick(); await settle();
  for (const stage of ['h7', 'h3', 'h1']) assert.equal(reminderSelect(stage), undefined, 'Reminder controls are hidden on Pre-Event');
  for (const key of Object.keys(selectedFilters)) assert.equal(calls.filter(call => call.name === 'getEventParticipantsByEvent').at(-1).args[1][key], undefined, 'Changing tabs clears ' + key);
  button('Reminder').props.onClick(); await settle();
  for (const stage of ['h7', 'h3', 'h1']) assert.equal(reminderSelect(stage).props.value, '', 'Returning to Reminder does not revive stale filters');
  reminderSelect('h1').props.onChange({ target: { value: 'not_respond_2x' } }); await settle();
  updateUrl('/dashboard/events?eventId=17&tab=reminder'); await settle();
  for (const stage of ['h7', 'h3', 'h1']) assert.equal(reminderSelect(stage).props.value, '', 'Changing events clears ' + stage);
  assert.equal(mutationCount(), beforeReminderFilters, 'Reading, filtering, pagination, export, reset and PIC summary never write participant status');
  assert.equal(pic.calls.filter(call => !call.name.startsWith('get')).length, 0, 'PIC filtering sends no writes');
}

async function mountApprovalComponent(name, initialProps, responses = {}) {
  const hooks = [], effects = [], calls = [], messages = [];
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
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
      hooks[index] = deps;
    },
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
  };
  React.useLayoutEffect = React.useEffect;
  React.useMemo = factory => factory();
  React.useCallback = callback => callback;
  const services = new Proxy({}, { get: (_, key) => async (...args) => {
    calls.push({ name: key, args });
    if (Object.hasOwn(responses, key)) return responses[key];
    if (key === 'getEventParticipantActivities') return [];
    return {};
  } });
  const dependencies = module => {
    if (module === 'react') return React;
    if (module === 'lucide-react') return {};
    if (module === 'sonner') return { toast: Object.fromEntries(['error', 'success', 'warning'].map(kind => [kind, message => messages.push({ kind, message })])) };
    if (module.endsWith('/context/AuthContext')) return { useAuth: () => ({ isAdmin: true, isManager: false, isUser: false }) };
    if (module.endsWith('/services/crmService')) return { crmService: services };
    if (module.endsWith('/utils/notesHelper')) return notes;
    if (module.endsWith('/utils/statusHelper')) return status;
    if (module.endsWith('/utils/columnConfigHelper')) return compile('app/dashboard/events/utils/columnConfigHelper.ts', unexpected);
    if (module.endsWith('/utils/phoneHelper')) return compile('app/dashboard/database/utils/phoneHelper.ts', unexpected);
    if (module.endsWith('/utils/emailInput')) return compile('app/dashboard/database/utils/emailInput.ts', name => {
      assert.equal(name, './emailCategory');
      return compile('app/dashboard/database/utils/emailCategory.ts', name => { assert.equal(name, '../../events/utils/notesHelper'); return notes; });
    });
    if (module.endsWith('/utils/companyBranch')) return compile('lib/utils/companyBranch.ts', unexpected);
    if (module === './EmsCompanyReviewNotice') return compile('app/dashboard/events/components/EmsCompanyReviewNotice.tsx', dependencies);
    if (module === './EventContactEditor') return { EventContactEditor: 'EventContactEditor' };
    if (module === './PicDailyReport') return { PicDailyReport: 'PicDailyReport' };
    if (module === './PicParticipantsPanel') return { PicParticipantsPanel: 'PicParticipantsPanel' };
    if (module.includes('/components/ui/')) return new Proxy({}, { get: (_, key) => key });
    return unexpected(module);
  };
  const Component = compile('app/dashboard/events/components/' + name + '.tsx', dependencies)[name];
  function render() {
    cursor = 0; changed = false; tree = Component(initialProps);
    if (typeof tree?.type === 'function' && tree.type.name === 'SyncContent') tree = tree.type(tree.props);
    while (effects.length) effects.shift()();
  }
  async function settle() {
    for (let i = 0; i < 30; i++) {
      await new Promise(setImmediate);
      if (changed) { render(); continue; }
      await new Promise(setImmediate);
      if (!changed) return;
    }
    throw Error(name + ' did not settle');
  }
  const find = predicate => { const node = nodes(tree).find(predicate); assert(node, name + ' control not found'); return node; };
  render(); await settle();
  return { calls, messages, find, settle, get content() { return text(tree); },
    has: predicate => nodes(tree).some(predicate),
    async act(handler, value) { await handler(value); await settle(); },
    async updateProps(next) { Object.assign(initialProps, next); render(); await settle(); },
  };
}

async function checkApprovalControls() {
  const event = { id: 17, emsEventId: 9, emsSource: 'V2', syncDestination: 'company', name: 'Anonymous EMS fixture' };
  const participant = { id: 7, event, approvalSource: 'ems', emsApprovalStatus: 'approve',
    database: { id: 7, firstName: 'Anonymous', lastName: 'Fixture', company: { name: 'Example' }, emails: [], isActive: true },
    participantStatus: 'registered', attendanceStatus: 'registered', confirmationStatus: 'decline',
    preEventApprovalStatus: 'pending', notes: '[PreEventApproval: pending] [Origin: EMS Sync]' };
  const writes = [];
  const tableProps = (p, activeTab = 'pre_event') => ({
    filteredParticipants: [p], selectedParticipantIds: [], setSelectedParticipantIds() {}, activeTab,
    checkDatabaseCompleteness: () => ({ isIncomplete: false, missingFields: [] }),
    handleToggleEngagement() {}, handleDirectUpdateParticipant: (...args) => writes.push(args),
    handleOpenUpdateParticipantModal() {}, openDeleteParticipantConfirm() {}, isUser: false, isAdmin: true,
    extractPicFromNotes: notes.extractPicFromNotes, getStatusBadgeStyle: () => '', getConfirmationStatusBadgeStyle: () => '',
  });
  const managed = await mountApprovalComponent('RequestPreEventTable', tableProps(participant));
  const preSelect = managed.find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Pre Event Approval'));
  assert.equal(preSelect.props.disabled, false); assert.equal(preSelect.props.value, 'pending');
  assert(!managed.content.includes('Dari EMS'));
  await managed.act(preSelect.props.onChange, { target: { value: 'approve' } });
  assert.equal(writes.length, 1, 'Manual Pre-Event editor emits its approval choice');
  assert.deepEqual(writes[0].slice(1), ['preEventApprovalStatus', 'approve']);
  await managed.updateProps({ filteredParticipants: [{ ...participant, emsApprovalStatus: 'pending', preEventApprovalStatus: 'approve' }] });
  assert.equal(managed.find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Pre Event Approval')).props.value, 'approve', 'Current manual choice wins over last-sync snapshot');
  await managed.updateProps({ filteredParticipants: [{ ...participant, emsApprovalStatus: 'pending', preEventApprovalStatus: 'pending' }] });
  assert.equal(managed.find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Pre Event Approval')).props.value, 'pending', 'Fresh sync response replaces the earlier manual choice');
  const partialApiRow = { ...participant, event: undefined, approvalSource: undefined };
  const eventScoped = await mountApprovalComponent('RequestPreEventTable', { ...tableProps(partialApiRow), emsApprovalManaged: true });
  const eventScopedSelect = eventScoped.find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Pre Event Approval'));
  assert.equal(eventScopedSelect.props.disabled, false); assert.equal(eventScopedSelect.props.value, 'pending');
  const viewer = await mountApprovalComponent('RequestPreEventTable', { ...tableProps(participant), isUser: true, isAdmin: false });
  assert(viewer.find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Pre Event Approval')).props.disabled, 'Existing viewer permissions remain unchanged');
  const declined = { ...participant, emsApprovalStatus: 'decline', preEventApprovalStatus: 'decline', confirmationStatus: 'approve' };
  const client = await mountApprovalComponent('RequestPreEventTable', tableProps(declined, 'request'));
  const clientSelect = client.find(node => node.type === 'select');
  assert.equal(clientSelect.props.value, 'approve', 'EMS decline does not masquerade as CRM Client Decline');
  const beforeClientEdit = writes.length;
  await client.act(clientSelect.props.onChange, { target: { value: 'pending' } });
  assert.equal(writes.length, beforeClientEdit + 1); assert.equal(writes.at(-1)[1], 'confirmationStatus', 'Client edit never resets Pre-Event approval');

  const manual = { ...participant, event: { id: 18 }, approvalSource: 'crm', preEventApprovalStatus: 'pending' };
  const manualTable = await mountApprovalComponent('RequestPreEventTable', tableProps(manual));
  const manualSelect = manualTable.find(node => node.type === 'select' && node.props['aria-label']?.startsWith('Pre Event Approval'));
  assert.equal(manualSelect.props.disabled, false);
  await manualTable.act(manualSelect.props.onChange, { target: { value: 'approve' } });
  assert.equal(writes.at(-1)[1], 'preEventApprovalStatus', 'Manual event still permits Pre-Event edits');

  const batchWrites = [];
  const batchProps = { selectedParticipantIds: [7], activeTab: 'pre_event', usersList: [], handleBatchUpdatePreEventApprovalStatus: value => batchWrites.push(value) };
  const batch = await mountApprovalComponent('BatchActionsBar', batchProps);
  const batchSelect = batch.find(node => node.type === 'select' && nodes(node).some(option => option.type === 'option' && option.props.value === 'approve'));
  await batch.act(batchSelect.props.onChange, { target: { value: 'decline' } });
  assert.deepEqual(batchWrites, ['decline'], 'Batch manual approval remains available');

  const submitted = [];
  const edit = await mountApprovalComponent('UpdateParticipantModal', {
    isOpen: true, activeParticipant: participant, activeTab: 'pre_event', usersList: [],
    onClose() {}, onSubmit: payload => submitted.push(payload), submittingParticipantUpdate: false,
    canEditContact: true, onContactUpdated() {},
  });
  const editApproval = edit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval');
  assert.equal(Boolean(editApproval.props.disabled), false);
  assert(!edit.content.includes('(EMS)'));
  await edit.act(editApproval.props.onChange, { target: { value: 'decline' } });
  await edit.act(edit.find(node => node.type === 'form').props.onSubmit, { preventDefault() {} });
  assert.equal(submitted[0].preEventApprovalStatus, 'decline');
  assert.equal(submitted[0].confirmationStatus, 'decline', 'Edit preserves the CRM decision');
  assert(edit.has(node => node.type === 'EventContactEditor'), 'Authorized editors can edit contact data separately');
  const modeEditor = edit.find(node => node.type === 'EventContactEditor');
  await edit.act(modeEditor.props.onEditingChange, true);
  assert.equal(edit.find(node => node.type === 'form' && node.props.id === 'participant-qualification-form').props.hidden, true, 'Qualification inputs are hidden while editing contact data');
  assert(!edit.has(node => node.type === 'button' && node.props.form === 'participant-qualification-form'), 'Qualification footer cannot distract from contact save');
  await edit.act(modeEditor.props.onEditingChange, false);
  assert.equal(edit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval').props.value, 'decline', 'Returning from contact editing preserves the qualification draft');
  await edit.updateProps({ activeParticipant: { ...participant, database: { ...participant.database, mobilePhone: '+6281200001111' } } });
  assert.equal(edit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval').props.value, 'decline', 'Saving contact data must not erase an unsaved qualification edit');
  const contactEditor = edit.find(node => node.type === 'EventContactEditor');
  await edit.act(contactEditor.props.onSavingChange, true);
  assert(edit.find(node => node.type === 'button' && node.props.form === 'participant-qualification-form').props.disabled, 'Contact writes cannot overlap qualification submit');
  await edit.act(contactEditor.props.onSavingChange, false);
  await edit.updateProps({ isOpen: false });
  await edit.updateProps({ activeParticipant: { ...participant, preEventApprovalStatus: 'approve', emsApprovalStatus: 'approve' } });
  await edit.updateProps({ isOpen: true });
  assert.equal(edit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval').props.value, 'approve', 'Reopened server state reflects sync overwrite');
  const manualEdit = await mountApprovalComponent('UpdateParticipantModal', {
    isOpen: true, activeParticipant: manual, activeTab: 'pre_event', usersList: [], onClose() {},
    onSubmit: payload => submitted.push(payload), submittingParticipantUpdate: false,
  });
  assert(!manualEdit.has(node => node.type === 'EventContactEditor'), 'Contact editing is hidden unless explicitly permitted');
  assert.equal(Boolean(manualEdit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval').props.disabled), false);
  await manualEdit.act(manualEdit.find(node => node.type === 'form').props.onSubmit, { preventDefault() {} });
  assert.equal(submitted.at(-1).preEventApprovalStatus, 'pending');

  const engagement = await mountApprovalComponent('EngagementModal', { isOpen: true, participant: { ...participant }, onClose() {} });
  assert(engagement.has(node => node.type === 'option' && node.props.value === 'preEventApproval'));
  assert(!engagement.content.includes('Pre (EMS)') && !engagement.content.includes(notes.SYNC_APPROVAL_HELP));
  assert(!engagement.find(node => node.type === 'button' && text(node).startsWith('Pre:')).props.disabled);
  const contactCard = await mountApprovalComponent('EngagementModal', { isOpen: true, participant: { ...participant, database: {
    ...participant.database, firstName: 'Complete', lastName: 'Contact Name', jobTitle: 'Long job title for calling without horizontal scrolling',
    mobilePhone: '441234567890, 081234567890', company: { id: 17, name: 'Full Synthetic Company Name', officePhone: '0215555000' },
    branch: { id: 18, companyId: 17, name: 'Branch', officePhone: '0215555111' },
    emails: [{ email: 'complete-contact@example.invalid' }, { email: 'second-contact@example.invalid, third-contact@campus.ac.id' }],
  } }, onClose() {} });
  for (const value of ['Complete Contact Name', 'Full Synthetic Company Name', 'Long job title for calling without horizontal scrolling', '441234567890, 081234567890', '0215555111', 'complete-contact@example.invalid', 'second-contact@example.invalid', 'third-contact@campus.ac.id']) assert(contactCard.content.includes(value), 'Activity contact card displays full ' + value);
  assert(!contactCard.content.includes('0215555000'), 'Assigned branch phone takes precedence over another company office');
  assert(!contactCard.has(node => node.type === 'dd' && /truncate|line-clamp|overflow-hidden/.test(node.props.className || '')), 'Contact values remain readable and are not clipped');
  const participantCard = await mountApprovalComponent('EngagementModal', { isOpen: true, participant: { ...participant, database: {
    ...participant.database, databaseDestination: 'participant', institutionName: 'Own Participant Campus', organizationOfficePhone: '0217777000',
    company: { id: 99, name: 'Stale Company Must Not Display' },
  } }, onClose() {} });
  assert(participantCard.content.includes('Own Participant Campus') && participantCard.content.includes('0217777000'));
  assert(!participantCard.content.includes('Stale Company Must Not Display'), 'Participant card uses its own institution fields');
  const outcomeSelect = engagement.find(node => node.type === 'select' && node.props.value === 'pending');
  await engagement.act(outcomeSelect.props.onChange, { target: { value: 'approve' } });
  await engagement.act(engagement.find(node => node.type === 'button' && text(node).includes('Simpan status')).props.onClick);
  assert.equal(engagement.calls.find(call => call.name === 'updatePreEventApprovalStatus').args[2], 'approve');
  const acceptedParticipant = { ...participant, emsApprovalStatus: 'approve', preEventApprovalStatus: 'approve' };
  const reminder = await mountApprovalComponent('EngagementModal', { isOpen: true, participant: acceptedParticipant, onClose() {} });
  await reminder.act(reminder.find(node => node.type === 'button' && text(node).includes('Simpan status')).props.onClick);
  const reminderWrite = reminder.calls.find(call => call.name === 'updateParticipantStatus');
  assert(reminderWrite); assert.equal(reminderWrite.args[16], undefined, 'Reminder does not auto-approve CRM Client Approval');
  assert.equal(acceptedParticipant.confirmationStatus, 'decline');
  const manualEngagement = await mountApprovalComponent('EngagementModal', { isOpen: true, participant: { ...manual }, onClose() {} });
  assert(manualEngagement.has(node => node.type === 'option' && node.props.value === 'preEventApproval'));
  await manualEngagement.act(manualEngagement.find(node => node.type === 'button' && text(node).includes('Simpan status')).props.onClick);
  assert.equal(manualEngagement.calls.filter(call => call.name === 'updatePreEventApprovalStatus').length, 1);

  const sync = await mountApprovalComponent('EmsSyncDialog', { isOpen: true, event, onClose() {}, onSynced: async () => {} });
  assert(sync.content.includes('Muat preview'), 'Sync starts with an explicit read-only preview step');

  const reviewParticipant = { ...participant, preEventApprovalStatus: 'approve',
    emsCompanyName: 'Registration company', emsCompanyReviewRequired: true,
    emsIdentityReviewMessage: 'Ada profil lama dengan HP sama; keputusan client perlu dicek.', emsClientDeclineReviewRequired: true };
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const realDialog = compile('components/ui/dialog.tsx', module => module === './utils'
    ? compile('components/ui/utils.ts', require)
    : require(module));
  const Notice = compile('app/dashboard/events/components/EmsCompanyReviewNotice.tsx', module => module === 'react' ? React
    : module.endsWith('/components/ui/dialog') ? realDialog : unexpected(module)).EmsCompanyReviewNotice;
  for (const [component, tab] of [['RequestPreEventTable', 'request'], ['RequestPreEventTable', 'pre_event'], ['ReminderTable', 'reminder'], ['ReminderDdayTable', 'reminder_dday']]) {
    const mounted = await mountApprovalComponent(component, tableProps(reviewParticipant, tab));
    const notice = mounted.find(node => node.type?.name === 'EmsCompanyReviewNotice');
    assert.equal(notice.props.crmCompanyName, 'Example', component + ' retains the CRM company');
    assert.equal(notice.props.emsCompanyName, 'Registration company');
    assert.equal(notice.props.identityReviewMessage, reviewParticipant.emsIdentityReviewMessage);
    assert.equal(notice.props.clientDeclineReviewRequired, true);
    const html = renderToStaticMarkup(React.createElement(Notice, notice.props));
    assert(html.includes('Tertahan') && html.includes('aria-label="Lihat detail peringatan"'), component + ' exposes a compact warning button');
    assert(html.includes('aria-haspopup="dialog"') && html.includes('aria-expanded="false"'), component + ' uses the real dialog trigger and starts closed');
    assert(!html.includes('Example') && !html.includes('Registration company') && !html.includes(reviewParticipant.emsIdentityReviewMessage), component + ' keeps full warning details out of the table row');
    assert(!html.includes('role="dialog"'), component + ' does not open a modal automatically');
    assert(!html.includes('Dari EMS') && !html.includes('Registrasi EMS:'));
  }
  assert.equal(renderToStaticMarkup(React.createElement(Notice, { companyReviewRequired: false })), '');
  assert.equal(renderToStaticMarkup(React.createElement(Notice, {})), '', 'Legacy rows need no notice');
  const identityOnlyHtml = renderToStaticMarkup(React.createElement(Notice, { identityReviewMessage: 'Nama lama berbeda.' }));
  assert(identityOnlyHtml.includes('Perlu review') && !identityOnlyHtml.includes('Nama lama berbeda.'), 'Identity review starts as a compact button with hidden details');
  const companyOnlyHtml = renderToStaticMarkup(React.createElement(Notice, { companyReviewRequired: true, crmCompanyName: 'Original company', emsCompanyName: 'New company' }));
  assert(companyOnlyHtml.includes('Perlu review') && !companyOnlyHtml.includes('Original company') && !companyOnlyHtml.includes('New company'), 'Company review also keeps details inside the closed dialog');
  const mountedNotice = await mountApprovalComponent('EmsCompanyReviewNotice', {
    companyReviewRequired: true, crmCompanyName: 'Example', emsCompanyName: 'Registration company',
    identityReviewMessage: reviewParticipant.emsIdentityReviewMessage, clientDeclineReviewRequired: true,
  });
  assert.equal(mountedNotice.find(node => node.type === 'button').props.type, 'button', 'Warning trigger never submits an enclosing form');
  assert(mountedNotice.has(node => node.type === 'DialogTrigger' && node.props.asChild), 'Warning uses the existing accessible dialog primitive');
  assert(mountedNotice.has(node => node.type === 'DialogTitle' && text(node) === 'Detail peringatan'), 'Opened dialog has a descriptive title');
  assert(mountedNotice.content.includes('Example') && mountedNotice.content.includes('Registration company')
    && mountedNotice.content.includes(reviewParticipant.emsIdentityReviewMessage), 'Dialog content retains the complete company and identity review details');
  assert(mountedNotice.content.includes('Review keputusan client') && mountedNotice.content.includes('Client Decline tetap berlaku.')
    && mountedNotice.content.includes('Pre-Event dan Reminder'), 'Dialog content explains the alias-decline veto');
  assert.equal(mountedNotice.calls.length, 0, 'Reading a warning never updates contacts or client decisions');
  const vetoedClient = { ...reviewParticipant, confirmationStatus: 'pending' };
  const vetoedDataList = await mountApprovalComponent('RequestPreEventTable', tableProps(vetoedClient, 'request'));
  assert.equal(vetoedDataList.find(node => node.type === 'select').props.value, 'pending', 'An alias Decline does not replace this profile\'s client decision');
  const reviewPreview = { destination: 'company', newCount: 0, existingCount: 1, rejectedCount: 0, companyReviewCount: 1, totalRows: 1,
    previewToken: 'local-review', rows: [{ rowNum: 1, name: 'Anonymous Fixture', email: 'local@example.test', status: 'EXISTING',
      message: 'Profil dipakai kembali.', companyReviewRequired: true, crmCompanyName: 'Example', emsCompanyName: 'Registration company',
      identityReviewMessage: 'Profil lama punya Client Decline.', clientDeclineReviewRequired: true }] };
  const previewDialog = await mountApprovalComponent('EmsSyncDialog', { isOpen: true, event, onClose() {}, onSynced: async () => {} }, { previewEmsParticipants: reviewPreview });
  await previewDialog.act(previewDialog.find(node => node.type === 'button' && text(node).includes('Muat ulang preview')).props.onClick);
  assert(previewDialog.content.includes('Perlu review'), 'Review filter exposes company and identity warnings');
  assert(previewDialog.content.includes('Registered berarti sudah daftar, belum tentu disetujui'), 'Loaded preview explains registration versus approval');
  assert(previewDialog.content.includes('Sinkronisasi berikutnya menimpa approval') && previewDialog.content.includes('Client Decline'));
  const previewNotice = previewDialog.find(node => node.type?.name === 'EmsCompanyReviewNotice');
  assert.equal(previewNotice.props.crmCompanyName, 'Example');
  assert.equal(previewNotice.props.emsCompanyName, 'Registration company');
  assert.equal(previewNotice.props.identityReviewMessage, 'Profil lama punya Client Decline.');
  assert.equal(previewNotice.props.clientDeclineReviewRequired, true);
  assert(previewDialog.content.includes('1 registrasi bisa disync tetapi tetap tertahan dari Pre-Event dan Reminder'), 'Preview separates successful registration sync from Reminder eligibility');
  assert.equal(Boolean(previewDialog.find(node => node.type === 'button' && text(node) === 'Konfirmasi sync 1 registrasi').props.disabled), false, 'Company review does not block eligible sync');
  assert.equal(previewDialog.calls.filter(call => call.name === 'syncEmsParticipants').length, 0, 'Opening and loading preview never applies sync');
  assert.equal(reviewParticipant.database.company.name, 'Example');
  assert.equal(reviewParticipant.confirmationStatus, 'decline', 'Company review never changes Client Approval');
}

(async () => {
  await checkService(); await checkPage(); await checkApprovalControls();
  for (const tab of ['request', 'pre_event', 'declined', 'reminder', 'reminder_dday']) {
    await checkPage('?eventId=40&tab=' + tab + '&view=keep#participants', tab);
  }
  await checkPage('?eventId=40&tab=invalid&view=keep#participants', 'request');
  await checkPage('?eventId=40&view=keep#participants', 'request');
  await checkPage('?id=40&tab=reminder_dday&view=keep#participants', 'reminder_dday');
  console.log('PASS: editable manual approval in table/edit/batch/engagement/page, current choice before next sync, fresh sync overwrite, no source badge/banner, Registered without approval, preserved Client Decline, Remarks scope and complete export.');
  console.log('PASS: all event-tab deep links, default/invalid tabs, preserved URL parameters, Back/Forward and a fresh event without a stale tab; navigation writes no business data.');
  console.log('PASS: Reminder H-7/H-3/H-1 controls, all six read/export query scopes, combined paginated filters, full export, live PIC summary refresh, reset and tab/event isolation without writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
