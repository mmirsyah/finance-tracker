// src/types/index.ts

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseRealtimePayload<T extends { [key: string]: any; }> = RealtimePostgresChangesPayload<T>;


export interface Household {
  id: string;
  name: string;
  owner_id: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  household_id: string | null;
  period_start_day: number | null;
}

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income' | 'transfer';
  user_id: string;
  household_id: string;
  parent_id: number | null;
  children?: Category[];
  budget_type: BudgetType;
}

export type BudgetType = 'Fixed' | 'Flex' | 'Non-Monthly';

export interface Budget {
  id: number;
  household_id: string;
  period: string; // Format: 'YYYY-MM-01'
  budget_type: BudgetType;
  amount: number;
  created_at: string;
  /**
   * ====================================================================
   * PENAMBAHAN PROPERTI BARU DI SINI
   * ====================================================================
   * Kolom ini opsional, karena budget bucket tidak memiliki category_id.
   */
  category_id?: number | null;
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
  note: string | null;
  date: string;
  user_id: string;
  household_id: string;
  created_at?: string;
  sequence_number?: number;
  categories?: { name: string; icon?: string };
  accounts?: { name: string };
  to_account?: { name: string };
}

export type RecentTransaction = {
  id: string;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  note: string | null;
  category_name: string | null;
  account_name: string | null;
}

export type TransactionSummary = {
  total_transactions: number;
  largest_transaction: number;
  largest_expense: number;
  average_transaction: number;
  total_income: number;
  total_spending: number;
  first_transaction_date: string;
  last_transaction_date: string;
};

export type TransactionGroup = {
  date: string;
  subtotal: number;
  transactions: Transaction[];
};