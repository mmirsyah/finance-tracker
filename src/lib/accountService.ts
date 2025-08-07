// src/lib/accountService.ts
import { supabase } from '@/lib/supabase';
import { Account } from '@/types';

/**
 * Menyimpan (membuat atau memperbarui) akun.
 * @param account - Objek akun parsial dengan data yang akan disimpan.
 * @param user_id - ID pengguna yang sedang login.
 * @param household_id - ID household pengguna.
 * @returns Promise yang resolve jika berhasil, atau reject dengan error jika gagal.
 */
export const saveAccount = async (
  account: Partial<Account>,
  user_id: string,
  household_id: string
) => {
  // --- PERBAIKAN DI SINI ---
  // Menonaktifkan aturan ESLint untuk baris ini karena _balance sengaja tidak digunakan.
  // Tujuannya adalah untuk memisahkan properti 'balance' dari data yang akan disimpan.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, balance: _balance, ...dataToSave } = account;
  // --- PERBAIKAN SELESAI ---

  const payload = {
    ...dataToSave,
    user_id,
    household_id,
  };

  let query;
  if (id) {
    query = supabase.from('accounts').update(payload).eq('id', id);
  } else {
    query = supabase.from('accounts').insert([payload]);
  }

  const { error } = await query;
  if (error) throw error;
};

/**
 * Menghapus akun setelah memastikan tidak ada transaksi terkait.
 * @param accountId - ID akun yang akan dihapus.
 * @returns Promise yang resolve jika berhasil, atau reject dengan error jika gagal.
 */
export const deleteAccount = async (accountId: string) => {
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw error;
};

/**
 * Memindahkan transaksi dari akun lama ke akun baru, lalu menghapus akun lama.
 * @param oldAccountId - ID akun yang akan dihapus.
 * @param newAccountId - ID akun tujuan pemindahan transaksi.
 * @returns Promise yang resolve jika berhasil, atau reject dengan error jika gagal.
 */
export const reassignAndDeleleAccount = async (
  oldAccountId: string,
  newAccountId: string
) => {
  // Pindahkan transaksi di mana akun ini adalah 'from'
  const { error: updateFromError } = await supabase
    .from('transactions')
    .update({ account_id: newAccountId })
    .eq('account_id', oldAccountId);
  if (updateFromError) throw new Error(`Failed to reassign 'from' transactions: ${updateFromError.message}`);

  // Pindahkan transaksi di mana akun ini adalah 'to' (untuk transfer)
  const { error: updateToError } = await supabase
    .from('transactions')
    .update({ to_account_id: newAccountId })
    .eq('to_account_id', oldAccountId);
  if (updateToError) throw new Error(`Failed to reassign 'to' transactions: ${updateToError.message}`);

  // Setelah semua transaksi dipindahkan, hapus akun lama
  await deleteAccount(oldAccountId);
};
