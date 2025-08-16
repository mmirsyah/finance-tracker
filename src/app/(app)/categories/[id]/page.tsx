// src/app/(app)/categories/[id]/page.tsx

import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CategoryDetailView from './CategoryDetailView';
import { Transaction, Category } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { getCustomPeriod } from '@/lib/periodUtils';
import { format } from 'date-fns';

// --- PERBAIKAN UTAMA: Kembalikan PageProps dan definisikan params sebagai Promise ---
type PageProps = {
  params: Promise<{ id: string }>;
};

// Fungsi fetchData tidak berubah
async function fetchData(supabase: SupabaseClient, categoryId: number, householdId: string) {
  const { data: category, error: categoryError } = await supabase
    .from('categories').select('*, parent:parent_id ( name )').eq('id', categoryId).single();
  
  if (categoryError) {
    console.error("Error fetching category:", categoryError);
    return { category: null, transactions: [], analytics: null };
  }

  const { data: categoryIdsData, error: rpcError } = await supabase.rpc('get_category_with_descendants', { p_category_id: categoryId });
  if (rpcError) {
    console.error("RPC Error fetching descendants:", rpcError);
    return { category: category as Category, transactions: [], analytics: null };
  }
  const allCategoryIds = categoryIdsData.map((r: {id: number}) => r.id);

  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions').select('*, accounts:account_id (name), to_account:to_account_id (name)')
    .eq('household_id', householdId)
    .in('category', allCategoryIds)
    .order('date', { ascending: false });
  
  if (transactionsError) {
    console.error("Error fetching transactions:", transactionsError);
  }

  const { data: profile } = await supabase.from('profiles').select('period_start_day').eq('household_id', householdId).limit(1).single();
  const period = getCustomPeriod(profile?.period_start_day || 1);
  const startDate = format(period.from, 'yyyy-MM-dd');
  const endDate = format(period.to, 'yyyy-MM-dd');

  const { data: analytics, error: analyticsError } = await supabase.rpc('get_category_analytics', {
    p_household_id: householdId,
    p_category_id: categoryId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (analyticsError) {
      console.error("Error fetching category analytics:", analyticsError);
  }

  return { 
    category: category as Category & { parent: { name: string } | null }, 
    transactions: (transactions as Transaction[]) || [],
    analytics: analytics || {}
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  // --- PERBAIKAN KEDUA: Gunakan 'await' untuk membuka Promise params ---
  const { id } = await params;
  const categoryId = Number(id);

  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { notFound(); }

  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', session.user.id).single();
  if (!profile?.household_id) { notFound(); }

  const { category, transactions, analytics } = await fetchData(supabase, categoryId, profile.household_id);
  
  if (!category) { notFound(); }
  
  return (
    <CategoryDetailView 
      initialCategory={category}
      initialTransactions={transactions}
      initialAnalytics={analytics}
    />
  );
}