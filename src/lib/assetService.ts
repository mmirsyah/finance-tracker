// src/lib/assetService.ts
import { supabase } from '@/lib/supabase';
// --- PERBAIKAN: Hapus import 'Asset' yang tidak digunakan ---
import { AssetTransaction, AssetSummary } from '@/types';
import { toast } from 'sonner';

/**
 * Fetches all asset summaries for a given household using the RPC function.
 */
export const getAssetSummaries = async (householdId: string): Promise<AssetSummary[]> => {
  const { data, error } = await supabase.rpc('get_assets_with_details', {
    p_household_id: householdId,
  });
  if (error) {
    console.error('Error fetching asset summaries:', error);
    throw error;
  }
  return data || [];
};

/**
 * Fetches all transactions for a specific asset account.
 */
export const getAssetTransactions = async (assetAccountId: string): Promise<AssetTransaction[]> => {
    const { data, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .eq('asset_account_id', assetAccountId)
        .order('transaction_date', { ascending: false });

    if (error) {
        console.error('Error fetching asset transactions:', error);
        throw error;
    }
    return data || [];
}

/**
 * Saves (creates or updates) an asset transaction.
 */
export const saveAssetTransaction = async (transaction: Partial<AssetTransaction>) => {
    const { id, ...dataToSave } = transaction;

    const query = id
        ? supabase.from('asset_transactions').update(dataToSave).eq('id', id)
        : supabase.from('asset_transactions').insert([dataToSave]).select().single();

    const { data, error } = await query;
    
    if (error) {
        console.error('Error saving asset transaction:', error);
        throw error;
    }
    return data;
};

/**
 * Deletes an asset transaction and its related financial transaction.
 */
export const deleteAssetTransaction = async (transactionId: number, relatedTransactionId: string | null | undefined) => {
    if (relatedTransactionId) {
        const { error: financialTxError } = await supabase.from('transactions').delete().eq('id', relatedTransactionId);
        if (financialTxError) {
            console.error('Could not delete related financial transaction:', financialTxError.message);
            throw new Error(`Failed to delete financial record: ${financialTxError.message}`);
        }
    }

    const { error: assetTxError } = await supabase.from('asset_transactions').delete().eq('id', transactionId);
    if (assetTxError) {
        console.error('Error deleting asset transaction:', assetTxError);
        toast.warning('Financial transaction was deleted, but asset record deletion failed. Please check your data.');
        throw assetTxError;
    }
};