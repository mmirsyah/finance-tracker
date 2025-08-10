// src/lib/transactionService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Transaction } from '@/types';

// Gunakan tipe turunan yang lebih spesifik, hilangkan 'any'
type TransactionPayload = Omit<Transaction, 'id' | 'categories' | 'accounts' | 'to_account' | 'sequence_number' | 'household_id'> & { household_id: string };

async function getHouseholdId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', userId).single();
  return profile?.household_id || null;
}

export async function fetchCategories(supabase: SupabaseClient, userId: string) {
  const householdId = await getHouseholdId(supabase, userId);
  if (!householdId) return [];
  const { data, error } = await supabase.from('categories').select('*').eq('household_id', householdId).order('name');
  if (error) { console.error('Error fetching categories:', error); return []; }
  return data || [];
}

export async function fetchAccounts(supabase: SupabaseClient, userId: string) {
  const householdId = await getHouseholdId(supabase, userId);
  if (!householdId) return [];
  const { data, error } = await supabase.from('accounts').select('*').eq('household_id', householdId).order('name');
  if (error) { console.error('Error fetching accounts:', error); return []; }
  return data || [];
}

export async function saveTransaction(supabase: SupabaseClient, payload: TransactionPayload, editId: string | null) {
  let query;
  if (editId) {
    query = supabase.from('transactions').update(payload).eq('id', editId);
  } else {
    query = supabase.from('transactions').insert([payload]);
  }
  const { error } = await query;
  if (error) {
    console.error("RAW SAVE TRANSACTION ERROR:", JSON.stringify(error, null, 2));
    alert(`Failed to save transaction: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * ====================================================================
 * FUNGSI BARU DITAMBAHKAN DI SINI UNTUK DIAGNOSTIK
 * ====================================================================
 * Mengambil semua transaksi 'expense' dalam rentang tanggal tertentu.
 */
export const getExpensesByPeriod = async (
  supabase: SupabaseClient, // Menambahkan supabase sebagai argumen agar konsisten
  household_id: string,
  period_start: string,
  period_end: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', household_id)
    .eq('type', 'expense')
    .gte('date', period_start)
    .lte('date', period_end);
    
  if (error) {
    console.error('Error fetching expenses by period:', error);
    throw error;
  }

  return data || [];
};