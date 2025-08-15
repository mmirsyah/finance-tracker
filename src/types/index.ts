// src/types/index.ts

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type SupabaseRealtimePayload<T extends { [key: string]: unknown; }> = RealtimePostgresChangesPayload<T>;

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

export interface Budget {
  id: number;
  name: string;
  household_id: string;
  categories?: Category[];
}

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income' | 'transfer';
  user_id: string;
  household_id: string;
  parent_id: number | null;
  children?: Category[];
}

export interface BudgetAllocation {
  id: number;
  household_id: string;
  period: string; // Format: 'YYYY-MM-DD'
  budget_id: number;
  category_id: number | null;
  amount: number;
  created_at: string;
}

export interface BudgetCategorySummary {
  id: number;
  name:string;
  allocated: number;
  spent: number;
  is_rollover: boolean;
  rollover_amount: number;
}

export interface BudgetSummary {
  plan_id: number;
  plan_name: string;
  total_allocated: number;
  total_spent: number;
  categories: BudgetCategorySummary[];
}

export interface Account {
  id: string;
  name: string;
  user_id: string;
  household_id: string;
  initial_balance: number;
  balance?: number;
  type: 'generic' | 'goal'; 
  target_amount?: number | null;
  goal_reason?: string | null;
  achieved_at?: string | null;
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
  [key: string]: unknown;
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

// --- TAMBAHAN BARU DI SINI ---
export type SpendingItem = { 
  name: string; 
  value: number; 
};
// --- AKHIR TAMBAHAN ---

export type TransactionGroup = {
  date: string;
  subtotal: number;
  transactions: Transaction[];
};

export interface OverallBudgetSummary {
  total_income: number;
  total_budgeted: number;
  total_spent: number;
}

export interface MonthlyBreakdown {
    month: string;
    Pengeluaran: number;
}

export interface CategorySpendingHistory {
    spent_last_period: number;
    period_average: number;
    period_breakdown: MonthlyBreakdown[];
}