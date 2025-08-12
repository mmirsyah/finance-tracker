// src/lib/categoryService.ts
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';

/**
 * Menyimpan (membuat atau memperbarui) kategori.
 */
export const saveCategory = async (
  category: Partial<Category>,
  user_id: string,
  household_id: string
) => {
  // Pisahkan ID dari sisa data yang akan disimpan
  const { id, ...dataToSave } = category;

  const payload = {
    ...dataToSave,
    user_id,
    household_id,
  };

  let query;
  if (id) {
    // Jika ada ID, kita UPDATE data yang ada
    query = supabase.from('categories').update(payload).eq('id', id);
  } else {
    // Jika tidak ada ID, kita INSERT data baru (tanpa menyertakan properti 'id')
    query = supabase.from('categories').insert([payload]);
  }

  const { error } = await query;
  if (error) {
    console.error("Error saving category:", error); // Tambahkan log untuk debugging
    throw error;
  }
};

// Fungsi deleteCategory tidak berubah
export const deleteCategory = async (categoryId: number) => {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
};

// Fungsi reassignAndDeleleCategory tidak berubah
export const reassignAndDeleleCategory = async (
  oldCategoryId: number,
  newCategoryId: number
) => {
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ category: newCategoryId })
    .eq('category', oldCategoryId);
  if (updateError) throw new Error(`Failed to reassign transactions: ${updateError.message}`);

  await deleteCategory(oldCategoryId);
};