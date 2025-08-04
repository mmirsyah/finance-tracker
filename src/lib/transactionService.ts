// src/lib/transactionService.ts

import { SupabaseClient } from '@supabase/supabase-js';

// Tipe untuk payload saat menyimpan data
type TransactionPayload = {
  type: string;
  amount: number;
  category: string;
  account_id: string;
  note: string | null;
  date: string;
  user_id: string;
};

/**
 * Mengambil semua kategori milik pengguna.
 */
export async function fetchCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
}

/**
 * Mengambil semua akun milik pengguna.
 */
export async function fetchAccounts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name');
  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
  return data || [];
}

/**
 * Menyimpan atau memperbarui transaksi.
 */
export async function saveTransaction(
  supabase: SupabaseClient,
  payload: TransactionPayload,
  editId: string | null
) {
  if (editId) {
    // Mode Update
    const { error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', editId);
    if (error) {
      // Log error detail untuk Update
      console.error("====================================");
      console.error("RAW SUPABASE UPDATE ERROR:");
      console.error(JSON.stringify(error, null, 2));
      console.error("====================================");
      alert(`Gagal memperbarui transaksi: ${error.message}`);
      return false;
    }
  } else {
    // Mode Insert
    const { error } = await supabase
      .from('transactions')
      .insert([payload]);
    if (error) {
      // Log error detail untuk Insert
      console.error("====================================");
      console.error("RAW SUPABASE INSERT ERROR:");
      console.error(JSON.stringify(error, null, 2));
      console.error("====================================");
      alert(`Gagal menyimpan transaksi: ${error.message}`);
      return false;
    }
  }
  return true; // Sukses
}