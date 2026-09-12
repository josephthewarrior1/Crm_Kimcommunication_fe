import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../app/dashboard/targets/targetDraft.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { targetChanged, targetCount, targetDraft } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const row = { userId: 1, targetCount: 75, targetMode: 'DAILY' };
const draft = targetDraft(row);
assert.equal(targetChanged(row, draft), false);
assert.equal(targetCount({ ...draft, count: '50' }), 50);
assert.equal(targetChanged(row, { ...draft, mode: 'MONTHLY' }), true);
const off = { ...draft, enabled: false };
assert.equal(targetCount(off), 0);
assert.equal(targetChanged(row, off), true);
assert.equal(targetCount({ ...off, enabled: true }), 75);
assert.equal(targetChanged({ ...row, targetCount: 0 }, off), false);
assert.equal(targetDraft({ ...row, targetCount: 0 }).enabled, false);
assert.equal(targetChanged({ ...row, targetCount: 0 }, { ...draft, enabled: true, count: '' }), true);
assert.equal(targetCount({ ...targetDraft({ ...row, targetCount: 0 }), enabled: true }), 50);
for (const count of ['', ' ', '0', '-1', '1.5', 'NaN', 'Infinity', '2147483648']) {
  assert.throws(() => targetCount({ ...draft, count }));
}
assert.equal(targetCount({ ...draft, count: '2147483647' }), 2147483647);
console.log('PASS: target validation, edits, off payload, and re-enabling targets.');
