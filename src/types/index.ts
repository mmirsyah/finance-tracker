// src/types/index.ts

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// --- PERBAIKAN: Mengganti 'any' dengan 'Record<string, unknown>' untuk tipe yang lebih aman ---
export type SupabaseRealtimePayload<T extends { [key: string]: Record<string, unknown>; }> = RealtimePostgresChangesPayload<T>;

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
  is_archived: boolean;
  is_rollover: boolean;
  children?: Category[];
}

// --- TIPE BUDGET BARU ---
export interface BudgetAssignment {
  id?: number;
  household_id: string;
  category_id: number;
  month: string; // YYYY-MM-DD
  assigned_amount: number;
  is_flex_budget?: boolean;
}

export interface BudgetCategoryData {
  id: number;
  name: string;
  rollover: number;
  assigned: number;
  activity: number;
  available: number;
  is_rollover: boolean;
}

export interface BudgetParentCategoryData extends BudgetCategoryData {
  unallocated_balance: number;
  is_flex_budget: boolean;
  children: (BudgetCategoryData & { is_rollover: boolean })[];
}

// --- PERBAIKAN DI SINI ---
// Menyesuaikan tipe ini agar cocok dengan nama kolom yang dikembalikan oleh fungsi RPC 'get_budget_data'
export interface BudgetPageData {
  total_income: number;
  total_budgeted: number;
  total_activity: number;
  categories: (BudgetParentCategoryData | (BudgetCategoryData & { children: [], is_rollover: boolean, is_flex_budget: boolean, unallocated_balance: number }))[];
}
// --- AKHIR PERBAIKAN TIPE BUDGET ---


export interface Account {
  id: string;
  name: string;
  user_id: string;
  household_id: string;
  initial_balance: number;
  balance?: number;
  type: 'generic' | 'goal' | 'asset'; 
  target_amount?: number | null;
  goal_reason?: string | null;
  achieved_at?: string | null;
  asset_class?: string | null;
  unit?: string | null;
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

export interface Asset {
    id: number;
    created_at: string;
    household_id: string;
    account_id: string;
    name: string;
    unit: string | null;
    asset_class: string | null;
}

export interface AssetTransaction {
    id: number;
    created_at: string;
    asset_account_id: string;
    transaction_type: 'buy' | 'sell';
    quantity: number;
    price_per_unit: number;
    transaction_date: string;
    household_id: string;
    related_transaction_id?: string | null;
}

export interface AssetSummary {
    account_id: string;
    name: string;
    asset_class: string | null;
    unit: string | null;
    total_quantity: number;
    average_cost_basis: number;
    total_cost: number;
    current_price: number;
    current_value: number;
    unrealized_pnl: number;
    unrealized_pnl_percent: number;
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

export type SpendingItem = { 
  name: string; 
  value: number; 
};

export type TransactionGroup = {
  date: string;
  subtotal: number;
  transactions: Transaction[];
};

export interface MonthlyBreakdown {
    month: string;
    Pengeluaran: number;
}

export interface CategorySpendingHistory {
    current_period_total: number;
    previous_period_total: number;
    period_average: number;
    percentage_of_total: number;
    sub_category_spending: SpendingItem[];
}

export interface BudgetHistoryData {
  last_month_spending: number;
  three_month_avg: number;
  six_month_avg: number;
  monthly_history: { month: string; Pengeluaran: number }[];
}

export interface BudgetSummaryItem {
  category_id: number;
  category_name: string;
  assigned_amount: number;
  spent_amount: number;
  remaining_amount: number;
  progress_percentage: number;
}

export interface BudgetCategoryListItem {
  category_id: number;
  category_name: string;
}

// --- RECURRING TRANSACTION TYPES ---
export interface RecurringTemplate {
  id: number;
  template_name: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  category_id: number | null;
  category_name: string | null;
  account_id: string;
  account_name: string;
  to_account_id: string | null;
  to_account_name: string | null;
  note: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_value: number;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringInstance {
  instance_id: number;
  template_id: number;
  template_name: string;
  due_date: string;
  status: 'upcoming' | 'confirmed' | 'done' | 'done_with_difference' | 'overdue';
  transaction_type: 'expense' | 'income' | 'transfer';
  original_amount: number;
  confirmed_amount: number | null;
  original_category_id: number | null;
  original_category_name: string | null;
  confirmed_category_id: number | null;
  confirmed_category_name: string | null;
  original_account_id: string;
  original_account_name: string;
  confirmed_account_id: string | null;
  confirmed_account_name: string | null;
  original_to_account_id: string | null;
  original_to_account_name: string | null;
  confirmed_to_account_id: string | null;
  confirmed_to_account_name: string | null;
  original_note: string | null;
  confirmed_note: string | null;
  actual_transaction_id: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  created_at: string;
}

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';