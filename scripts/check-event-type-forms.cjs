// Run: node scripts/check-event-type-forms.cjs. Real form components, no network or data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const noop = () => {};
const icons = { X: () => null, Loader2: () => null, Users: () => null };
function compile(file, dependencies) {
  const context = { exports: {}, require(name) {
    if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
    return dependencies[name];
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, context, { filename: file });
  return context.exports;
}
const field = compile('app/dashboard/events/components/SyncDestinationField.tsx', { react: React });
const dependencies = { react: React, 'lucide-react': icons, './SyncDestinationField': field,
  './EmsMappingField': { EmsMappingField: () => React.createElement('div', { 'data-ems-mapping': true }) } };
const { CreateEventModal } = compile('app/dashboard/events/components/CreateEventModal.tsx', dependencies);
const { EditEventModal } = compile('app/dashboard/events/components/EditEventModal.tsx', dependencies);
const defaults = { isOpen: true, onClose: noop, onSubmit: noop, submittingEvent: false,
  name: 'Uji event', setName: noop, eventType: 'partner', setEventType: noop,
  clientName: '', setClientName: noop, dateStart: '', setDateStart: noop,
  dateEnd: '', setDateEnd: noop, notes: '', setNotes: noop, targetParticipants: 0, setTargetParticipants: noop,
  emsSource: 'LEGACY', setEmsSource: noop, syncDestination: '', setSyncDestination: noop,
  editName: 'Uji event', setEditName: noop, editEventType: 'partner', setEditEventType: noop,
  editClientName: '', setEditClientName: noop, editDateStart: '', setEditDateStart: noop,
  editDateEnd: '', setEditDateEnd: noop, editNotes: '', setEditNotes: noop,
  editTargetParticipants: 0, setEditTargetParticipants: noop,
};
const render = (component, props) => renderToStaticMarkup(React.createElement(component, { ...defaults, ...props }));
const select = html => html.match(/<select\b[^>]*id="event-sync-destination"[^>]*>/)?.[0];
const submit = html => html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0];
const blankCreate = render(CreateEventModal);
assert(select(blankCreate).includes('required=""'), 'Every new event needs a type even without EMS mapping');
assert(submit(blankCreate).includes('disabled=""'));
for (const destination of ['company', 'participant']) {
  const html = render(CreateEventModal, { syncDestination: destination, setEmsEventId: noop });
  assert(!submit(html).includes('disabled=""'));
  assert(html.includes('Jenis data event'));
  assert(html.indexOf('Jenis data event') < html.indexOf('data-ems-mapping'), 'Type is chosen before EMS mapping');
  assert(html.includes('Korporat — Database Perusahaan') && html.includes('Peserta / Publik — Database Peserta'));
  assert(html.includes('Kategori kegiatan') && !html.includes('>Event Type<'));
}
const edit = props => render(EditEventModal, { editingEvent: { id: 1, name: 'Uji', syncDestination: 'company' }, syncDestination: 'company', ...props });
assert(select(edit({ hasParticipants: true })).includes('disabled=""'), 'Populated typed event cannot change type');
assert(!submit(edit({ hasParticipants: true })).includes('disabled=""'), 'Other event metadata can still be saved');
assert(select(edit({ editingEvent: { id: 1, name: 'Uji', syncDestination: 'company', registeredCount: 3 } })).includes('disabled=""'));
assert(!select(edit({ hasParticipants: false })).includes('disabled=""'), 'Empty event can choose another type');
const legacy = edit({ editingEvent: { id: 1, name: 'Uji' }, syncDestination: '', hasParticipants: true });
assert(!select(legacy).includes('disabled=""'), 'Legacy event can choose its initial type, subject to backend compatibility');
assert(submit(legacy).includes('disabled=""'));
let changed;
const fieldTree = field.SyncDestinationField({ value: '', onChange: value => changed = value });
fieldTree.props.children.find(child => child.type === 'select').props.onChange({ target: { value: 'participant' } });
assert.equal(changed, 'participant', 'Explicit choice is forwarded without domain inference');
console.log('Event type forms passed: required initial classification, distinct activity category, EMS-independent selection and populated-event lock.');
