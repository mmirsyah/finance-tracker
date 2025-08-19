// src/lib/accountService.ts
import { createClient } from '@/utils/supabase/client';
import { Account } from '@/types';

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
  const { id } = account;
  let error;

  if (id) {
    // --- MODE EDIT ---
    const updatePayload = {
      name: account.name,
      initial_balance: account.initial_balance,
      type: account.type,
      target_amount: account.target_amount,
      goal_reason: account.goal_reason,
      // --- TAMBAHAN UNTUK ASET ---
      asset_class: account.asset_class,
      unit: account.unit
    };
    ({ error } = await supabase.from('accounts').update(updatePayload).eq('id', id));

  } else {
    // --- MODE BUAT BARU ---
    const insertPayload = {
      name: account.name,
      initial_balance: account.initial_balance,
      type: account.type,
      target_amount: account.target_amount,
      goal_reason: account.goal_reason,
      household_id: account.household_id,
      user_id: account.user_id,
      // --- TAMBAHAN UNTUK ASET ---
      asset_class: account.asset_class,
      unit: account.unit,
    };
    ({ error } = await supabase.from('accounts').insert(insertPayload));
  }

  if (error) {
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
export const reassignAndDeleteAccount = async (fromAccountId: string, toAccountId: string) => {
    await reassignTransactions(fromAccountId, toAccountId);
    await deleteAccount(fromAccountId);
};