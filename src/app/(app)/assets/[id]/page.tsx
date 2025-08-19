// src/app/(app)/assets/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import AssetDetailView from './AssetDetailView';
import { Account, AssetTransaction } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

type PageProps = {
  // --- PERBAIKAN: Mengembalikan tipe params ke Promise ---
  params: Promise<{ id: string }>;
};

async function fetchData(supabase: SupabaseClient, accountId: string, householdId: string) {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('household_id', householdId)
    .eq('type', 'asset')
    .single();
  
  if (accountError) {
    console.error("Error fetching asset account:", accountError);
    return { account: null, transactions: [] };
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from('asset_transactions')
    .select('*')
    .eq('asset_account_id', accountId)
    .order('transaction_date', { ascending: false });
  
  if (transactionsError) {
    console.error("Error fetching asset transactions:", transactionsError);
  }

  return { 
    account: account as Account, 
    transactions: (transactions as AssetTransaction[]) || []
  };
}

export default async function AssetDetailPage({ params }: PageProps) {
  // --- PERBAIKAN: Menambahkan kembali 'await' ---
  const { id } = await params;
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { notFound(); }

  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single();
  if (!profile?.household_id) { notFound(); }

  const { account, transactions } = await fetchData(supabase, id, profile.household_id);
  
  if (!account) {
    notFound();
  }
  
  return (
    <AssetDetailView 
      initialAssetAccount={account}
      initialTransactions={transactions}
    />
  );
}