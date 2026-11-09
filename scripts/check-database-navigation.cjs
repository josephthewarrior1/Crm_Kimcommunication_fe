// Run: node scripts/check-database-navigation.cjs. Actual navigation/view rendering; no browser or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const project = path.join(__dirname, '..');
const contactHelpers = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(project, 'app/dashboard/events/utils/notesHelper.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, contactHelpers);
const organizationHelpers = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(project, 'lib/utils/companyBranch.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, organizationHelpers);
const children = node => [node?.props?.children].flat(Infinity);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...children(node).flatMap(nodes)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : children(node).map(text).join('');
let query = '', pathname = '/dashboard/database', viewer = false, stateIndex = 0;
const pushes = [], changes = [];
const fixture = { id: 1, firstName: 'Uji Peserta', lastName: 'Demo', isActive: true, emails: [{ email: 'uji@kampus.example.org', emailType: 'personal', isCorporate: false }],
  mobilePhone: '081200009602', institutionName: 'Kampus Uji', participantCategory: 'mahasiswa',
  organizationGroupName: 'Grup Peserta', organizationBrandName: 'Brand Peserta', organizationAddress: 'Alamat Peserta',
  organizationOfficePhone: '0215557001', organizationIndustry: 'Education', organizationSizeRevenue: 'Small',
  organizationSizeEmployee: 'Medium', organizationBranchName: 'Cabang Peserta', organizationPostalCode: '00123',
  organizationWebsite: 'https://campus.example.invalid' };
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState(initial) { const index = stateIndex++; return [index === 0 && pathname === 'test-page' ? [fixture]
    : initial === true ? false : typeof initial === 'function' ? initial() : initial, value => changes.push(value)]; },
  useRef: initial => ({ current: initial }), useCallback: fn => fn, useEffect() {}, useLayoutEffect() {},
};
const icon = name => name;
const generic = new Proxy({}, { get: (_, name) => icon(name) });
function compile(file) {
  const source = fs.readFileSync(path.join(project, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, file + ' must parse');
  const context = { exports: {}, URLSearchParams, console, require(name) {
    if (name === 'react') return React;
    if (name === 'next/navigation') return { useSearchParams: () => new URLSearchParams(query), usePathname: () => pathname,
      useRouter: () => ({ push: (...args) => pushes.push(args), replace() {} }) };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ user: { fullName: 'Uji Admin', roles: ['ADMIN'] }, isAdmin: !viewer, isManager: false, isUser: viewer }) };
    if (name.endsWith('indonesia-cities.json')) return [];
    if (name.endsWith('/crmService')) return { crmService: new Proxy({}, { get() { throw Error('No network during render'); } }) };
    if (name.endsWith('/phoneHelper')) return { normalizePhone: value => value };
    if (name.endsWith('/emailIdentity')) return { findPersonalEmailConflicts: () => [] };
    if (name.endsWith('/companyBranch')) return organizationHelpers.exports;
    if (name.endsWith('/validationHelper')) return { checkDatabaseCompleteness: () => ({ isIncomplete: false, missingFields: [] }) };
    if (name.endsWith('/notesHelper')) return contactHelpers.exports;
    return generic;
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, context, { filename: file });
  return { component: context.exports.default, source, ast };
}

const layout = compile('app/dashboard/layout.tsx');
for (const destination of ['', 'company', 'participant']) {
  query = destination ? 'destination=' + destination : ''; stateIndex = 0;
  const tree = layout.component({ children: 'Content' });
  const submenus = nodes(tree).filter(node => typeof node.type === 'function' && node.type.name === 'DatabaseSubmenu');
  assert.equal(submenus.length, 2, 'Desktop and mobile must use the same submenu');
  for (const submenu of submenus) {
    const links = nodes(submenu.type(submenu.props)).filter(node => node.props?.href);
    assert.equal(links.length, 2);
    const selected = links.filter(link => link.props['aria-current'] === 'page');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].props.href, '/dashboard/database?destination=' + (destination || 'company'));
    selected[0].props.onClick(); assert.equal(changes.at(-1), false, 'Submenu navigation closes the mobile drawer');
  }
}
viewer = true; stateIndex = 0;
assert(!nodes(layout.component({ children: '' })).some(node => node.type?.name === 'DatabaseSubmenu'), 'Viewer stays Events-only');
viewer = false;

const page = compile('app/dashboard/database/page.tsx');
query = 'destination=participant&tab=dirty&search=Uji&view=owned'; pathname = 'test-page'; stateIndex = 0;
const participantTree = page.component();
const participantTable = nodes(participantTree).find(node => node.type === 'table');
assert(participantTable);
const participantHead = text(nodes(participantTable).find(node => node.type === 'thead'));
for (const label of ['No', 'Nama Group/Holding Company', 'Company Name', 'First Name', 'Last Name', 'Mobile Phone', 'Personal Email Address']) assert(participantHead.includes(label));
for (const label of ['Company Email Address', 'Company Hardware', 'Linkedin Link', 'City']) assert(!participantHead.includes(label), 'Student omits ' + label);
assert(text(participantTable).includes('uji@kampus.example.org'), 'The real email helpers retain campus addresses stored as personal');
assert(text(participantTable).includes('Kampus Uji'), 'Participant institution appears under Company Name without creating a company');
for (const value of ['Grup Peserta', 'Brand Peserta', 'Alamat Peserta', '0215557001', 'Education', 'Small', 'Medium', 'Cabang Peserta', '00123']) assert(text(participantTable).includes(value), 'Student shows its own organization data: ' + value);
const originalIdentity = { firstName: fixture.firstName, lastName: fixture.lastName, emails: fixture.emails, mobilePhone: fixture.mobilePhone };
for (const [identity, label] of [
  [{ firstName: 'Uji Peserta Gmail', lastName: null }, 'Uji Peserta Gmail'],
  [{ firstName: null, lastName: null }, 'uji@kampus.example.org'],
  [{ firstName: undefined, lastName: undefined, emails: [] }, '081200009602'],
  [{ firstName: null, lastName: null, emails: [], mobilePhone: '' }, 'kontak tanpa nama'],
]) {
  Object.assign(fixture, originalIdentity, identity); stateIndex = 0;
  const tree = page.component();
  const action = nodes(tree).find(node => node.type === 'button' && node.props?.['aria-label']?.startsWith('Aksi untuk '));
  assert.equal(action.props['aria-label'], 'Aksi untuk ' + label, 'Optional names must not render literal null/undefined in action labels');
  if (!fixture.firstName && !fixture.lastName) assert(text(tree).includes('Nama belum diisi'));
}
Object.assign(fixture, originalIdentity);
const allNodes = nodes(participantTree), charts = allNodes.findIndex(node => node.type === 'details');
assert(charts > allNodes.indexOf(participantTable), 'Summary charts belong below the records');
assert(!allNodes[charts].props.open, 'Summary charts start collapsed');
nodes(participantTree).find(node => node.props?.id === 'database-company-tab').props.onClick();
assert.equal(pushes.length, 1);
const next = new URL(pushes[0][0], 'http://localhost');
assert.equal(next.searchParams.get('destination'), 'company');
assert.equal(next.searchParams.get('view'), 'owned');
assert(!next.searchParams.has('search') && !next.searchParams.has('tab'));
assert.equal(pushes[0][1].scroll, false);
query = 'destination=company'; stateIndex = 0;
const companyHead = nodes(page.component()).find(node => node.type === 'thead');
assert(text(companyHead).includes('Nama Group/Holding Company'));
const headerLabels = head => nodes(head).filter(node => node.type === 'th').map(text);
assert.deepEqual(headerLabels(nodes(participantTable).find(node => node.type === 'thead')),
  ['Actions', '', 'No', 'Nama Group/Holding Company', 'Nama Brand', 'Company Name', 'Salutation', 'First Name', 'Last Name', 'Position', 'Division', 'Jobtitle', 'Address', 'Office Phone', 'Mobile Phone', 'Personal Email Address', 'Industry', 'Company Size (Revenue)', 'Company Size (Employee)', 'Cabang/Kantor', 'Postal Code', 'Company Website'], 'Student data columns match the requested twenty-column order');
assert(headerLabels(companyHead).includes('Company Email Address') && headerLabels(companyHead).includes('City'), 'Company columns remain unchanged');

let destinationEffect;
function findEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(page.ast) === 'useEffect'
    && node.arguments[0]?.getText(page.ast).includes('previousDestination.current')) destinationEffect = node.arguments[0].getText(page.ast);
  ts.forEachChild(node, findEffect);
}
findEffect(page.ast);
assert(destinationEffect);
const resetCalls = [], selectionCalls = [], tabCalls = [];
const effectContext = { exports: {}, destination: 'participant', previousDestination: { current: 'company' },
  searchParams: new URLSearchParams('destination=participant&search=Uji&tab=dirty'),
  handleResetFilters: () => resetCalls.push('reset'), setDatabases: value => assert.equal(value.length, 0),
  setDatabaseAnalytics: value => assert.equal(value, null), setSearchInput() {}, setSearchQuery() {},
  setSelectedDatabaseIds: value => selectionCalls.push(value.length), setTempSelectedDbIds() {}, setExportDatabases() {},
  setActiveTabFilter: value => tabCalls.push(value),
};
vm.runInNewContext(ts.transpileModule('exports.effect = ' + destinationEffect, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText, effectContext);
effectContext.exports.effect();
assert.equal(resetCalls.length, 1); assert.equal(selectionCalls[0], 0); assert.equal(tabCalls.at(-1), 'dirty');
effectContext.exports.effect(); assert.equal(resetCalls.length, 1, 'Same destination must not reset local filters');
effectContext.destination = 'company'; effectContext.searchParams = new URLSearchParams('destination=company');
effectContext.exports.effect(); assert.equal(resetCalls.length, 2); assert.equal(tabCalls.at(-1), 'all');
console.log('Database navigation passed: shared desktop/mobile submenu, URL/filter navigation, Company/Participant column parity except LinkedIn, campus email and institution display, safe optional names, charts below records.');
