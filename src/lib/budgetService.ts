// src/lib/budgetService.ts

import { supabase } from './supabase';
import { BudgetAllocation, BudgetSummary } from '@/types';

/**
 * Mengambil ringkasan budget dari server.
 */
export const getBudgetSummary = async (household_id: string, start_date: string, end_date: string): Promise<BudgetSummary[]> => {
  const { data, error } = await supabase.rpc('get_budget_summary', {
    p_household_id: household_id,
    p_start_date: start_date,
    p_end_date: end_date,
  });

  if (error) {
    console.error('Error fetching budget summary:', error);
    throw error;
  }
  return data || [];
};

/**
 * Mengambil semua alokasi dana untuk periode tertentu.
 */
export const getAllocationsByPeriod = async (household_id: string, period: string): Promise<BudgetAllocation[]> => {
  const { data, error } = await supabase
    .from('budget_allocations')
    .select('*')
    .eq('household_id', household_id)
    .eq('period', period);

  if (error) {
    console.error('Error fetching allocations:', error);
    throw error;
  }
  return data || [];
};

/**
 * PERBAIKAN UTAMA FINAL: Menyimpan (membuat atau memperbarui) satu alokasi dana
 * dengan memanggil fungsi RPC `upsert_budget_allocation`.
 */
export const saveAllocation = async (allocation: Partial<BudgetAllocation>) => {
  const { error } = await supabase.rpc('upsert_budget_allocation', {
      p_household_id: allocation.household_id,
      p_period: allocation.period,
      p_budget_id: allocation.budget_id,
      p_category_id: allocation.category_id, // Akan menjadi NULL jika tidak ada
      p_amount: allocation.amount
  });

  if (error) {
    console.error('Error saving allocation:', error);
    throw error;
  }
};

/**
 * Menghapus satu alokasi dana.
 */
export const deleteAllocation = async (
  household_id: string,
  period: string,
  budget_id: number,
  category_id?: number | null
) => {
  let query = supabase
    .from('budget_allocations')
    .delete()
    .eq('household_id', household_id)
    .eq('period', period)
    .eq('budget_id', budget_id);

  if (category_id) {
    query = query.eq('category_id', category_id);
  } else {
    query = query.is('category_id', null);
  }

  const { error } = await query;
  if (error) {
    console.error('Error deleting allocation:', error);
    throw error;
  }
};