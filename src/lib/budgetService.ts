// src/lib/budgetService.ts

import { supabase } from './supabase';
import { BudgetPageData, BudgetAssignment, BudgetHistoryData } from '@/types';
import { format } from 'date-fns';

/**
 * Mengambil seluruh data yang dibutuhkan untuk halaman budget pada rentang tanggal tertentu.
 */
export const getBudgetDataForPeriod = async (household_id: string, startDate: Date, endDate: Date): Promise<BudgetPageData | null> => {
  const { data, error } = await supabase.rpc('get_budget_data', {
    p_household_id: household_id,
    p_start_date: format(startDate, 'yyyy-MM-dd'),
    p_end_date: format(endDate, 'yyyy-MM-dd'),
  });

  if (error) {
    console.error('Error fetching budget data:', error);
    throw error;
  }
  
  // --- PERBAIKAN DI SINI ---
  // Fungsi RPC yang 'RETURNS TABLE' akan mengembalikan array.
  // Karena kita tahu fungsi ini hanya mengembalikan satu baris, kita ambil elemen pertama [0].
  return (data && data.length > 0 ? data[0] : null) as BudgetPageData | null;
};


/**
 * Mengambil nilai "Ready to Assign" yang sekarang bersifat global.
 */
export const getReadyToAssign = async (household_id: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_ready_to_assign_value', {
      p_household_id: household_id,
    });
  
    if (error) {
      console.error('Error fetching ready to assign value:', error);
      throw error;
    }
    return data || 0;
};


/**
 * Menyimpan (membuat atau memperbarui) satu alokasi dana untuk kategori tertentu.
 */
export const saveBudgetAssignment = async (assignment: Omit<BudgetAssignment, 'id' | 'created_at'>) => {
    const { error } = await supabase.rpc('upsert_budget_assignment', {
        p_household_id: assignment.household_id,
        p_category_id: assignment.category_id,
        p_month: assignment.month,
        p_amount: assignment.assigned_amount,
    });

    if (error) {
        console.error('Error saving budget assignment:', error);
        throw error;
    }
};

/**
 * Mengubah status rollover untuk sebuah kategori.
 */
export const updateCategoryRolloverStatus = async (
    categoryId: number,
    isRollover: boolean
) => {
    const { error } = await supabase.rpc('update_category_rollover_status', {
      p_category_id: categoryId,
      p_is_rollover: isRollover,
    });
  
    if (error) {
      console.error('Error updating category rollover status:', error);
      throw error;
    }
};

/**
 * Mengubah status Flex Budget untuk kategori induk.
 */
export const toggleFlexBudgetStatus = async (
    householdId: string,
    categoryId: number,
    month: Date,
    isFlex: boolean
) => {
    const { error } = await supabase.rpc('toggle_flex_budget_status', {
        p_household_id: householdId,
        p_category_id: categoryId,
        p_month: format(month, 'yyyy-MM-01'),
        p_is_flex: isFlex,
    });

    if (error) {
        console.error('Error toggling flex budget status:', error);
        throw error;
    }
};

/**
 * FUNGSI BARU: Mengambil histori pengeluaran untuk sebuah kategori.
 */
export const getCategorySpendingHistory = async (
  householdId: string,
  categoryId: number,
  currentPeriodStart: Date
): Promise<BudgetHistoryData | null> => {
  const { data, error } = await supabase.rpc('get_category_spending_history', {
    p_household_id: householdId,
    p_category_id: categoryId,
    p_current_period_start: format(currentPeriodStart, 'yyyy-MM-dd'),
  });

  if (error) {
    console.error('Error fetching category spending history:', error);
    throw error;
  }
  return (data && data.length > 0 ? data[0] : null) as BudgetHistoryData | null;
};