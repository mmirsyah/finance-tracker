
// src/lib/db.ts
import Dexie, { Table } from 'dexie';
import { Account, DbCategory, Transaction, AssetSummary } from '@/types';

export interface SyncQueueItem {
  id?: number;
  type: 'transaction_add' | 'transaction_update' | 'transaction_delete'; // Contoh tipe mutasi
  payload: unknown;
  timestamp: number;
}

export class FinanceAppDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<DbCategory>;
  transactions!: Table<Transaction>;
  assets!: Table<AssetSummary>;
  syncQueue!: Table<SyncQueueItem>; 

  constructor() {
    super('FinanceTrackerDB'); // Nama database
    this.version(1).stores({
      accounts: 'id', // Primary key
      categories: 'id', // Primary key
      transactions: 'id, date, account_id, category_id', // Primary key dan index untuk query
      assets: 'account_id', // Primary key untuk asset summary
      syncQueue: '++id', // Auto-incrementing primary key
    });
  }
}

export const db = new FinanceAppDB();
