// src/lib/transactionService.ts
import { SupabaseClient } from '@supabase/supabase-js';

type TransactionPayload = {
  type: string;
  amount: number;
  category: number | null;
  account_id: string;
  to_account_id: string | null;
  note: string | null;
  date: string;
  user_id: string;
  household_id: string;
};

export async function fetchCategories(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', userId).single();
  if (!profile) return [];
  const { data, error } = await supabase.from('categories').select('*').eq('household_id', profile.household_id).order('name');
  if (error) { console.error('Error fetching categories:', error); return []; }
  return data || [];
}

export async function fetchAccounts(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', userId).single();
  if (!profile) return [];
  const { data, error } = await supabase.from('accounts').select('*').eq('household_id', profile.household_id).order('name');
  if (error) { console.error('Error fetching accounts:', error); return []; }
  return data || [];
}

export async function saveTransaction(supabase: SupabaseClient, payload: TransactionPayload, editId: string | null) {
  let query;
  if (editId) {
    const { id, ...dataToSave } = payload as any; // Hapus id dari payload update
    query = supabase.from('transactions').update(dataToSave).eq('id', editId);
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