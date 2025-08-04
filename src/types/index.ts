// src/types/index.ts

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income' | 'transfer';
  user_id: string;
  household_id: string;
  parent_id: number | null;
  children?: Category[];
}

export interface Account {
  id: string;
  name: string;
  user_id: string;
  household_id: string;
  initial_balance: number;
  balance?: number;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  category: number | null;
  account_id: string;
  to_account_id: string | null;
  note?: string;
  date: string;
  user_id: string;
  household_id: string;
  sequence_number?: number;
  categories?: { name: string; icon?: string };
  accounts?: { name: string };
  to_account?: { name: string };
}

// === PERBAIKAN ADA DI DALAM BLOK INI ===
export type TransactionSummary = {
  total_transactions: number;
  largest_transaction: number;
  largest_expense: number;
  average_transaction: number;
  total_income: number;
  total_spending: number;
  first_transaction_date: string; // <-- Diperbaiki dari 'first_transaction'
  last_transaction_date: string;  // <-- Diperbaiki dari 'last_transaction'
};
// =======================================

export type TransactionGroup = {
  date: string;
  subtotal: number;
  transactions: Transaction[];
};