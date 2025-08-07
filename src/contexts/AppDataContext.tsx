// src/contexts/AppDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'; // <-- PERBAIKAN DI SINI
import { supabase } from '@/lib/supabase';
import { Account, Category } from '@/types';
import { User } from '@supabase/supabase-js';


interface AppDataContextType {
  accounts: Account[];
  categories: Category[];
  isLoading: boolean;
  user: User | null;
  householdId: string | null;
  refetchData: () => void;
}


const AppDataContext = createContext<AppDataContextType | undefined>(undefined);


export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const fetchData = async (currentUser: User, currentHouseholdId: string) => {
    // Jangan set isLoading di sini agar tidak ada kedipan saat refetch
    try {

      const [accountsRes, categoriesRes] = await Promise.all([
        supabase.rpc('get_accounts_with_balance', { p_user_id: currentUser.id }),
        supabase.from('categories').select('*').eq('household_id', currentHouseholdId).order('name')
      ]);


      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching app data:", error);

    } finally {
      setIsLoading(false); // Pastikan loading selesai
    }
  };

  const refetchData = useCallback(() => {
    if (user && householdId) {
      console.log('Refetching data due to realtime update...');
      fetchData(user, householdId);
    }
  }, [user, householdId]);


  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('household_id')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.household_id) {
          setHouseholdId(profile.household_id);
          await fetchData(session.user, profile.household_id);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // --- PENAMBAHAN REALTIME LISTENER DIMULAI DI SINI ---
  useEffect(() => {
    if (!householdId) return;

    // Listener untuk perubahan pada tabel transactions
    const transactionsChannel = supabase
      .channel('public:transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `household_id=eq.${householdId}` },
        (payload) => {
          console.log('Change received from transactions table!', payload);
          refetchData();
        }
      )
      .subscribe();

    // Listener untuk perubahan pada tabel accounts (misal: nama atau saldo awal berubah)
    const accountsChannel = supabase
      .channel('public:accounts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `household_id=eq.${householdId}` },
        (payload) => {
          console.log('Change received from accounts table!', payload);
          refetchData();
        }
      )
      .subscribe();
      
    // Listener untuk perubahan pada tabel categories
    const categoriesChannel = supabase
      .channel('public:categories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${householdId}` },
        (payload) => {
          console.log('Change received from categories table!', payload);
          refetchData();
        }
      )
      .subscribe();

    // Fungsi cleanup untuk berhenti mendengarkan saat komponen tidak lagi digunakan
    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [householdId, refetchData]);
  // --- PENAMBAHAN REALTIME LISTENER SELESAI ---

  const value = { accounts, categories, isLoading, user, householdId, refetchData };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};


export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
