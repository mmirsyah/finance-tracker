// src/lib/categoryService.ts
import { supabase } from './supabase';
import { Category, CategorySpendingHistory } from '@/types';
import { format } from 'date-fns';

export const saveCategory = async (category: Partial<Category>) => {
    const { id, ...dataToSave } = category;
    const query = id
      ? supabase.from('categories').update(dataToSave).eq('id', id)
      : supabase.from('categories').insert([dataToSave]);

    const { error } = await query;
    if (error) {
        console.error("Error saving category:", error);
        throw error;
    }
}

export const deleteCategory = async (id: number) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
}

export const reassignTransactionsToCategory = async (fromCategoryId: number, toCategoryId: number) => {
    const { error } = await supabase.rpc('reassign_transactions_to_category', {
        from_category_id: fromCategoryId,
        to_category_id: toCategoryId
    });
    if (error) {
        console.error("Error reassigning transactions:", error);
        throw error;
    }
}

// --- FUNGSI BARU DITAMBAHKAN DI SINI ---
export const reassignAndDeleteCategory = async (fromCategoryId: number, toCategoryId: number) => {
    await reassignTransactionsToCategory(fromCategoryId, toCategoryId);
    await deleteCategory(fromCategoryId);
}
// --- AKHIR PENAMBAHAN ---

export const getCategoryAnalytics = async (householdId: string, categoryId: number, from: Date, to: Date) => {
    const { data, error } = await supabase.rpc('get_category_analytics', {
        p_household_id: householdId,
        p_category_id: categoryId,
        p_start_date: format(from, 'yyyy-MM-dd'),
        p_end_date: format(to, 'yyyy-MM-dd')
    });

    if (error) {
        console.error("Error fetching category analytics:", error);
        throw error;
    }
    return data;
}

export const getCategorySpendingHistory = async (householdId: string, categoryId: number, referenceDate: Date, periodStartDay: number | null): Promise<CategorySpendingHistory | null> => {
    const { data, error } = await supabase.rpc('get_category_spending_history', {
        p_household_id: householdId,
        p_category_id: categoryId,
        p_reference_date: format(referenceDate, 'yyyy-MM-dd'),
        p_period_start_day: periodStartDay
    });

    if (error) {
        console.error('Error fetching category spending history:', error);
        throw error;
    }
    return data?.[0] || null;
}