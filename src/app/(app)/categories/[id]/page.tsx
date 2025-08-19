// src/app/(app)/categories/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CategoryDetailView from './CategoryDetailView';
import { Category } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

type PageProps = {
  // --- PERBAIKAN: Mengembalikan tipe params ke Promise ---
  params: Promise<{ id: string }>;
};

async function fetchData(supabase: SupabaseClient, categoryId: number, householdId: string) {
  const { data: category, error } = await supabase
    .from('categories')
    .select('*, parent:parent_id ( name )')
    .eq('id', categoryId)
    .eq('household_id', householdId)
    .single();

  if (error) {
    console.error("Error fetching category:", error);
    return { category: null };
  }
  
  return { 
    category: category as Category & { parent: { name: string } | null }
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  // --- PERBAIKAN: Menambahkan kembali 'await' ---
  const { id } = await params;
  const categoryId = Number(id);
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { notFound(); }

  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single();
  if (!profile?.household_id) { notFound(); }

  const { category } = await fetchData(supabase, categoryId, profile.household_id);
  
  if (!category) {
    notFound();
  }
  
  return (
    <CategoryDetailView 
      initialCategory={category}
    />
  );
}