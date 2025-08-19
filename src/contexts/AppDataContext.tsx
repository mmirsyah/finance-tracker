// src/contexts/AppDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Account, Category, Transaction, Profile, AssetSummary } from '@/types';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import * as assetService from '@/lib/assetService';

interface AppDataContextType {
  accounts: Account[];
  categories: Category[];
  assets: AssetSummary[];
  isLoading: boolean;
  user: User | null;
  householdId: string | null;
  profile: Profile | null;
  dataVersion: number;
  refetchData: () => void;
  handleOpenModalForCreate: () => void;
  handleOpenModalForEdit: (transaction: Transaction) => void;
  handleOpenImportModal: () => void;
}

export const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const fetchData = useCallback(async (currentUser: User, currentProfile: Profile) => {
    if (!currentProfile.household_id) return;
    try {
      const [accountsRes, categoriesRes, assetsData] = await Promise.all([
        supabase.rpc('get_accounts_with_balance', { p_user_id: currentUser.id }),
        supabase.from('categories').select('*').eq('household_id', currentProfile.household_id).order('name'),
        assetService.getAssetSummaries(currentProfile.household_id)
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      
      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
      setAssets(assetsData || []);

    } catch (error) {
      console.error("Error fetching app data:", error);
      toast.error("Failed to fetch app data.");
    }
  }, []);

  const refetchData = useCallback(() => {
    if (user && profile) {
      toast.info("Refreshing data...", { duration: 1500 });
      fetchData(user, profile);
      setDataVersion(v => v + 1);
    }
  }, [user, profile, fetchData]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
          if (profileData) {
              setProfile(profileData);
              setHouseholdId(profileData.household_id);
              await fetchData(currentUser, profileData);
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [fetchData]);

  useEffect(() => {
    if (!householdId) return;

    // Listener terpusat untuk semua perubahan data penting
    const channel = supabase.channel(`household-db-changes-${householdId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => refetchData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => refetchData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => refetchData()
      )
      // --- PERUBAHAN DI SINI ---
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'asset_transactions' },
        () => refetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, refetchData]);

  const value = {
    accounts, categories, assets, isLoading, user, householdId, profile, dataVersion, refetchData,
    handleOpenModalForCreate: () => console.warn('handleOpenModalForCreate not implemented'),
    handleOpenModalForEdit: () => console.warn('handleOpenModalForEdit not implemented'),
    handleOpenImportModal: () => console.warn('handleOpenImportModal not implemented')
  };

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