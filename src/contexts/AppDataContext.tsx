// src/contexts/AppDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Account, Category, Transaction, Profile } from '@/types'; 
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import * as transactionService from '@/lib/transactionService';
import TransactionModal from '@/components/TransactionModal';

interface AppDataContextType {
  accounts: Account[];
  categories: Category[];
  isLoading: boolean;
  user: User | null;
  householdId: string | null;
  profile: Profile | null;
  dataVersion: number;
  refetchData: () => void;
  handleOpenModalForCreate: () => void;
  handleOpenModalForEdit: (transaction: Transaction) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Mulai dengan true
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formType, setFormType] = useState<Transaction['type']>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState('');
  
  const fetchData = useCallback(async (currentUser: User, currentProfile: Profile) => {
    if (!currentProfile.household_id) {
        return;
    }
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        supabase.rpc('get_accounts_with_balance', { p_user_id: currentUser.id }),
        supabase.from('categories').select('*').eq('household_id', currentProfile.household_id).order('name')
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching app data:", error);
      toast.error("Failed to fetch app data.");
    }
  }, []);

  const refetchData = useCallback(() => {
    if (user && profile) {
      console.log('Refetching data...');
      fetchData(user, profile);
      setDataVersion(v => v + 1);
    }
  }, [user, profile, fetchData]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profileData) {
              setProfile(profileData);
              setHouseholdId(profileData.household_id);
              await fetchData(session.user, profileData);
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Failed to initialize session.");
      } finally {
        // isLoading hanya di-set ke false di satu tempat ini saja
        setIsLoading(false);
      }
    };
    initialize();
  }, [fetchData]);

  // Sisa fungsi tidak berubah...
  const handleOpenModalForCreate = () => { setEditId(null); setFormType('expense'); setFormAmount(''); setFormCategory(''); setFormAccountId(''); setFormToAccountId(''); setFormNote(''); setFormDate(new Date().toISOString().split('T')[0]); setIsModalOpen(true); };
  const handleOpenModalForEdit = (transaction: Transaction) => { setEditId(transaction.id); setFormType(transaction.type); setFormAmount(String(transaction.amount)); setFormCategory(transaction.category?.toString() || ''); setFormAccountId(transaction.account_id || ''); setFormToAccountId(transaction.to_account_id || ''); setFormNote(transaction.note || ''); setFormDate(transaction.date); setIsModalOpen(true); };
  const handleSaveTransaction = async () => { 
    setIsSaving(true); 
    if (!user || !householdId) { toast.error('User session not found.'); setIsSaving(false); return; } 
    const payload = { type: formType, amount: Number(formAmount), note: formNote || null, date: formDate, user_id: user.id, household_id: householdId, category: formType !== 'transfer' ? Number(formCategory) : null, account_id: formAccountId, to_account_id: formType === 'transfer' ? formToAccountId : null, }; 
    const success = await transactionService.saveTransaction(supabase, payload, editId); 
    if (success) { 
        if (formType === 'transfer' && formToAccountId) { const targetAccount = accounts.find(acc => acc.id === formToAccountId); if (targetAccount && targetAccount.type === 'goal') { toast.success(`Kerja Bagus! Selangkah lebih dekat menuju "${targetAccount.name}"! 🎉`); } else { toast.success(editId ? 'Transaction updated!' : 'Transaction saved!'); } } else { toast.success(editId ? 'Transaction updated!' : 'Transaction saved!'); }
        setIsModalOpen(false); 
        refetchData(); 
    } 
    setIsSaving(false); 
  };
  
  useEffect(() => {
    if (!householdId) return;
    const channelDefs = [{ table: 'transactions' }, { table: 'accounts' }, { table: 'categories' }];
    const channels = channelDefs.map(def => supabase.channel(`public:${def.table}`).on('postgres_changes', { event: '*', schema: 'public', table: def.table, filter: `household_id=eq.${householdId}` }, (payload) => { console.log(`Change received from ${def.table} table!`, payload); refetchData(); }).subscribe());
    return () => { channels.forEach(channel => supabase.removeChannel(channel)); };
  }, [householdId, refetchData]);

  const value = { accounts, categories, isLoading, user, householdId, profile, dataVersion, refetchData, handleOpenModalForCreate, handleOpenModalForEdit };

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTransaction} editId={editId} isSaving={isSaving} type={formType} setType={setFormType} amount={formAmount} setAmount={setFormAmount} category={formCategory} setCategory={setFormCategory} accountId={formAccountId} setAccountId={setFormAccountId} toAccountId={formToAccountId} setToAccountId={setFormToAccountId} note={formNote} setNote={setFormNote} date={formDate} setDate={setFormDate} categories={categories} accounts={accounts} />
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