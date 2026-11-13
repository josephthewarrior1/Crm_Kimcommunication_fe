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

function mount({ savedDestination = null, failPreview = false, failSync = false, failRefresh = false, mismatch = false, previewOverride } = {}) {
  let index = 0, tree, closed = 0, refreshed = 0;
  const state = [], calls = [], messages = [];
  const hookReact = { ...React, useState(initial) {
    const cursor = index++;
    if (!(cursor in state)) state[cursor] = typeof initial === 'function' ? initial() : initial;
    return [state[cursor], value => { state[cursor] = typeof value === 'function' ? value(state[cursor]) : value; }];
  } };
  const event = { id: 7, name: 'Example Education Event', syncDestination: savedDestination };
  const preview = previewOverride || { destination: savedDestination || 'participant', totalRows: 3, newCount: 1, existingCount: 1, rejectedCount: 1, previewToken: 'example-token', rows: [
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
    '../utils/notesHelper': { SYNC_APPROVAL_HELP: 'Approval bisa diubah manual. Client Decline tetap menghalangi Reminder.' },
    './EmsCompanyReviewNotice': { EmsCompanyReviewNotice: () => null },
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
    async search(value) { this.find(node => node.type === 'input' && node.props['aria-label'] === 'Cari registrasi sync').props.onChange({ target: { value } }); render(); },
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
  assert.match(participant.html, /Tidak bisa disync/);
  assert(!participant.html.includes('student@campus.ac.id'), 'Rows that cannot sync are shown first');
  await participant.click('Semua');
  assert.match(participant.html, /student@campus.ac.id/);
  assert.match(participant.html, /existing@company.example/);
  assert.match(participant.html, /Tidak bisa disync/);
  assert(!participant.html.includes('kolom kontak akan diperbarui') && !participant.html.includes('profil kontak akan diperbarui'), 'Older previews without overwrite metadata remain readable without invented contact changes');
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

  const rows = Array.from({ length: 121 }, (_, index) => ({ rowNum: index + 1, name: 'Synthetic Contact ' + (index + 1),
    email: `contact-${index + 1}@example.invalid`, phone: '08120000' + String(index + 1).padStart(4, '0'),
    emsCompanyName: 'Incoming Company', status: 'EXISTING', emsStatus: 'ACCEPTED', emsApprovalStatus: 'approve',
    message: 'Existing contact may sync.', existingDatabaseId: index + 1000,
  }));
  const fullRejectedReason = 'Email belongs to Stored CRM Name. ' + 'Periksa pemilik email dan nomor HP di CRM serta EMS. '.repeat(12)
    + 'Lengkapi identitas yang benar, lalu muat ulang preview tanpa mengubah profil lain.';
  Object.assign(rows[0], { status: 'REJECTED', name: 'Incoming Conflict Name', message: fullRejectedReason,
    crmMatches: [{ databaseId: 88, name: 'Stored CRM Name', mobilePhone: '081244440001', companyName: 'Original Company', matchedBy: ['email'] }] });
  Object.assign(rows[1], { status: 'REJECTED', name: 'Approval Conflict', message: 'Registrations have different approval.',
    approvalConflictRows: [2, 3], approvalConflictStatuses: ['approve', 'pending'] });
  Object.assign(rows[109], { name: 'Review contact at row 110', companyReviewRequired: true });
  Object.assign(rows[6], { name: 'Own Client Decline', crmClientApprovalStatus: 'decline' });
  Object.assign(rows[120], { name: 'Beyond One Hundred', emsStatus: 'DECLINED', emsApprovalStatus: 'decline',
    crmMatches: [{ databaseId: 1120, name: 'Last Stored Person', mobilePhone: '441234567890', companyName: 'Searchable Saved Company', matchedBy: ['phone'] }] });
  const large = mount({ savedDestination: 'company', previewOverride: { destination: 'company', totalRows: 121,
    newCount: 0, existingCount: 119, rejectedCount: 2, companyReviewCount: 1, uniqueContactCount: 118,
    previewToken: 'large-preview-token', rows } });
  await large.click('Muat ulang preview');
  const rowViewport = () => large.find(node => node.props?.role === 'region' && node.props['aria-label'] === 'Rincian hasil sync');
  const rejectedViewKey = rowViewport().key;
  const rejectedRow = large.find(node => node.type === 'tr' && text(node).includes('Incoming Conflict Name'));
  assert(text(rejectedRow).includes(fullRejectedReason), 'A long rejected reason retains its complete beginning and repair instructions');
  assert(!nodes(rejectedRow).some(node => node.type === 'details' && text(node).includes(fullRejectedReason)), 'Rejected reasons are inline rather than hidden in a disclosure');
  assert(large.find(node => node.props?.className?.includes('max-w-[1440px]') && node.props.className.includes('h-[92dvh]')), 'Preview uses a large readable modal');
  for (const value of ['Incoming Conflict Name', 'Stored CRM Name', '081244440001', 'Original Company', 'ACCEPTED', 'Email belongs to Stored CRM Name.', 'Bandingkan baris', '#2', '#3', 'Approve', 'Pending']) assert(large.html.includes(value), 'Rejected row keeps complete comparison: ' + value);
  assert(!large.button('Konfirmasi sync 119').props.disabled, 'Rejected-row filter does not change whole-preview eligibility');
  assert.match(large.html, /118 profil kontak/, 'Registration count and unique contact count are distinguished');
  assert.equal(large.calls.filter(call => call.name === 'apply').length, 0, 'Preview/filter reads never apply sync');
  await large.click('Semua');
  assert.notEqual(rowViewport().key, rejectedViewKey, 'Changing the status filter resets the scrollable row view');
  const firstPageViewKey = rowViewport().key;
  assert.match(large.html, /Halaman 1 \/ 3/);
  assert(!large.html.includes('Synthetic Contact 51</p>'), 'First page contains at most fifty registration rows');
  await large.click('Next'); assert.match(large.html, /Halaman 2 \/ 3/);
  assert.notEqual(rowViewport().key, firstPageViewKey, 'Changing pages resets the row view to its beginning');
  await large.click('Next'); assert(large.html.includes('Beyond One Hundred'), 'Rows beyond the former hundred-row cap remain accessible');
  const lastPageViewKey = rowViewport().key;
  await large.search('  LAST STORED PERSON  ');
  assert.notEqual(rowViewport().key, lastPageViewKey, 'Searching resets the row view to the first matching participant');
  assert(large.html.includes('Beyond One Hundred') && large.html.includes('441234567890'), 'Search finds a CRM candidate on a row beyond one hundred');
  assert(large.html.includes('DECLINED') && large.html.includes('Siap disync'), 'Organizer Declined remains distinct from a sync rejection');
  assert(!large.html.includes('Incoming Conflict Name'), 'Search filters only visible rows');
  const nameSearchViewKey = rowViewport().key;
  await large.search('Searchable Saved Company'); assert(large.html.includes('Beyond One Hundred'));
  assert.notEqual(rowViewport().key, nameSearchViewKey, 'Changing the search also resets the view when both results occupy page one');
  await large.search('441234567890'); assert(large.html.includes('Beyond One Hundred'));
  await large.search('Own Client Decline');
  assert(large.html.includes('ACCEPTED') && large.html.includes('Client Approval:') && large.html.includes('Decline'), 'EMS Accepted and current Client Decline remain separate decisions');
  assert(large.html.includes('Tertahan dari Pre-Event dan Reminder'), 'An explicit Client Decline remains held even without an alias review flag');
  assert(!large.button('Konfirmasi sync 119').props.disabled, 'Holding Reminder eligibility does not discard the registration snapshot');
  await large.search('nothing-can-match-this'); assert.match(large.html, /Tidak ada registrasi yang sesuai filter/);
  await large.search(''); await large.click('Perlu review');
  assert(large.html.includes('Review contact at row 110') && large.html.includes('Own Client Decline') && !large.html.includes('Incoming Conflict Name'), 'Review filter includes company and explicit Client Decline across every row');
  await large.click('Konfirmasi sync 119');
  assert.deepEqual(plain(large.calls.find(call => call.name === 'apply')), { name: 'apply', id: 7, body: { previewToken: 'large-preview-token' } }, 'Filter/search never replace the preview confirmation token');
  assert(large.messages.some(message => message.kind === 'success' && message.message.includes('2 registrasi tidak disync')), 'Success message discloses skipped registrations');

  const contactUpdates = [
    { field: 'name', before: 'Ciwankcyril Ciwankcyril', after: 'Ciwank Cyril' },
    { field: 'jobTitle', before: 'Legacy Role', after: 'Current EMS Role' },
    { field: 'email', before: '', after: 'ciwank@example.invalid' },
  ];
  const retainedCiwank = { rowNum: 1, name: 'Ciwank Cyril', email: 'ciwank@example.invalid', phone: '081299900111',
    emsStatus: 'ACCEPTED', emsApprovalStatus: 'approve', status: 'EXISTING', existingDatabaseId: 321,
    message: 'Existing contact will use the current EMS values.', contactUpdates,
    crmMatches: [{ databaseId: 321, name: 'Ciwankcyril Ciwankcyril', mobilePhone: '+6281299900111', companyName: 'Original Company', matchedBy: ['phone'] }],
  };
  const overwritePreview = { destination: 'company', totalRows: 3, newCount: 0, existingCount: 2, rejectedCount: 1,
    uniqueContactCount: 1, contactUpdateCount: 1, previewToken: 'contact-overwrite-token', rows: [retainedCiwank,
      { ...retainedCiwank, rowNum: 2 },
      { rowNum: 3, name: 'Rejected shared identity', email: 'shared@example.invalid', status: 'REJECTED', message: 'Ambiguous identity remains held.',
        contactUpdates: [{ field: 'name', before: 'Rejected Before Sentinel', after: 'Rejected After Sentinel' }] },
    ],
  };
  const overwrite = mount({ savedDestination: 'company', previewOverride: overwritePreview });
  await overwrite.click('Muat ulang preview');
  assert(!overwrite.html.includes('Rejected Before Sentinel') && !overwrite.html.includes('Rejected After Sentinel'), 'Rejected rows never present proposed contact writes as an allowed overwrite');
  await overwrite.click('Sudah ada');
  for (const value of ['Ciwankcyril Ciwankcyril', 'Ciwank Cyril', 'Legacy Role', 'Current EMS Role', 'Nama lengkap', 'Belum diisi', 'Setelah sync:', 'Profil dipakai', 'Profil #321', 'Kontak mengikuti EMS']) assert(overwrite.html.includes(value), 'Contact overwrite preview discloses old and new values on the existing profile: ' + value);
  assert.match(overwrite.html, /1 profil kontak akan diperbarui/, 'Backend unique-contact count is not recounted from duplicate registration rows');
  const disclosure = overwrite.find(node => node.type === 'details' && text(node).includes('kolom kontak akan diperbarui'));
  assert(disclosure.props.children.some(node => node.type === 'summary'), 'Old-to-new changes use a native disclosure');
  assert.equal(disclosure.props.onToggle, undefined, 'Native contact-change disclosure has no mutation handler');
  await overwrite.search('  LEGACY ROLE  '); assert(overwrite.html.includes('Ciwank Cyril'), 'Search includes previous CRM field values');
  await overwrite.search('CURRENT EMS ROLE'); assert(overwrite.html.includes('Ciwankcyril Ciwankcyril'), 'Search includes incoming EMS field values');
  assert.deepEqual(plain(overwrite.calls.map(call => call.name)), ['preview'], 'Filtering, searching and inspecting overwrite changes perform no sync');
  assert(!overwrite.button('Konfirmasi sync 2').props.disabled, 'Visible overwrite rows do not change full-preview confirmation count');
  await overwrite.click('Konfirmasi sync 2');
  assert.deepEqual(plain(overwrite.calls.find(call => call.name === 'apply')), { name: 'apply', id: 7, body: { previewToken: 'contact-overwrite-token' } }, 'Contact overwrite confirmation uses the exact reviewed token without implicit flags or extra writes');
  const staleOverwrite = mount({ savedDestination: 'company', previewOverride: overwritePreview, failSync: true });
  await staleOverwrite.click('Muat ulang preview'); await staleOverwrite.click('Konfirmasi sync 2');
  assert(staleOverwrite.button('Konfirmasi sync').props.disabled && staleOverwrite.closed === 0, 'A stale contact overwrite requires a new preview and keeps the dialog open');
  assert(!staleOverwrite.html.includes('kolom kontak akan diperbarui'), 'Rejected stale confirmation clears its old contact-change disclosure');
  const stats = fs.readFileSync('app/dashboard/events/components/EventStatistics.tsx', 'utf8');
  assert(!stats.includes('syncEmsParticipants'), 'PIC assignment must not implicitly import EMS data');
  console.log('EMS destination UI checks passed: large preview, current contact changes, unique-profile counts, no implicit writes, confirmation token and stale/error recovery. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
