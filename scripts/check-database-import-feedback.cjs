// Run: node scripts/check-database-import-feedback.cjs. Anonymous workbook; all API calls are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { File } = require('node:buffer');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const XLSX = require('xlsx');

const project = path.resolve(__dirname, '..');
function compile(file, requireModule, globals = {}) {
  const sandbox = { exports: {}, require: requireModule, console, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(project, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, sandbox, { filename: file });
  return sandbox.exports;
}
const resultHelper = compile('lib/utils/databaseImportResult.ts');
const children = node => [node?.props?.children].flat(Infinity);
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const headers = ['No', 'Nama Group/Holding Company', 'Nama Brand', 'Company Name', 'Salutation', 'First Name', 'Last Name', 'Position', 'Division', 'Jobtitle', 'Address', 'Office Phone', 'Mobile Phone', 'Company Email Address', 'Personal Email Address', 'Industry', 'Company Size (Revenue)', 'Company Size (Employee)', 'Company Hardware', 'Linkedin Link', 'City', 'Postal Code', 'Company Website'];
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, [1, 'Example group', 'Example brand', 'Example company', 'Mr', 'Alex', 'Example']]), 'Database');
const file = new File([XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })], 'anonymous-database.xlsx');
const valid = { count: 2, newCount: 1, updatedCount: 1, totalRows: 3, skippedCount: 1,
  skippedRows: [{ rowNum: 4, firstName: 'Alex', lastName: 'Example', companyName: 'Example company', status: 'INCOMPLETE', message: 'Missing position | Missing email' }] };

// Exercise the real page refresh callbacks without mounting unrelated dashboard controls.
function parentRefresh(failingEndpoint) {
  const source = fs.readFileSync(path.join(project, 'app/dashboard/database/page.tsx'), 'utf8');
  const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = {};
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ['loadDatabasePage', 'loadDatabaseFilterOptions', 'refreshDatabasePage'].includes(node.name.getText(parsed))) {
      const expression = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
      callbacks[node.name.getText(parsed)] = expression.getText(parsed);
    }
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(parsed) === 'ExcelImportModal') {
      callbacks.onImportSuccess = node.attributes.properties.find(attribute => attribute.name?.getText(parsed) === 'onImportSuccess').initializer.expression.getText(parsed);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(Object.keys(callbacks).length, 4, 'Parent refresh callbacks must be found');
  const sandbox = { exports: {}, AbortController,
    databaseRequestId: { current: 0 }, databaseRequest: { current: null },
    filterOptionsRequestId: { current: 0 }, filterOptionsRequest: { current: null },
    searchQuery: '', filterGroupId: '', filterCompanyId: '', filterBranchId: '', filterPositionLevel: '', filterIndustry: '', filterCity: '',
    activeTabFilter: 'all', destination: 'company', sortBy: 'id', sortOrder: 'asc', currentPage: 1, itemsPerPage: 10,
    crmService: {
      getDatabasesList: async () => { if (failingEndpoint === 'list') throw new Error('Fixture list refresh failed'); return { items: [] }; },
      getDatabaseFilterOptions: async () => { if (failingEndpoint === 'filters') throw new Error('Fixture filters refresh failed'); return {}; },
      getFlaggedIdentities: async () => [],
    },
    toast: { error() {} },
  };
  for (const setter of ['setLoading', 'setDatabases', 'setServerTotalItems', 'setServerTotalPages', 'setDatabaseSummary', 'setDestinationCounts', 'setDatabaseAnalytics', 'setFilterOptionsError', 'setDatabaseFilterOptions', 'setFlags']) sandbox[setter] = () => {};
  const code = Object.entries(callbacks).map(([name, callback]) => `const ${name} = ${callback};`).join('\n')
    + '\nexports.callbacks = { loadDatabasePage, loadDatabaseFilterOptions, refreshDatabasePage, onImportSuccess };';
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return sandbox.exports.callbacks;
}

async function mount(response, { rejectImport = false, rejectRefresh = false, importWait, refreshWait, refreshCallback, destination = 'company', inputFile = file, previewRows } = {}) {
  const hooks = [], effects = [], calls = [], messages = [];
  let cursor = 0, changed = false, tree, closed = 0, refreshed = 0;
  let clock = 0, timeoutId = 0;
  const timeouts = new Map();
  const fakeTimeout = (callback, delay = 0) => {
    const id = ++timeoutId;
    timeouts.set(id, { callback, due: clock + delay });
    if (delay < 1000) queueMicrotask(() => {
      if (timeouts.delete(id)) callback();
    });
    return id;
  };
  const hookReact = {
    ...React,
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
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        const record = { deps };
        effects.push(() => { previous?.cleanup?.(); record.cleanup = effect(); });
        hooks[index] = record;
      }
    },
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
    useMemo(factory, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) hooks[index] = { value: factory(), deps };
      return hooks[index].value;
    },
  };
  const service = {
    previewDatabasesExcel: async (selected, target) => {
      assert.equal(selected, inputFile); assert.equal(target, destination); calls.push('preview');
      return { destination, rows: previewRows || [{ rowNum: 2, status: 'NEW' }, { rowNum: 3, status: 'DUPLICATE' }, { rowNum: 4, status: 'INCOMPLETE', message: 'Missing position' }] };
    },
    importDatabasesExcel: async (selected, target) => {
      assert.equal(selected, inputFile); assert.equal(target, destination); calls.push('import');
      if (importWait) await importWait;
      if (rejectImport) throw new Error('Server menolak fixture');
      return response;
    },
  };
  const modules = {
    react: hookReact, xlsx: XLSX,
    'lucide-react': Object.fromEntries(['X', 'Loader2', 'Upload', 'Download', 'AlertCircle', 'RefreshCw', 'AlertTriangle', 'CheckCircle2', 'Search', 'Filter'].map(name => [name, () => null])),
    '../../../../lib/services/crmService': { crmService: service },
    '../../../../lib/utils/databaseImportResult': resultHelper,
    '../../../../lib/services/auditLogService': { auditLogService: { recordLog: async () => calls.push('audit') } },
    '../../../../lib/context/AuthContext': { useAuth: () => ({ user: { id: 1, username: 'fixture', fullName: 'Anonymous fixture', roles: ['ADMIN'] } }) },
    sonner: { toast: Object.fromEntries(['error', 'warning', 'success'].map(kind => [kind, (message, options) => messages.push({ kind, message, options })])) },
    './DatabaseImportGuide': { DatabaseImportGuide: () => null },
  };
  const { ExcelImportModal } = compile('app/dashboard/database/components/ExcelImportModal.tsx', name => {
    assert(name in modules, 'Unexpected component dependency: ' + name); return modules[name];
  }, { setInterval: () => 1, clearInterval() {}, setTimeout: fakeTimeout, clearTimeout: id => timeouts.delete(id) });
  function render() {
    cursor = 0; changed = false;
    tree = ExcelImportModal({ isOpen: true, initialDestination: destination, onClose: () => closed++, onImportSuccess: async () => {
      refreshed++; if (rejectRefresh) throw new Error('Refresh fixture failed');
      const wait = typeof refreshWait === 'function' ? refreshWait(refreshed) : refreshWait;
      if (wait) await wait;
      if (refreshCallback) await refreshCallback();
    } });
    while (effects.length) effects.shift()();
  }
  async function settle() {
    for (let i = 0; i < 12; i++) {
      await new Promise(setImmediate);
      if (!changed) return;
      render();
    }
    throw new Error('Import component state did not settle');
  }
  const find = predicate => { const result = nodes(tree).find(predicate); assert(result, 'Import control not found'); return result; };
  async function preview() {
    find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [inputFile] } });
    render(); await settle();
    await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await settle();
    assert(text(tree).includes('Hasil Analisis & Preview Excel'));
  }
  render(); await settle(); await preview();
  messages.length = 0;
  const startImport = () => find(node => node.type === 'button' && /^Import \d+ (?:Data Bersih|Peserta)$/.test(text(node))).props.onClick({ preventDefault() {} });
  return {
    calls, messages, find, settle, startImport, preview,
    has: predicate => nodes(tree).some(predicate),
    get closed() { return closed; }, get refreshed() { return refreshed; },
    get content() { return text(tree); },
    get html() { return renderToStaticMarkup(tree); }, // Real React rejects invalid object children.
    async advanceTimers(milliseconds) {
      clock += milliseconds;
      for (const [id, timer] of timeouts) {
        if (timer.due <= clock && timeouts.delete(id)) timer.callback();
      }
      await settle();
    },
    async import() {
      await startImport();
      await settle();
      assert.doesNotThrow(() => renderToStaticMarkup(tree), 'Import response must never blank the page');
    },
    async changeDestination(value) {
      find(node => node.type === 'select' && node.props.id === 'database-import-destination').props.onChange({ target: { value } });
      render(); await settle();
    },
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

(async () => {
  const participantWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(participantWorkbook, XLSX.utils.aoa_to_sheet([
    ['No', 'First Name', 'Last Name', 'Email', 'Mobile Phone', 'Kategori Peserta', 'Sekolah/Kampus/Instansi'],
    [1, 'Student', '', 'student@campus.ac.id', '', 'mahasiswa', 'Example Campus'],
  ]), 'Peserta');
  const participantFile = new File([XLSX.write(participantWorkbook, { type: 'buffer', bookType: 'xlsx' })], 'anonymous-participant.xlsx');
  const participant = await mount(valid, { destination: 'participant', inputFile: participantFile });
  assert(participant.content.includes('Tujuan: Database Peserta'));
  await participant.import();
  assert.equal(participant.calls.filter(call => call === 'import').length, 1);
  const sparseWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(sparseWorkbook, XLSX.utils.aoa_to_sheet([
    ['Email', 'Mobile Phone'], ['', '081200001111, 081300002222'], ['unnamed@campus.ac.id', ''],
  ]), 'Peserta');
  const sparseFile = new File([XLSX.write(sparseWorkbook, { type: 'buffer', bookType: 'xlsx' })], 'anonymous-sparse-participant.xlsx');
  const sparse = await mount({ count: 2, newCount: 2, updatedCount: 0, skippedCount: 0, totalRows: 2 }, {
    destination: 'participant', inputFile: sparseFile, previewRows: [
      { rowNum: 2, status: 'NEW', firstName: '', mobilePhone: '081200001111, 081300002222', message: 'Nama belum diisi; boleh disimpan sebagai Data Kotor.' },
      { rowNum: 3, status: 'NEW', firstName: '', email: 'unnamed@campus.ac.id', message: 'Nama belum diisi; boleh disimpan sebagai Data Kotor.' },
    ],
  });
  assert(sparse.content.includes('Nama kosong tetap boleh diimport sebagai Data Kotor'));
  assert(sparse.content.includes('081200001111, 081300002222'));
  assert(sparse.has(node => node.type === 'button' && text(node) === 'Import 2 Peserta' && !node.props.disabled));
  await sparse.import(); assert.equal(sparse.calls.filter(call => call === 'import').length, 1, 'Nameless email-only and phone-only participant rows remain importable');
  const changedTarget = await mount(valid);
  await changedTarget.changeDestination('participant');
  assert(!changedTarget.content.includes('Hasil Analisis & Preview Excel'), 'Changing destination invalidates the previous preview');
  assert(!changedTarget.has(node => node.type === 'button' && /^Import \d+ (?:Data Bersih|Peserta)$/.test(text(node))));
  assert.equal(changedTarget.calls.filter(call => call === 'import').length, 0);
  const success = await mount(valid);
  const modal = harness => harness.find(node => node.props?.className?.startsWith('ms-modal w-full'));
  assert(modal(success).props.className.includes('h-[92dvh]'), 'Preview keeps its table-sized layout');
  await success.import();
  assert(!modal(success).props.className.includes('h-[92dvh]'), 'Success result uses a compact dialog');
  assert(success.content.includes('Upload Excel Berhasil'));
  assert(success.content.includes('2 baris berhasil diproses: 1 baru, 1 update. 1 baris dilewati.'));
  assert(success.content.includes('#4') && success.content.includes('Missing position') && success.content.includes('Missing email'));
  assert(success.find(node => node.props?.['aria-label'] === 'Hasil import'));
  assert(success.messages.some(message => message.kind === 'success' && message.options.description.includes('1 kontak baru, 1 diperbarui, 1 baris dilewati')));
  assert.equal(success.refreshed, 1); assert.equal(success.closed, 0);

  const pendingResponse = deferred();
  const pendingUpload = await mount(valid, { importWait: pendingResponse.promise });
  const submit = pendingUpload.find(node => node.type === 'button' && /^Import \d+ Data Bersih$/.test(text(node))).props.onClick;
  const submitted = submit({ preventDefault() {} });
  const duplicateSubmit = submit({ preventDefault() {} }); // Same render: React has not yet committed disabled=true.
  await pendingUpload.settle();
  assert.equal(pendingUpload.calls.filter(call => call === 'import').length, 1, 'Rapid double submit sends only one POST');
  assert(!pendingUpload.content.includes('Upload Excel Berhasil'), 'No success is shown before the server confirms the upload');
  assert(!pendingUpload.messages.some(message => message.kind === 'success'));
  assert.equal(pendingUpload.refreshed, 0);
  const pendingClose = pendingUpload.find(node => node.type === 'button' && node.props['aria-label'] === 'Tutup import Excel');
  pendingClose.props.onClick(); await pendingUpload.settle();
  assert.equal(pendingUpload.closed, 0, 'An active upload cannot be closed or mistaken for a finished one');
  pendingResponse.resolve(); await Promise.all([submitted, duplicateSubmit]); await pendingUpload.settle();
  assert(pendingUpload.content.includes('Upload Excel Berhasil'));

  const bulkWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(bulkWorkbook, XLSX.utils.aoa_to_sheet([headers,
    ...Array.from({ length: 400 }, (_, index) => [index + 1, 'Example group', 'Example brand', 'Example company', 'Mr', 'Bulk', `Example ${index + 1}`]),
  ]), 'Database');
  const bulkFile = new File([XLSX.write(bulkWorkbook, { type: 'buffer', bookType: 'xlsx' })], 'anonymous-400-contacts.xlsx');
  const bulkRows = Array.from({ length: 400 }, (_, index) => ({ rowNum: index + 2, status: 'NEW', firstName: 'Bulk', lastName: `Example ${index + 1}` }));
  const bulkResult = { count: 400, newCount: 397, updatedCount: 3, skippedCount: 0, totalRows: 400 };
  const neverRefresh = deferred();
  const pendingRefresh = await mount(bulkResult, { refreshWait: neverRefresh.promise, inputFile: bulkFile, previewRows: bulkRows });
  let importFinished = false;
  void pendingRefresh.startImport().then(() => { importFinished = true; });
  await pendingRefresh.settle();
  assert.equal(importFinished, true, 'The upload handler finishes even if the list refresh never resolves');
  assert.equal(pendingRefresh.refreshed, 1);
  assert(pendingRefresh.content.includes('Upload Excel Berhasil'));
  assert(pendingRefresh.content.includes('400 baris berhasil diproses: 397 baru, 3 update.'), 'The confirmed 400-row summary stays visible');
  assert(pendingRefresh.content.includes('Memperbarui daftar Database'), 'Refresh has its own pending state after upload success');
  for (const label of ['Upload File Lain', 'Lihat Database']) {
    assert.equal(pendingRefresh.find(node => node.type === 'button' && text(node) === label).props.disabled, false, `${label} remains available during refresh`);
  }
  assert(!pendingRefresh.find(node => node.type === 'button' && node.props['aria-label'] === 'Tutup import Excel').props.disabled);
  assert(!pendingRefresh.has(node => node.type === 'button' && /^Import \d+ (?:Data Bersih|Peserta)$/.test(text(node))), 'A confirmed result cannot accidentally resubmit the same file');
  assert.equal(pendingRefresh.calls.filter(call => call === 'import').length, 1);
  await pendingRefresh.advanceTimers(14999);
  assert(!pendingRefresh.content.includes('tidak perlu mengupload file yang sama lagi'), 'Slow refresh warning waits for the soft timeout');
  await pendingRefresh.advanceTimers(1);
  assert(pendingRefresh.content.includes('Upload sudah selesai') && pendingRefresh.content.includes('tidak perlu mengupload file yang sama lagi'), 'A 15-second refresh timeout never claims the upload failed');
  assert(pendingRefresh.content.includes('400 baris berhasil diproses: 397 baru, 3 update.'));
  assert(!pendingRefresh.messages.some(message => message.kind === 'error'));
  assert.equal(pendingRefresh.calls.filter(call => call === 'import').length, 1);
  assert.doesNotThrow(() => pendingRefresh.html);

  const closedRefresh = deferred();
  const closedResult = await mount(valid, { refreshWait: closedRefresh.promise });
  await closedResult.import();
  closedResult.find(node => node.type === 'button' && node.props['aria-label'] === 'Tutup import Excel').props.onClick();
  await closedResult.settle();
  assert.equal(closedResult.closed, 1, 'Closing is allowed once the server confirms the upload');
  await closedResult.advanceTimers(15000);
  closedRefresh.reject(new Error('Late failure from the closed result')); await closedResult.settle();
  assert(!closedResult.content.includes('Upload sudah selesai,'), 'A closed result does not receive a stale refresh warning');

  const oldRefresh = deferred(), currentRefresh = deferred();
  const newAttempt = await mount(valid, { refreshWait: attempt => attempt === 1 ? oldRefresh.promise : currentRefresh.promise });
  await newAttempt.import();
  await newAttempt.advanceTimers(5000);
  newAttempt.find(node => node.type === 'button' && text(node) === 'Upload File Lain').props.onClick();
  await newAttempt.settle();
  assert(!newAttempt.content.includes('Upload Excel Berhasil'), 'Reset clears the previous confirmed result');
  await newAttempt.preview(); await newAttempt.import();
  assert.equal(newAttempt.refreshed, 2);
  await newAttempt.advanceTimers(10000);
  assert(!newAttempt.content.includes('Upload sudah selesai,'), 'Reset cancels the previous refresh timeout');
  oldRefresh.reject(new Error('Late failure from the previous attempt')); await newAttempt.settle();
  assert(!newAttempt.content.includes('Upload sudah selesai,'), 'An old refresh failure cannot add a warning to a newer import');
  assert(newAttempt.content.includes('Memperbarui daftar Database'), 'An old refresh completion cannot clear the newer refresh state');
  currentRefresh.resolve(); await newAttempt.settle();
  assert(!newAttempt.content.includes('Memperbarui daftar Database'));
  assert(!newAttempt.content.includes('Upload sudah selesai,'));
  assert.equal(newAttempt.calls.filter(call => call === 'import').length, 2, 'Only the two intentionally confirmed attempts send a POST');

  const zero = await mount({ count: 0, newCount: 0, updatedCount: 0, totalRows: 3, skippedCount: 3 });
  await zero.import();
  assert(zero.content.includes('Tidak Ada Data yang Diproses'));
  assert(!zero.content.includes('Upload Excel Berhasil'));
  assert(zero.messages.some(message => message.kind === 'warning'));
  assert(!zero.messages.some(message => message.kind === 'success'));

  for (const message of [undefined, null, { invalid: 'object' }]) {
    const optional = await mount({ ...valid, skippedRows: [{ rowNum: 4, message, firstName: { invalid: true }, lastName: null }] });
    await optional.import();
    assert(optional.content.includes('Upload Excel Berhasil') && optional.content.includes('Alasan baris dilewati tidak tersedia.'));
    assert(!optional.html.includes('[object Object]'));
  }
  for (const skippedRows of [undefined, null]) {
    const optional = await mount({ ...valid, skippedRows }); await optional.import();
    assert(optional.content.includes('Upload Excel Berhasil'));
    assert(optional.content.includes('Sebagian rincian baris yang dilewati tidak tersedia'));
  }

  const malformed = [null, { ...valid, count: { invalid: true } }, { ...valid, newCount: '1' },
    { ...valid, updatedCount: null }, { ...valid, totalRows: -1 }, { ...valid, skippedCount: NaN },
    { ...valid, count: 1.5 }, { ...valid, newCount: 2 }, { ...valid, skippedRows: [null] }];
  for (const response of malformed) {
    const bad = await mount(response); await bad.import();
    assert(!bad.content.includes('Upload Excel Berhasil'));
    assert(bad.content.includes('Hasil Analisis & Preview Excel'));
    assert(bad.content.includes('Periksa daftar Database sebelum mengupload file yang sama lagi'));
    assert(!bad.messages.some(message => message.kind === 'success'));
    assert.equal(bad.refreshed, 0);
  }

  const refresh = await mount(valid, { rejectRefresh: true }); await refresh.import();
  assert(refresh.content.includes('Upload Excel Berhasil'));
  assert(refresh.content.includes('Upload sudah selesai, tetapi daftar Database belum berhasil diperbarui'));
  assert(refresh.messages.some(message => message.kind === 'success'));
  assert.equal(refresh.calls.filter(call => call === 'import').length, 1);

  for (const endpoint of ['list', 'filters']) {
    const parent = parentRefresh(endpoint);
    await assert.doesNotReject(() => parent.refreshDatabasePage(), 'Ordinary refresh callers retain their existing error handling');
    await assert.rejects(() => parent.onImportSuccess(), /refresh failed/, 'Actual import parent callback propagates strict loader errors');
    const integrated = await mount(valid, { refreshCallback: parent.onImportSuccess }); await integrated.import();
    assert(integrated.content.includes('Upload Excel Berhasil'));
    assert(integrated.content.includes('Upload sudah selesai, tetapi daftar Database belum berhasil diperbarui'));
    assert.equal(integrated.calls.filter(call => call === 'import').length, 1);
  }

  const rejected = await mount(valid, { rejectImport: true }); await rejected.import();
  assert(rejected.content.includes('Hasil Analisis & Preview Excel') && rejected.content.includes('Server menolak fixture'));
  assert(!rejected.content.includes('Upload Excel Berhasil'));
  assert(!rejected.messages.some(message => message.kind === 'success'));
  assert.equal(rejected.refreshed, 0);
  console.log('Database import feedback checks passed: 400-row success without waiting for refresh, no early success or duplicate POST, 15-second soft warning, stale refresh invalidation, skipped rows, malformed results and API rejection. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
