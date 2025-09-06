// src/lib/transactionService.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Transaction } from '@/types';
import { supabase } from './supabase';
import { db } from './db'; // Import instance Dexie
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { toast } from 'sonner';

// Fungsi helper tidak berubah
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

// --- FUNGSI SAVE TRANSACTION YANG DIPERBARUI ---
export async function saveTransaction(payload: Partial<Transaction>): Promise<Transaction> {
  // Untuk edit, kita asumsikan selalu online untuk saat ini
  if (payload.id && !String(payload.id).startsWith('temp_')) {
    const { data, error } = await supabase.from('transactions').update(payload).eq('id', payload.id).select().single();
    if (error) {
      toast.error(`Failed to update transaction: ${error.message}`);
      throw error;
    }
    return data as Transaction;
  }

  // Logika untuk Tambah Baru atau Edit item offline
  if (navigator.onLine) {
    // --- ONLINE ---
    const payloadWithoutId = { ...payload };
    delete payloadWithoutId.id; // Hapus id sementara secara eksplisit
    const { data, error } = await supabase.from('transactions').insert([payloadWithoutId]).select().single();
    if (error) {
      toast.error(`Failed to save transaction: ${error.message}`);
      throw error;
    }
    // Perbarui data di Dexie juga agar konsisten
    await db.transactions.put(data as Transaction);
    return data as Transaction;

  } else {
    // --- OFFLINE ---
    const tempId = payload.id || `temp_${uuidv4()}`;
    const transactionWithTempId = { ...payload, id: tempId, created_at: new Date().toISOString() } as Transaction;

    try {
      // Simpan ke Dexie untuk pembaruan UI optimis
      await db.transactions.put(transactionWithTempId);

      // Tambahkan ke antrian sinkronisasi
      await db.syncQueue.add({
        type: 'transaction_add',
        payload: transactionWithTempId,
        timestamp: Date.now(),
      });

      toast.info("You are offline. Transaction saved locally and will sync later.");
      return transactionWithTempId;
    } catch (e) {
      toast.error("Failed to save transaction locally.");
      console.error(e);
      throw e;
    }
  }
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  // For now, we assume online for deletion
  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
  if (error) {
    toast.error(`Failed to delete transaction: ${error.message}`);
    throw error;
  }
}

// Fungsi lain tidak berubah untuk saat ini...
export const getExpensesByPeriod = async (
  supabase: SupabaseClient,
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

export const bulkUpdateCategory = async (transactionIds: string[], newCategoryId: number) => {
    const { data, error } = await supabase.rpc('bulk_update_transaction_category', {
        transaction_ids: transactionIds,
        new_category_id: newCategoryId
    });

    if (error) {
        console.error("Error in bulk update RPC:", error);
        throw new Error(error.message);
    }

    return data;
};