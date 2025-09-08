// src/lib/budgetService.ts

import { supabase } from './supabase';
import { BudgetPageData, BudgetAssignment, BudgetHistoryData } from '@/types';
import { format } from 'date-fns';
import { createClient } from '@/utils/supabase/client';
import { BudgetSummaryItem, BudgetCategoryListItem } from '@/types';

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
  try {
    const formattedDate = format(currentPeriodStart, 'yyyy-MM-dd');
    console.log('Calling get_category_spending_history with:', { 
      p_household_id: householdId, 
      p_category_id: categoryId, 
      p_current_period_start: formattedDate 
    });
    
    const { data, error } = await supabase.rpc('get_category_spending_history', {
      p_household_id: householdId,
      p_category_id: categoryId,
      p_current_period_start: formattedDate,
    });

    if (error) {
      console.error('Error fetching category spending history:', error);
      console.error('Parameters:', { householdId, categoryId, currentPeriodStart: formattedDate });
      throw new Error(`Failed to fetch category spending history: ${error.message || error.code || 'Unknown error'}`);
    }
    
    // Memastikan semua field dikonversi ke tipe number yang benar
    if (data && data.length > 0) {
      const result = data[0];
      return {
        last_month_spending: Number(result.last_month_spending),
        three_month_avg: Number(result.three_month_avg),
        six_month_avg: Number(result.six_month_avg),
        last_month_budget: Number(result.last_month_budget),
        monthly_history: result.monthly_history.map((item: { month: string; Pengeluaran: number }) => ({
          ...item,
          Pengeluaran: Number(item.Pengeluaran)
        }))
      } as BudgetHistoryData;
    }
    
    return null;
  } catch (err) {
    console.error('Unexpected error in getCategorySpendingHistory:', err);
    throw new Error(`Unexpected error fetching category spending history: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

export const getBudgetSummary = async (
  period: string
): Promise<BudgetSummaryItem[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_quick_budget_overview', {
    p_ref_date: period,
  });

  if (error) {
    console.error('Error fetching budget summary:', error.message);
    throw new Error('Failed to fetch budget summary.');
  }

  return data as BudgetSummaryItem[];
};

export const getBudgetPriorities = async (): Promise<number[]> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_budget_priorities')
    .select('category_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching budget priorities:', error);
    return [];
  }

  return data.map(item => item.category_id);
};

/**
 * Menetapkan sebuah kategori sebagai prioritas untuk pengguna saat ini.
 */
export const setBudgetPriority = async (categoryId: number) => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('User not authenticated');

  // Kita perlu household_id untuk RLS
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) throw new Error('Household not found');

  const { error } = await supabase
    .from('user_budget_priorities')
    .insert({
      user_id: user.id,
      category_id: categoryId,
      household_id: profile.household_id,
    });

  if (error) {
    console.error('Error setting budget priority:', error);
    throw error;
  }
};

/**
 * Menghapus prioritas sebuah kategori untuk pengguna saat ini.
 */
export const removeBudgetPriority = async (categoryId: number) => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_budget_priorities')
    .delete()
    .match({ user_id: user.id, category_id: categoryId });

  if (error) {
    console.error('Error removing budget priority:', error);
    throw error;
  }
};

  export const getAllBudgetCategoriesForPeriod = async (
  _period: string
): Promise<{
  tracked: BudgetCategoryListItem[];
  untracked: BudgetCategoryListItem[];
}> => {
  const supabase = createClient();
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, parent_id, is_archived, type')
    .eq('type', 'expense');

  console.log("Fetched categories from DB:", categories);

  if (categoriesError) {
    console.error(
      'Error fetching all categories:',
      categoriesError.message
    );
    throw new Error('Failed to fetch categories.');
  }

  const activeCategories = categories.filter(cat => !cat.is_archived);
  console.log("Active categories (not archived):", activeCategories);

  const priorities = await getBudgetPriorities();
  console.log("Budget Priorities:", priorities);

  const tracked = activeCategories
    .filter(cat => priorities.includes(cat.id))
    .map(cat => ({ category_id: cat.id, category_name: cat.name, parent_id: cat.parent_id, type: cat.type }));
  console.log("Tracked categories:", tracked);

  const untracked = activeCategories
    .filter(cat => !priorities.includes(cat.id))
    .map(cat => ({ category_id: cat.id, category_name: cat.name, parent_id: cat.parent_id, type: cat.type }));
  console.log("Untracked categories:", untracked);

  return { tracked, untracked };
};