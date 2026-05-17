import Dexie from 'dexie';

export const db = new Dexie('PharmacyLocalDB');

db.version(1).stores({
  shifts: 'id, openedAt, closedAt, cashierId, openingCash, closingCash, actualCash, status',
  shiftExpenses: '++id, shiftId, amount, reason, category, timestamp, addedBy',
  shiftHandovers: '++id, shiftId, amount, receiver, timestamp',
  shiftActivities: '++id, shiftId, type, amount, reference, timestamp, userId'
});
