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
 * PERBAIKAN UTAMA DI SINI: Memperbaiki typo dan logika
 * ====================================================================
 */
export const upsertSingleBudget = async (budget: Partial<Budget>) => {
  // Cek dulu apakah data sudah ada
  let checkQuery = supabase
    .from('budgets')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', budget.household_id!)
    .eq('period', budget.period!)
    .eq('budget_type', budget.budget_type!);

  if (budget.category_id) {
    checkQuery = checkQuery.eq('category_id', budget.category_id);
  } else {
    checkQuery = checkQuery.is('category_id', null);
  }

  const { count, error: checkError } = await checkQuery;

  if (checkError) {
    console.error('Error checking for existing budget:', checkError);
    throw checkError;
  }

  // Jika data sudah ada (count > 0), lakukan UPDATE
  if (count && count > 0) {
    // Bangun query update
    let updateQuery = supabase
      .from('budgets')
      .update({ amount: budget.amount })
      .eq('household_id', budget.household_id!)
      .eq('period', budget.period!)
      .eq('budget_type', budget.budget_type!);

    // Tambahkan kondisi untuk category_id
    if (budget.category_id) {
      updateQuery = updateQuery.eq('category_id', budget.category_id);
    } else {
      // Perbaikan: Chaining dari 'updateQuery' yang sudah ada
      updateQuery = updateQuery.is('category_id', null);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('Error updating budget:', updateError);
      throw updateError;
    }
  } else {
    // Jika data belum ada, lakukan INSERT
    const { error: insertError } = await supabase
      .from('budgets')
      .insert(budget);

    if (insertError) {
      console.error('Error inserting budget:', insertError);
      throw insertError;
    }
  }
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