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
    activeTabFilter: 'all', sortBy: 'id', sortOrder: 'asc', currentPage: 1, itemsPerPage: 10,
    crmService: {
      getDatabasesList: async () => { if (failingEndpoint === 'list') throw new Error('Fixture list refresh failed'); return { items: [] }; },
      getDatabaseFilterOptions: async () => { if (failingEndpoint === 'filters') throw new Error('Fixture filters refresh failed'); return {}; },
      getFlaggedIdentities: async () => [],
    },
    toast: { error() {} },
  };
  for (const setter of ['setLoading', 'setDatabases', 'setServerTotalItems', 'setServerTotalPages', 'setDatabaseSummary', 'setDatabaseAnalytics', 'setFilterOptionsError', 'setDatabaseFilterOptions', 'setFlags']) sandbox[setter] = () => {};
  const code = Object.entries(callbacks).map(([name, callback]) => `const ${name} = ${callback};`).join('\n')
    + '\nexports.callbacks = { loadDatabasePage, loadDatabaseFilterOptions, refreshDatabasePage, onImportSuccess };';
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return sandbox.exports.callbacks;
}

async function mount(response, { rejectImport = false, rejectRefresh = false, refreshWait, refreshCallback } = {}) {
  const hooks = [], effects = [], calls = [], messages = [];
  let cursor = 0, changed = false, tree, closed = 0, refreshed = 0;
  const hookReact = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
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
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
    useMemo(factory, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) hooks[index] = { value: factory(), deps };
      return hooks[index].value;
    },
  };
  const service = {
    previewDatabasesExcel: async selected => {
      assert.equal(selected, file); calls.push('preview');
      return { rows: [{ rowNum: 2, status: 'NEW' }, { rowNum: 3, status: 'DUPLICATE' }, { rowNum: 4, status: 'INCOMPLETE', message: 'Missing position' }] };
    },
    importDatabasesExcel: async selected => {
      assert.equal(selected, file); calls.push('import');
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
  }, { setInterval: () => 1, clearInterval() {}, setTimeout: callback => { queueMicrotask(callback); return 1; } });
  function render() {
    cursor = 0; changed = false;
    tree = ExcelImportModal({ isOpen: true, onClose: () => closed++, onImportSuccess: async () => {
      refreshed++; if (rejectRefresh) throw new Error('Refresh fixture failed');
      if (refreshWait) await refreshWait;
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
  render(); await settle();
  find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [file] } });
  render(); await settle();
  await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await settle();
  assert(text(tree).includes('Hasil Analisis & Preview Excel'));
  messages.length = 0;
  const startImport = () => find(node => node.type === 'button' && /^Import \d+ Data Bersih$/.test(text(node))).props.onClick({ preventDefault() {} });
  return {
    calls, messages, find, settle, startImport,
    has: predicate => nodes(tree).some(predicate),
    get closed() { return closed; }, get refreshed() { return refreshed; },
    get content() { return text(tree); },
    get html() { return renderToStaticMarkup(tree); }, // Real React rejects invalid object children.
    async import() {
      await startImport();
      await settle();
      assert.doesNotThrow(() => renderToStaticMarkup(tree), 'Import response must never blank the page');
    },
  };
}

(async () => {
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

  let releaseRefresh;
  const refreshWait = new Promise(resolve => { releaseRefresh = resolve; });
  const pendingRefresh = await mount(valid, { refreshWait });
  const importFinished = pendingRefresh.startImport();
  await pendingRefresh.settle();
  assert.equal(pendingRefresh.refreshed, 1);
  assert(pendingRefresh.content.includes('Upload Excel Berhasil'), 'Confirmed server result appears before refreshing finishes');
  for (const label of ['Upload File Lain', 'Lihat Database']) {
    assert.equal(pendingRefresh.find(node => node.type === 'button' && text(node) === label).props.disabled, true);
  }
  assert(!pendingRefresh.has(node => node.type === 'button' && /^Import \d+ Data Bersih$/.test(text(node))), 'No second import action is available while refreshing');
  pendingRefresh.find(node => node.type === 'button' && node.props['aria-label'] === 'Tutup import Excel').props.onClick();
  await pendingRefresh.settle();
  assert.equal(pendingRefresh.closed, 0, 'Close guard preserves the confirmed result during refresh');
  assert.equal(pendingRefresh.calls.filter(call => call === 'import').length, 1);
  releaseRefresh(); await importFinished; await pendingRefresh.settle();
  for (const label of ['Upload File Lain', 'Lihat Database']) {
    assert.equal(pendingRefresh.find(node => node.type === 'button' && text(node) === label).props.disabled, false);
  }
  assert.equal(pendingRefresh.calls.filter(call => call === 'import').length, 1);

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
  console.log('Database import feedback checks passed: actual XLSX preview/import, visible success and skipped rows, zero/malformed responses, optional details, refresh failure and API rejection. No network.');
})().catch(error => { console.error(error); process.exitCode = 1; });
