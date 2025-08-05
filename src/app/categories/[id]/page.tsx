// src/app/categories/[id]/page.tsx

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import CategoryDetailView from './CategoryDetailView';
import { Transaction} from '@/types';
import { SupabaseClient } from '@supabase/supabase-js'; // <-- Import tipe data SupabaseClient

// Definisikan tipe untuk params Promise
type PageProps = {
  params: Promise<{ id: string }>;
};

// Fungsi untuk mengambil data di server
// PERBAIKAN: Berikan tipe yang benar untuk 'supabase'
async function fetchData(supabase: SupabaseClient, categoryId: number, userId: string) {
  const { data: category, error: categoryError } = await supabase
    .from('categories').select('*').eq('id', categoryId).single();
  
  if (categoryError) {
    console.error("Error fetching category:", categoryError);
    return { category: null, transactions: [] };
  }

  const { data: categoryIds, error: rpcError } = await supabase.rpc('get_category_with_descendants', { p_category_id: categoryId });
  if (rpcError) {
    console.error("Error fetching descendant categories:", rpcError);
    return { category, transactions: [] };
  }
  const allCategoryIds = categoryIds.map((row: { id: number }) => row.id);

  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions').select('*, accounts:account_id (name), to_account:to_account_id (name)')
    .in('category', allCategoryIds).eq('user_id', userId).order('date', { ascending: false });
  
  if (transactionsError) {
    console.error("Error fetching transactions:", transactionsError);
    return { category, transactions: [] };
  }

  return { category, transactions: transactions as Transaction[] };
}

// Halaman "Manajer" (Server Component)
export default async function CategoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const categoryId = Number(id);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return notFound();
  }

  const { category, transactions } = await fetchData(supabase, categoryId, session.user.id);
  
  if (!category) {
    notFound();
  }
  
  return (
    <CategoryDetailView 
      initialCategory={category}
      initialTransactions={transactions}
    />
  );
}