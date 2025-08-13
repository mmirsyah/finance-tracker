import { createClient } from '@/utils/supabase/client';
import { Account } from '@/types';

// Inisialisasi Supabase client dengan cara yang baru
const supabase = createClient();

/**
 * Mengambil semua akun untuk satu household.
 */
export const getAccounts = async (household_id: string): Promise<Account[]> => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('household_id', household_id);

  if (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
  return data || [];
};

/**
 * Menyimpan (membuat atau memperbarui) satu akun.
 */
export const saveAccount = async (account: Partial<Account>) => {
  const { id, name, initial_balance, ...otherData } = account;

  let error;

  if (id) {
    // --- PERBAIKAN DI SINI ---
    // Saat mengedit, hanya kirim data yang boleh diubah untuk menghindari error RLS.
    const updateData = {
      name,
      initial_balance,
    };
    ({ error } = await supabase.from('accounts').update(updateData).eq('id', id));
  } else {
    // Saat membuat baru, kirim semua data yang diperlukan.
    const insertData = {
      name,
      initial_balance,
      household_id: otherData.household_id,
      user_id: otherData.user_id,
    };
    ({ error } = await supabase.from('accounts').insert(insertData));
  }

  if (error) {
    // Log error yang lebih detail di console untuk debugging
    console.error('Error saving account:', error);
    throw error;
  }
};

/**
 * Menghapus satu akun.
 */
export const deleteAccount = async (id: string) => {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

/**
 * Memindahkan transaksi dari satu akun ke akun lain.
 */
export const reassignTransactions = async (fromAccountId: string, toAccountId: string) => {
    const { error } = await supabase.rpc('reassign_transactions', {
        from_account_id: fromAccountId,
        to_account_id: toAccountId
    });

    if (error) {
        console.error('Error reassigning transactions:', error);
        throw error;
    }
};

/**
 * Memindahkan transaksi dari satu akun dan kemudian menghapus akun tersebut.
 */
// PERBAIKAN: Typo 'Delele' menjadi 'Delete'
export const reassignAndDeleteAccount = async (fromAccountId: string, toAccountId: string) => {
    // Langkah 1: Pindahkan semua transaksi ke akun baru
    await reassignTransactions(fromAccountId, toAccountId);
    
    // Langkah 2: Setelah berhasil, hapus akun lama
    await deleteAccount(fromAccountId);
};
