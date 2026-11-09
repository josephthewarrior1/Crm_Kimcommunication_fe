// Run: node scripts/check-database-email-categories.cjs. Real helpers/service/page callbacks; no network or real data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const project = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const unexpected = name => { throw new Error('Unexpected dependency: ' + name); };
function evaluate(source, globals = {}, filename = 'fixture.tsx') {
  const sandbox = { exports: {}, require: unexpected, console, URLSearchParams, React, ...globals };
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, sandbox, { filename });
  return sandbox;
}
function compile(file, requireModule = unexpected) {
  return evaluate(fs.readFileSync(path.join(project, file), 'utf8'), { require: requireModule }, file).exports;
}
const notes = compile('app/dashboard/events/utils/notesHelper.ts');
const identity = compile('app/dashboard/database/utils/emailIdentity.ts');
const email = compile('app/dashboard/database/utils/emailCategory.ts', name =>
  name === '../../events/utils/notesHelper' ? notes : unexpected(name));
const office = compile('lib/utils/companyBranch.ts');
const validation = compile('app/dashboard/database/utils/validationHelper.ts', name =>
  name === './emailCategory' ? email : name === '../../../../lib/utils/companyBranch' ? office : unexpected(name));
const address = (value, isCorporate = false) => ({ email: value, isCorporate });
const person = (value, firstName = 'Student') => ({ firstName, emails: [address(value, true)] });

function checkClassification() {
  const sharedEmail = { email: 'same@gmail.com', emailType: 'personal' };
  const corporateOwner = { id: 1, firstName: 'Company', lastName: 'Contact', isActive: true, emails: [sharedEmail], databaseDestination: 'company' };
  const participant = { id: 2, firstName: 'Student', lastName: 'Contact', isActive: true, emails: [sharedEmail], databaseDestination: 'participant' };
  assert.equal(identity.findPersonalEmailConflicts(participant, sharedEmail, [corporateOwner]).length, 0, 'The same email in Company cannot flag a Participant as an identity conflict');
  assert.equal(identity.findPersonalEmailConflicts(participant, sharedEmail, [{ ...corporateOwner, databaseDestination: 'participant' }]).length, 1, 'Same-kind ambiguous email owners remain visible');
  for (const domain of ['gmail.com', 'yahoo.com', 'outlook.com', 'campus.ac.id', 'employer.example']) {
    const contact = { ...person(' NAME@' + domain.toUpperCase() + ' '), databaseDestination: 'participant' };
    assert.equal(email.isParticipantProfile(contact), true, domain);
    assert.equal(validation.checkDatabaseCompleteness(contact).isIncomplete, false,
      'Explicit participant accepts any valid email domain without corporate fields: ' + domain);
    assert.equal(email.isParticipantProfile({ ...contact, databaseDestination: 'company' }), false);
    assert.equal(validation.checkDatabaseCompleteness({ ...contact, databaseDestination: 'company' }).isIncomplete, true);
  }
  for (const invalid of [null, undefined, '', 'not-an-email', 'name@gmail', 'name@@gmail.com',
    'a @gmail.com', 'a@gmail.com;b@work.example', 'a@gmail.com,b@work.example']) {
    assert.equal(email.isValidContactEmail(invalid), false);
    assert.equal(validation.checkDatabaseCompleteness({ ...person(invalid), databaseDestination: 'participant' }).isIncomplete, true);
  }
  for (const contact of [{}, { emails: null }, { emails: [] }]) {
    assert.equal(email.isParticipantProfile(contact), false);
    assert(validation.checkDatabaseCompleteness(contact).missingFields.includes('Company Email'));
  }
  assert.equal(email.isParticipantProfile(person('student@gmail.com')), false, 'Legacy Gmail contact stays company until staff selects a destination');
  const unnamedParticipant = { ...person('student@gmail.com', ' '), databaseDestination: 'participant' };
  assert.equal(validation.checkDatabaseCompleteness(unnamedParticipant).isIncomplete, true);
  assert.deepEqual(plain(validation.checkDatabaseCompleteness(unnamedParticipant).missingFields), ['Nama peserta']);

  for (const phone of ['081234567890', '+62 812-3456-7890', '081200001111, 081300002222']) {
    const phoneOnly = { databaseDestination: 'participant', firstName: 'Student', mobilePhone: phone, emails: [] };
    assert.equal(validation.checkDatabaseCompleteness(phoneOnly).isIncomplete, false, 'Phone-only participants can be clean');
    assert.equal(validation.checkDatabaseCompleteness({ ...phoneOnly, firstName: '', lastName: 'Student' }).isIncomplete, false, 'A real last name also identifies the participant');
    assert.equal(validation.checkDatabaseCompleteness({ ...phoneOnly, firstName: '' }).isIncomplete, true, 'No name remains Dirty');
  }
  for (const phone of ['', '000000', '123', '081200001111, call 081300002222']) {
    assert.equal(validation.checkDatabaseCompleteness({ databaseDestination: 'participant', firstName: 'Student', mobilePhone: phone }).isIncomplete, true, 'A malformed phone cannot satisfy completeness');
  }
  const corporate = { firstName: 'Alex', lastName: 'Example', salutation: 'Mr', positionLevel: 'unknown',
    jobTitle: 'Officer', mobilePhone: '08123456789', emails: [address('alex@company.example', true)],
    company: { name: 'Example Company', brandName: 'Example', group: { name: 'Example Group' },
      address: 'Example Address', officePhone: '021123', city: 'Jakarta', industry: 'Technology', website: 'https://example.test' } };
  assert.equal(validation.checkDatabaseCompleteness(corporate).isIncomplete, false, 'Unknown keeps the existing filled-position rule');
  assert(validation.checkDatabaseCompleteness({ ...corporate, positionLevel: null }).missingFields.includes('Position'));
  const dual = { ...corporate, emails: [...corporate.emails, address('alex@gmail.com')] };
  assert.equal(email.isParticipantProfile(dual), false, 'Legacy contact remains company');
  assert.equal(validation.checkDatabaseCompleteness(dual).isIncomplete, false);
  const participantDual = { ...person('student@campus.ac.id'), databaseDestination: 'participant',
    emails: [address('student@gmail.com'), address('student@employer.example', true)] };
  assert.equal(email.isParticipantProfile(participantDual), true, 'An institutional/company email must never reroute an explicit participant');
  assert.equal(validation.checkDatabaseCompleteness(participantDual).isIncomplete, false);
  const both = { ...participantDual, databaseDestination: 'both' };
  assert.equal(validation.checkDatabaseCompleteness(both, 'participant').isIncomplete, false);
  assert.equal(validation.checkDatabaseCompleteness(both, 'company').isIncomplete, true);
  const incorrectlyTyped = { ...corporate, emails: [address('alex@gmail.com', true), address('alex@company.example')] };
  assert.equal(email.isParticipantProfile(incorrectlyTyped), false);
  assert(validation.checkDatabaseCompleteness(incorrectlyTyped).missingFields.includes('Company Email'),
    'Gmail marked company cannot satisfy the corporate requirement when a separate untyped business address exists');
  const form = validation.checkFormCompleteness('', 'Student', '', '', '', '', '', 'student@campus.ac.id', '', '', [], null, 'participant');
  assert.equal(form.isIncomplete, false, 'The form helper accepts an explicitly selected participant with institutional email');
  assert.equal(validation.checkFormCompleteness('', 'Student', '', '', '', '', '', 'student@gmail.com', '', '', []).isIncomplete, true,
    'An email domain alone cannot change the default company profile');
}

async function checkServiceUrls() {
  const requests = [];
  class ApiService { get(url, options) { requests.push({ url, options }); return Promise.resolve({}); } }
  const { crmService } = compile('lib/services/crmService.ts', name => name === './apiService' ? { ApiService } : unexpected(name));
  const signal = new AbortController().signal;
  for (const [method, endpoint] of [['getDatabasesList', 'list'], ['exportDatabases', 'export'], ['getDatabaseFilterOptions', 'filter-options']]) {
    for (const category of ['participant', 'company', 'all', undefined]) {
      await crmService[method]({ destination: category, tab: 'clean', search: 'School & campus', companyId: '17' }, signal);
      const request = requests.at(-1), url = new URL(request.url, 'http://fixture.invalid');
      assert.equal(url.pathname, '/api/databases/' + endpoint);
      assert.equal(url.searchParams.get('destination'), category ?? null);
      assert.equal(url.searchParams.get('search'), 'School & campus');
      assert.equal(url.searchParams.get('tab'), 'clean');
      assert.equal(url.searchParams.get('companyId'), '17');
      assert.equal(request.options.signal, signal);
    }
  }
  assert.equal(requests.length, 12);
}

function actualPageHarness() {
  const source = fs.readFileSync(path.join(project, 'app/dashboard/database/page.tsx'), 'utf8');
  const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = {}, wanted = ['loadDatabasePage', 'loadDatabaseFilterOptions', 'handleResetFilters', 'handleDestinationChange', 'handleOpenExportConfig'];
  let categorySection, qualitySection, initialCategory, exportColumns, destinationEffect;
  function visit(node) {
    if (ts.isVariableDeclaration(node)) {
      if (node.name.getText(parsed) === 'EXPORT_COLUMNS') exportColumns = node.initializer.getText(parsed);
      if (wanted.includes(node.name.getText(parsed))) {
        const expression = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
        callbacks[node.name.getText(parsed)] = expression.getText(parsed);
      }
      if (ts.isArrayBindingPattern(node.name) && node.name.elements[0]?.name?.getText(parsed) === 'destination') {
        initialCategory = node.initializer.arguments[0].getText(parsed);
      }
      if (node.name.getText(parsed) === 'destination' && !ts.isArrayBindingPattern(node.name)) {
        initialCategory = `() => (${node.initializer.getText(parsed)})`;
      }
    }
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'useEffect'
      && node.arguments[0]?.getText(parsed).includes('previousDestination.current')) destinationEffect = node.arguments[0].getText(parsed);
    if (ts.isJsxElement(node)) {
      const label = node.openingElement.attributes.properties.find(attribute => attribute.name?.getText(parsed) === 'aria-label');
      if (node.openingElement.tagName.getText(parsed) === 'section' && label?.initializer?.text === 'Jenis database') categorySection = node.getText(parsed);
      if (node.openingElement.tagName.getText(parsed) === 'div' && node.children.filter(ts.isJsxElement).every(child => child.openingElement.tagName.getText(parsed) === 'button')
        && node.getText(parsed).includes('Database Bersih (') && node.getText(parsed).includes('Database Kotor (')) qualitySection = node.getText(parsed);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(Object.keys(callbacks).length, wanted.length, 'Real page callbacks must be found');
  assert(categorySection && qualitySection && initialCategory && destinationEffect, 'Real category/quality controls and URL synchronization must be found');
  const calls = [], updates = [], navigations = [];
  const personalItems = [{ id: 2, firstName: 'Student', emails: [address('student@gmail.com')] }];
  const corporateItems = [{ id: 1, firstName: 'Professional', emails: [address('alex@company.example', true)] }];
  const sandbox = { AbortController,
    searchParams: new URLSearchParams(), destination: 'company', destinationCounts: { company: 1200, participant: 3 },
    previousDestination: { current: 'company' }, router: { push: (...args) => navigations.push(args) },
    databaseSummary: { all: 1200, clean: 1100, dirty: 100 },
    databaseRequestId: { current: 0 }, databaseRequest: { current: null }, filterOptionsRequestId: { current: 0 }, filterOptionsRequest: { current: null },
    searchInput: 'Previous company', searchQuery: 'Previous company', filterCompanyId: '17', filterGroupId: '7', filterBranchId: '9', filterBranchLabel: 'Previous office',
    filterPositionLevel: 'Manager', filterIndustry: 'Manufacturing', filterCity: 'Jakarta', activeTabFilter: 'dirty',
    sortBy: 'firstName', sortOrder: 'desc', currentPage: 7, itemsPerPage: 10,
    selectedDatabaseIds: [1, 9], tempSelectedDbIds: [1], exportDatabases: corporateItems, selectedColumns: ['companyName'],
    databases: corporateItems, filteredDatabases: corporateItems, isSearching: false,
    CheckCircle: () => null, AlertCircle: () => null, toast: { error(message) { throw new Error(message); } },
    crmService: {
      async getDatabasesList(params, signal) {
        calls.push({ operation: 'list', params: plain(params), signal });
        const personal = params.destination === 'participant';
        return { items: personal ? personalItems : corporateItems, total: personal ? 3 : 1200, totalPages: personal ? 1 : 120,
          summary: personal ? { all: 3, clean: 2, dirty: 1 } : { all: 1200, clean: 1100, dirty: 100 },
          destinations: { company: 1200, participant: 3 }, analytics: { total: personal ? 3 : 1200 } };
      },
      async getDatabaseFilterOptions(params, signal) { calls.push({ operation: 'facets', params: plain(params), signal }); return {}; },
      async exportDatabases(params) { calls.push({ operation: 'export', params: plain(params) }); return { items: params.destination === 'participant' ? personalItems : corporateItems }; },
    },
  };
  for (const setter of ['setLoading', 'setDatabases', 'setServerTotalItems', 'setServerTotalPages', 'setDatabaseSummary', 'setDestinationCounts', 'setDatabaseAnalytics',
    'setFilterOptionsError', 'setDatabaseFilterOptions', 'setSearchInput', 'setSearchQuery', 'setFilterGroupId', 'setFilterCompanyId', 'setFilterBranchId', 'setFilterBranchLabel',
    'setFilterPositionLevel', 'setFilterIndustry', 'setFilterCity', 'setSortBy', 'setSortOrder', 'setActiveTabFilter', 'setCurrentPage',
    'setSelectedDatabaseIds', 'setTempSelectedDbIds', 'setExportDatabases', 'setSelectedColumns', 'setDestination', 'setIsExportConfigModalOpen']) {
    const state = setter[3].toLowerCase() + setter.slice(4);
    sandbox[setter] = value => { sandbox[state] = value; updates.push(setter); if (state === 'databases') sandbox.filteredDatabases = value; };
  }
  const code = `const EXPORT_COLUMNS = ${exportColumns};\n` + Object.entries(callbacks).map(([name, expression]) => `const ${name} = ${expression};`).join('\n')
    + `\nexports.callbacks = { ${wanted.join(', ')} };\nexports.renderCategories = () => (${categorySection});\nexports.renderQuality = () => (${qualitySection});\nexports.initialCategory = ${initialCategory};\nexports.synchronizeDestination = ${destinationEffect};`;
  const evaluated = evaluate(code, sandbox);
  // Keep state setters and extracted closures on the same VM global object.
  for (const setter of Object.keys(sandbox).filter(name => name.startsWith('set'))) {
    const state = setter[3].toLowerCase() + setter.slice(4);
    evaluated[setter] = value => { evaluated[state] = value; updates.push(setter); if (state === 'databases') evaluated.filteredDatabases = value; };
  }
  return { state: evaluated, callbacks: evaluated.exports.callbacks, calls, updates, renderCategories: evaluated.exports.renderCategories,
    renderQuality: evaluated.exports.renderQuality, initialCategory: evaluated.exports.initialCategory, navigations,
    navigate() {
      assert(navigations.length, 'A real router navigation must precede URL synchronization');
      const [href, options] = navigations.at(-1);
      assert.equal(options.scroll, false);
      evaluated.searchParams = new URL(href, 'http://fixture.invalid').searchParams;
      evaluated.destination = evaluated.exports.initialCategory();
      evaluated.exports.synchronizeDestination();
    } };
}

const children = node => [node?.props?.children].flat(Infinity);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const content = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(content).join('');

async function checkPageFlow() {
  const page = actualPageHarness();
  assert.equal(page.initialCategory(), 'company');
  page.state.searchParams.set('destination', 'participant');
  assert.equal(page.initialCategory(), 'participant');
  page.state.searchParams.delete('destination');
  const personalButton = () => nodes(page.renderCategories()).find(node => node.type === 'button' && content(node).startsWith('Database Peserta'));
  personalButton().props.onClick();
  assert.equal(page.state.destination, 'company', 'Destination follows the URL, not a separate local state');
  page.navigate();
  assert.equal(page.state.destination, 'participant');
  for (const field of ['searchInput', 'searchQuery', 'filterGroupId', 'filterCompanyId', 'filterBranchId', 'filterBranchLabel', 'filterPositionLevel', 'filterIndustry', 'filterCity']) assert.equal(page.state[field], '', field);
  for (const field of ['selectedDatabaseIds', 'tempSelectedDbIds', 'exportDatabases']) assert.deepEqual(plain(page.state[field]), [], field);
  assert.equal(page.state.currentPage, 1);
  assert.equal(page.state.activeTabFilter, 'all');
  assert.equal(page.state.sortBy, 'id'); assert.equal(page.state.sortOrder, 'asc');

  await page.callbacks.loadDatabasePage();
  await page.callbacks.loadDatabaseFilterOptions();
  await page.callbacks.handleOpenExportConfig();
  assert.deepEqual(page.calls.map(call => call.operation), ['list', 'facets', 'export']);
  for (const call of page.calls) {
    assert.equal(call.params.destination, 'participant', call.operation);
    assert.equal(call.params.tab, 'all', call.operation);
    for (const field of ['search', 'groupId', 'companyId', 'branchId', 'positionLevel', 'industry', 'city']) assert.equal(call.params[field], undefined, field);
  }
  assert.equal(page.calls[0].params.page, 1);
  assert.equal(page.state.serverTotalItems, 3);
  assert.deepEqual(plain(page.state.databaseSummary), { all: 3, clean: 2, dirty: 1 });
  assert.deepEqual(plain(page.state.destinationCounts), { company: 1200, participant: 3 });
  assert.equal(page.state.exportDatabases[0].id, 2);
  const participantExportColumns = plain(page.state.selectedColumns);
  for (const field of ['companyName', 'firstName', 'lastName', 'mobilePhone', 'personalEmail', 'branchName', 'postalCode', 'website']) assert(participantExportColumns.includes(field), 'Student export includes ' + field);
  for (const field of ['companyEmail', 'hardware', 'linkedin', 'city', 'eventHistory']) assert(!participantExportColumns.includes(field), 'Student export omits ' + field);
  assert.equal(page.state.isExportConfigModalOpen, true);
  const categoryTree = page.renderCategories(), html = renderToStaticMarkup(categoryTree);
  assert(html.includes(`Database Perusahaan (${(1200).toLocaleString()})`) && html.includes('Database Peserta (3)'));
  assert.equal(personalButton().props['aria-selected'], true);
  assert(content(categoryTree).includes('nama dan minimal email valid atau HP/WhatsApp cukup untuk status Bersih'));
  const quality = page.renderQuality();
  assert(content(quality).includes('Semua Data (3)') && content(quality).includes('Database Bersih (2)') && content(quality).includes('Database Kotor (1)'));
  assert.doesNotThrow(() => renderToStaticMarkup(quality));
  nodes(quality).find(node => node.type === 'button' && content(node).includes('Database Bersih')).props.onClick();
  await page.callbacks.loadDatabasePage();
  assert.equal(page.calls.at(-1).params.tab, 'clean');
  assert.equal(page.calls.at(-1).params.destination, 'participant');
  page.state.searchInput = 'Keep current personal search';
  const previousUpdates = page.updates.length;
  personalButton().props.onClick();
  assert.equal(page.state.searchInput, 'Keep current personal search');
  assert.equal(page.updates.length, previousUpdates, 'Clicking the selected category must not reset the current view');
  nodes(page.renderCategories()).find(node => node.type === 'button' && content(node).startsWith('Database Perusahaan')).props.onClick();
  page.navigate();
  await page.callbacks.loadDatabasePage();
  assert.equal(page.calls.at(-1).params.destination, 'company');
  assert.equal(page.calls.at(-1).params.tab, 'all');
  assert.equal(page.state.serverTotalItems, 1200, 'Server counts survive a one-row page fixture');
  await page.callbacks.handleOpenExportConfig();
  assert(page.state.selectedColumns.includes('linkedin'), 'Company export retains LinkedIn');
  assert.deepEqual(participantExportColumns, plain(page.state.selectedColumns).filter(key => !['companyEmail', 'hardware', 'linkedin', 'city', 'eventHistory'].includes(key)), 'Student export follows the requested subset in Company order');
  assert.equal(participantExportColumns.length, 19, 'Nineteen fields plus the automatic No column');
}

(async () => {
  checkClassification();
  await checkServiceUrls();
  await checkPageFlow();
  console.log('Database email category checks passed: actual helpers, API URLs, scoped page queries/counts, rendered tabs, and category reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
