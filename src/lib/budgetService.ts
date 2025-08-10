// src/lib/budgetService.ts

import { supabase } from './supabase';
import { Budget, BudgetType } from '@/types';

// Fungsi ini tidak berubah
export const getBudgetsByPeriod = async (household_id: string, period: string): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('household_id', household_id)
    .eq('period', period);

  if (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
  return data || [];
};

/**
 * ====================================================================
 * PERUBAHAN UTAMA DI SINI: Mengganti UPSERT dengan logika manual
 * ====================================================================
 */
export const upsertSingleBudget = async (budget: Partial<Budget>) => {
  // 1. Definisikan kriteria pencarian
  const matchCriteria: {
    household_id: string;
    period: string;
    budget_type: BudgetType;
    category_id?: number | null;
  } = {
    household_id: budget.household_id!,
    period: budget.period!,
    budget_type: budget.budget_type!,
  };

  if (budget.category_id) {
    matchCriteria.category_id = budget.category_id;
  }

  // 2. Coba UPDATE terlebih dahulu
  let query = supabase
    .from('budgets')
    .update({ amount: budget.amount })
    .eq('household_id', matchCriteria.household_id)
    .eq('period', matchCriteria.period)
    .eq('budget_type', matchCriteria.budget_type);

  if (budget.category_id) {
    query = query.eq('category_id', budget.category_id);
  } else {
    query = query.is('category_id', null);
  }

  const { data: updatedData, error: updateError, count: updateCount } = await query.select().single();

  // Jika ada error selain data tidak ditemukan, lemparkan
  if (updateError && updateError.code !== 'PGRST116') {
    console.error('Error updating budget:', updateError);
    throw updateError;
  }

  // 3. Jika UPDATE berhasil (count > 0), kembalikan hasilnya
  if (updateCount && updateCount > 0) {
    return updatedData;
  }

  // 4. Jika UPDATE tidak menemukan baris (count = 0), lakukan INSERT
  const { data: insertedData, error: insertError } = await supabase
    .from('budgets')
    .insert(budget)
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting budget:', insertError);
    throw insertError;
  }

  return insertedData;
};


// Fungsi ini tidak berubah
export const deleteBudget = async (
  household_id: string,
  period: string,
  budget_type: BudgetType,
  category_id?: number
) => {
  let query = supabase
    .from('budgets')
    .delete()
    .eq('household_id', household_id)
    .eq('period', period)
    .eq('budget_type', budget_type);

  if (category_id) {
    query = query.eq('category_id', category_id);
  } else {
    query = query.is('category_id', null);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
};

// ... sisa fungsi lainnya tidak berubah ...
export const getSpendingSummary = async ( household_id: string, period_start: string, period_end: string ) => { const { data, error } = await supabase.rpc('get_spending_by_budget_type', { p_household_id: household_id, p_period_start: period_start, p_period_end: period_end, }); if (error) { console.error('Error fetching spending summary:', error); throw error; } return data; };
export const getSpendingSummaryByCategory = async ( household_id: string, period_start: string, period_end: string ) => { const { data, error } = await supabase.rpc('get_spending_by_category', { p_household_id: household_id, p_period_start: period_start, p_period_end: period_end, }); if (error) { console.error('Error fetching spending summary by category:', error); throw error; } return data; };
export const getTotalIncome = async ( household_id: string, period_start: string, period_end: string ): Promise<number> => { const { data, error } = await supabase.rpc('get_total_income_by_period', { p_household_id: household_id, p_start_date: period_start, p_end_date: period_end, }); if (error) { console.error('Error fetching total income:', error); throw error; } return data || 0; };