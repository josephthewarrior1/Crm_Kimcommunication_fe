import { Database } from '../types';

// An assigned branch owns its location; blank branch fields must not show another office's address.
export const getContactOffice = (database: Pick<Database, 'company' | 'branch'>) =>
  database.branch ?? database.company;
