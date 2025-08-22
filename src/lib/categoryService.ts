// src/lib/categoryService.ts
import { supabase } from './supabase';
// --- PERBAIKAN: Hapus impor 'CategorySpendingHistory' yang tidak digunakan ---
import { Category } from '@/types';
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

export const setCategoryArchiveStatus = async (categoryId: number, archiveStatus: boolean) => {
    const { error } = await supabase
        .from('categories')
        .update({ is_archived: archiveStatus })
        .eq('id', categoryId);

    if (error) {
        console.error("Error updating category archive status:", error);
        throw error;
    }
};

// --- FUNGSI YANG DIKEMBALIKAN ---
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