// src/contexts/AppDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Account, Category } from '@/types';
import { User } from '@supabase/supabase-js';

// 1. Definisikan tipe data yang akan disimpan di dalam context
interface AppDataContextType {
  accounts: Account[];
  categories: Category[];
  isLoading: boolean;
  user: User | null;
  householdId: string | null;
  refetchData: () => void; // Fungsi untuk memuat ulang data jika diperlukan
}

// 2. Buat Context dengan nilai default
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// 3. Buat Provider Component
// Komponen ini akan membungkus aplikasi kita, mengambil data, dan menyediakannya
export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const fetchData = async (currentUser: User, currentHouseholdId: string) => {
    setIsLoading(true);
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('household_id', currentHouseholdId).order('name'),
        supabase.from('categories').select('*').eq('household_id', currentHouseholdId).order('name')
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching app data:", error);
      // Anda bisa menambahkan state untuk error di sini jika perlu
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
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
          setIsLoading(false); // Selesai loading jika tidak ada profil/household
        }
      } else {
        setIsLoading(false); // Selesai loading jika tidak ada sesi
      }
    };

    initialize();
  }, []);

  const refetchData = () => {
    if (user && householdId) {
      fetchData(user, householdId);
    }
  };

  const value = { accounts, categories, isLoading, user, householdId, refetchData };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

// 4. Buat Custom Hook untuk mempermudah penggunaan context
export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
