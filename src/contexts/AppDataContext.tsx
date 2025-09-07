
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Account, Category, Transaction, Profile, AssetSummary } from '@/types';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import * as assetService from '@/lib/assetService';
import { processSyncQueue } from '@/lib/syncService'; // Import sync service

interface AppDataContextType {
  accounts: Account[];
  categories: Category[];
  assets: AssetSummary[];
  transactions: Transaction[];
  isLoading: boolean;
  user: User | null;
  householdId: string | null;
  profile: Profile | null;
  dataVersion: number;
  refetchData: () => void;
  handleOpenModalForCreate: () => void;
  handleOpenModalForEdit: (transaction: Transaction, actions?: TransactionModalActions) => void;
  handleCloseModal: () => void;
  handleOpenImportModal: () => void;
}

export interface TransactionModalActions {
    onDelete?: () => void;
    onMakeRecurring?: () => void;
}

export const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories: Category[] = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const assets = useLiveQuery(() => db.assets.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const isSyncing = useRef(false);

  const syncData = useCallback(async (currentUser: User, currentProfile: Profile) => {
    if (isSyncing.current || !currentProfile.household_id) return;
    if (!navigator.onLine) {
      toast.info("You are offline. Data shown may not be up to date.", {
        duration: 2000, // Durasi lebih singkat
        id: 'offline-info' // ID unik
      });
      setIsLoading(false);
      return;
    }

    isSyncing.current = true;
    toast.info("Syncing data...", { 
      duration: 10, // Durasi sangat singkat
      id: 'syncing-data' // ID unik
    });

    try {
      const [accountsRes, categoriesRes, assetsData, transactionsRes] = await Promise.all([
        supabase.rpc('get_accounts_with_balance', { p_user_id: currentUser.id }),
        supabase.from('categories').select('*').eq('household_id', currentProfile.household_id).order('name'),
        assetService.getAssetSummaries(currentProfile.household_id),
        supabase.from('transactions').select('*, categories(name, parent_id)').eq('household_id', currentProfile.household_id).order('date', { ascending: false }).limit(500)
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      await db.transaction('rw', db.accounts, db.categories, db.assets, db.transactions, async () => {
        await db.accounts.clear();
        await db.accounts.bulkPut(accountsRes.data || []);
        await db.categories.clear();
        await db.categories.bulkPut(categoriesRes.data || []);
        await db.assets.clear();
        await db.assets.bulkPut(assetsData || []);
        await db.transactions.clear();
        await db.transactions.bulkPut(transactionsRes.data || []);
      });

      setDataVersion(v => v + 1);
      toast.info("Data synced", { // Menggunakan info alih-alih success
        duration: 10, // Durasi singkat
        id: 'sync-success', // ID unik
      });

    } catch (error) {
      console.error("Error syncing app data:", error);
      toast.error("Failed to sync app data.", {
        duration: 3000,
        id: 'sync-error'
      });
    } finally {
      isSyncing.current = false;
      setIsLoading(false);
    }
  }, []);

  const refetchData = useCallback(() => {
    if (user && profile) {
      syncData(user, profile);
    }
  }, [user, profile, syncData]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (profileData) {
          setProfile(profileData);
          setHouseholdId(profileData.household_id);
          await syncData(currentUser, profileData);
        }
      } else {
        setIsLoading(false);
      }
    };
    initialize();
  }, [syncData]);

  // Efek untuk menangani sinkronisasi otomatis saat kembali online
  useEffect(() => {
    const handleOnline = () => {
      toast.info("You are back online!", {
        duration: 1000, // Durasi lebih singkat
        id: 'back-online' // ID unik
      });
      processSyncQueue();
    };

    // Tambahkan event listener
    window.addEventListener('online', handleOnline);

    // Jalankan proses antrian sekali saat aplikasi dimuat, jika ada koneksi
    if (navigator.onLine) {
      processSyncQueue();
    }

    // Cleanup: hapus event listener saat komponen dibongkar
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []); // Array dependensi kosong agar hanya berjalan sekali

  // Listener Real-time dinonaktifkan sementara untuk debugging loop offline
  /*
  useEffect(() => {
    if (!householdId) return;

    const channel: RealtimeChannel = supabase.channel(`household-db-changes-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public' },
        (payload) => {
        // SOLUSI: Abaikan semua event jika sinkronisasi sedang berlangsung.
        if (isSyncing.current) {
          return;
        }
        console.log('Database change detected from another source, triggering sync.', payload);
        refetchData();
      }
    ).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime channel subscribed.');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, refetchData]);
  */

  const value = {
    accounts, categories, assets, transactions,
    isLoading: isLoading || (accounts.length === 0 && categories.length === 0),
    user, householdId, profile, dataVersion, refetchData,
    handleOpenModalForCreate: () => console.warn('handleOpenModalForCreate not implemented'),
    handleOpenModalForEdit: () => console.warn('handleOpenModalForEdit not implemented'),
    handleCloseModal: () => console.warn('handleCloseModal not implemented'),
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
