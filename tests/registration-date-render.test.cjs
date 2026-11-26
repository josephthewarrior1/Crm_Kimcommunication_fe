'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const ROOT=path.resolve(__dirname,'..'),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const localRequire=id=>{if(!id.startsWith('.'))return require(id);const base=path.resolve(path.dirname(file),id),target=['.ts','.tsx','.js'].map(ext=>base+ext).find(f=>fs.existsSync(f));assert.ok(target&&target.startsWith(ROOT+path.sep),'Only local source imports are compiled');return load(target);};new Function('require','module','exports',compiled)(localRequire,module,module.exports);return module.exports;}
const {RequestPreEventTable}=load(path.join(ROOT,'app','dashboard','events','components','RequestPreEventTable.tsx'));
const noop=()=>{},participant=Object.freeze({id:1,event:{id:1,name:'Synthetic event'},database:{id:1,firstName:'Synthetic',lastName:'Person',isActive:true,databaseDestination:'participant',emails:[],mobilePhone:''},participantStatus:'white',attendanceStatus:'registered',sourceRegisteredAt:'2026-11-16T17:30:00Z',requestedAt:'2099-01-01T00:00:00',createdAt:'2098-01-01T00:00:00',notes:''});
const props={filteredParticipants:[participant],selectedParticipantIds:[],setSelectedParticipantIds:noop,checkDatabaseCompleteness:()=>({isIncomplete:false,missingFields:[]}),handleToggleEngagement:noop,handleDirectUpdateParticipant:noop,handleOpenUpdateParticipantModal:noop,openDeleteParticipantConfirm:noop,isUser:false,isAdmin:true,extractPicFromNotes:()=>({pic:'Admin',cleanNotes:''}),getStatusBadgeStyle:()=>'',getConfirmationStatusBadgeStyle:()=>''};
test('Data List displays the EMS source instant while compact views omit Reg Date', () => {
  const before = JSON.stringify(participant);
  const renderTab = activeTab => renderToStaticMarkup(React.createElement(RequestPreEventTable, {...props, activeTab}));
  const dataList = renderTab('request');
  assert.match(dataList, /Reg Date/);
  assert.match(dataList, /17 Nov 2026/);
  assert.match(dataList, /00[.:]30 WIB/);
  assert.doesNotMatch(dataList, /2099|2098/);
  for (const tab of ['pre_event', 'declined']) assert.doesNotMatch(renderTab(tab), /Reg Date|2099|2098/);
  assert.equal(JSON.stringify(participant), before);
});
test('registration-date scope audit covers all existing participant date columns',()=>{const components=path.join(ROOT,'app','dashboard','events','components');for(const file of ['ReminderTable.tsx','ReminderDdayTable.tsx']){const source=fs.readFileSync(path.join(components,file),'utf8');assert.doesNotMatch(source,/requestedAt|createdAt|sourceRegisteredAt|Reg Date|toLocaleDateString|toLocaleTimeString/,'Reminder views have no existing registration timestamp renderer to convert');}const page=fs.readFileSync(path.join(ROOT,'app','dashboard','events','page.tsx'),'utf8');assert.match(page,/activeTab === 'request' \|\| activeTab === 'pre_event' \|\| activeTab === 'declined'/);assert.match(fs.readFileSync(path.join(components,'RequestPreEventTable.tsx'),'utf8'),/formatRegistrationDate\(p\)/);});
