// src/lib/categoryService.ts
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';

/**
 * Menyimpan (membuat atau memperbarui) kategori.
 * @param category - Objek kategori parsial dengan data yang akan disimpan.
 * @param user_id - ID pengguna yang sedang login.
 * @param household_id - ID household pengguna.
 * @returns Promise yang resolve jika berhasil, atau reject dengan error jika gagal.
 */
export const saveCategory = async (
  category: Partial<Category>,
  user_id: string,
  household_id: string
) => {
  const { id, ...dataToSave } = category;
  const payload = {
    ...dataToSave,
    user_id,
    household_id,
  };

  let query;
  if (id) {
    query = supabase.from('categories').update(payload).eq('id', id);
  } else {
    query = supabase.from('categories').insert([payload]);
  }

  const { error } = await query;
  if (error) throw error;
};

/**
 * Menghapus kategori.
 * @param categoryId - ID kategori yang akan dihapus.
 * @returns Promise yang resolve jika berhasil, atau reject dengan error jika gagal.
 */
export const deleteCategory = async (categoryId: number) => {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
};

/**
 * Memindahkan transaksi dari kategori lama ke kategori baru, lalu menghapus kategori lama.
 * @param oldCategoryId - ID kategori yang akan dihapus.
 * @param newCategoryId - ID kategori tujuan pemindahan transaksi.
 * @returns Promise yang resolve jika berhasil, atau reject dengan error jika gagal.
 */
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
