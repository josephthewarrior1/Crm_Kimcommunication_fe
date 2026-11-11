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
    if (module.endsWith('/utils/companyBranch')) return compile('lib/utils/companyBranch.ts', unexpected);
    if (module === './EmsCompanyReviewNotice') return compile('app/dashboard/events/components/EmsCompanyReviewNotice.tsx', dependencies);
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
  });
  const editApproval = edit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval');
  assert.equal(Boolean(editApproval.props.disabled), false);
  assert(!edit.content.includes('(EMS)'));
  await edit.act(editApproval.props.onChange, { target: { value: 'decline' } });
  await edit.act(edit.find(node => node.type === 'form').props.onSubmit, { preventDefault() {} });
  assert.equal(submitted[0].preEventApprovalStatus, 'decline');
  assert.equal(submitted[0].confirmationStatus, 'decline', 'Edit preserves the CRM decision');
  await edit.updateProps({ activeParticipant: { ...participant, preEventApprovalStatus: 'approve', emsApprovalStatus: 'approve' } });
  assert.equal(edit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval').props.value, 'approve', 'Reopened server state reflects sync overwrite');
  const manualEdit = await mountApprovalComponent('UpdateParticipantModal', {
    isOpen: true, activeParticipant: manual, activeTab: 'pre_event', usersList: [], onClose() {},
    onSubmit: payload => submitted.push(payload), submittingParticipantUpdate: false,
  });
  assert.equal(Boolean(manualEdit.find(node => node.type === 'select' && node.props['aria-label'] === 'Pre Event Approval').props.disabled), false);
  await manualEdit.act(manualEdit.find(node => node.type === 'form').props.onSubmit, { preventDefault() {} });
  assert.equal(submitted.at(-1).preEventApprovalStatus, 'pending');

  const engagement = await mountApprovalComponent('EngagementModal', { isOpen: true, participant: { ...participant }, onClose() {} });
  assert(engagement.has(node => node.type === 'option' && node.props.value === 'preEventApproval'));
  assert(!engagement.content.includes('Pre (EMS)') && !engagement.content.includes(notes.SYNC_APPROVAL_HELP));
  assert(!engagement.find(node => node.type === 'button' && text(node).startsWith('Pre:')).props.disabled);
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
  assert(sync.content.includes('Registered berarti sudah daftar, belum tentu disetujui'));
  assert(sync.content.includes('Sinkronisasi berikutnya menimpa approval') && sync.content.includes('Client Decline'));

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
  assert(previewDialog.content.includes('Perusahaan perlu dicek 1') || previewDialog.content.includes('Perusahaan perlu dicek1'));
  const previewNotice = previewDialog.find(node => node.type?.name === 'EmsCompanyReviewNotice');
  assert.equal(previewNotice.props.crmCompanyName, 'Example');
  assert.equal(previewNotice.props.emsCompanyName, 'Registration company');
  assert.equal(previewNotice.props.identityReviewMessage, 'Profil lama punya Client Decline.');
  assert.equal(previewNotice.props.clientDeclineReviewRequired, true);
  assert(previewDialog.content.includes('1 registrasi tetap tertahan dari Reminder untuk review keputusan client.'), 'Preview separates successful registration sync from Reminder eligibility');
  assert.equal(Boolean(previewDialog.find(node => node.type === 'button' && text(node) === 'Konfirmasi sync 1 registrasi').props.disabled), false, 'Company review does not block eligible sync');
  assert.equal(previewDialog.calls.filter(call => call.name === 'syncEmsParticipants').length, 0, 'Opening and loading preview never applies sync');
  assert.equal(reviewParticipant.database.company.name, 'Example');
  assert.equal(reviewParticipant.confirmationStatus, 'decline', 'Company review never changes Client Approval');
}

(async () => {
  await checkService(); await checkPage(); await checkApprovalControls();
  console.log('PASS: editable manual approval in table/edit/batch/engagement/page, current choice before next sync, fresh sync overwrite, no source badge/banner, Registered without approval, preserved Client Decline, Remarks scope and complete export.');
})().catch(error => { console.error(error); process.exitCode = 1; });
