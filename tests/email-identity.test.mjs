import assert from 'node:assert/strict';
import { findPersonalEmailConflicts } from '../app/dashboard/database/utils/emailIdentity.ts';

const contacts = Array.from({ length: 5 }, (_, id) => ({
  id, firstName: `Person${id}`, lastName: 'Example', isActive: true,
  emails: [{ email: 'info@example.com', emailType: 'company', isCorporate: id !== 0 }],
}));
for (const c of contacts) assert.deepEqual(findPersonalEmailConflicts(c, c.emails[0], contacts), []);
// A public-domain address can also be explicitly classified as a shared company mailbox.
for (const c of contacts) c.emails[0].email = 'litevfxstudio@gmail.com';
for (const c of contacts) assert.deepEqual(findPersonalEmailConflicts(c, c.emails[0], contacts), []);

contacts[1].emails[0].emailType = 'personal';
contacts[1].emails[0].email = ' LITEVFXSTUDIO@gmail.com ';
assert.deepEqual(findPersonalEmailConflicts(contacts[0], contacts[0].emails[0], contacts).map(c => c.id), [1]);
assert.equal(findPersonalEmailConflicts(contacts[1], contacts[1].emails[0], contacts).length, 4);
contacts[1].isActive = false;
assert.deepEqual(findPersonalEmailConflicts(contacts[0], contacts[0].emails[0], contacts), []);
contacts[1].isActive = true;
contacts[1].emails[0].email = 'different@gmail.com';
assert.deepEqual(findPersonalEmailConflicts(contacts[0], contacts[0].emails[0], contacts), []);
assert.deepEqual(findPersonalEmailConflicts(contacts[0], { email: '', emailType: 'personal' }, contacts), []);
console.log('PASS: shared company mailboxes allowed; personal email collisions still detected.');
