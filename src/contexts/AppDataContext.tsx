// src/contexts/AppDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Account, Category, Transaction } from '@/types';
import { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import * as transactionService from '@/lib/transactionService';
import TransactionModal from '@/components/TransactionModal';

interface AppDataContextType {
  accounts: Account[];
  categories: Category[];
  isLoading: boolean;
  user: User | null;
  householdId: string | null;
  dataVersion: number;
  refetchData: () => void;
  // Fungsi yang bisa dipanggil dari mana saja
  handleOpenModalForCreate: () => void;
  handleOpenModalForEdit: (transaction: Transaction) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // --- SEMUA STATE & LOGIKA MODAL SEKARANG TINGGAL DI SINI ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // State Form
  const [formType, setFormType] = useState<Transaction['type']>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState('');

  const handleOpenModalForCreate = () => {
    setEditId(null);
    setFormType('expense');
    setFormAmount('');
    setFormCategory('');
    setFormAccountId('');
    setFormToAccountId('');
    setFormNote('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (transaction: Transaction) => {
    setEditId(transaction.id);
    setFormType(transaction.type);
    setFormAmount(String(transaction.amount));
    setFormCategory(transaction.category?.toString() || '');
    setFormAccountId(transaction.account_id || '');
    setFormToAccountId(transaction.to_account_id || '');
    setFormNote(transaction.note || '');
    setFormDate(transaction.date);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    setIsSaving(true);
    if (!user || !householdId) {
      toast.error('User session not found.');
      setIsSaving(false);
      return;
    }

    const payload = {
      type: formType, amount: Number(formAmount), note: formNote || null, date: formDate,
      user_id: user.id, household_id: householdId,
      category: formType !== 'transfer' ? Number(formCategory) : null,
      account_id: formAccountId, to_account_id: formType === 'transfer' ? formToAccountId : null,
    };

    const success = await transactionService.saveTransaction(supabase, payload, editId);
    if (success) {
      toast.success(editId ? 'Transaction updated!' : 'Transaction saved!');
      setIsModalOpen(false);
      refetchData();
    }
    setIsSaving(false);
  };

  const fetchData = async (currentUser: User, currentHouseholdId: string) => {
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
      setIsLoading(false);
    }
  };

  const refetchData = useCallback(() => {
    if (user && householdId) {
      console.log('Refetching data...');
      fetchData(user, householdId);
      setDataVersion(v => v + 1);
    }
  }, [user, householdId]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', session.user.id).single();
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

  useEffect(() => {
    if (!householdId) return;
    const channelDefs = [{ table: 'transactions' }, { table: 'accounts' }, { table: 'categories' }];
    const channels = channelDefs.map(def => 
      supabase.channel(`public:${def.table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: def.table, filter: `household_id=eq.${householdId}` }, (payload) => {
          console.log(`Change received from ${def.table} table!`, payload);
          refetchData();
        })
        .subscribe()
    );
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [householdId, refetchData]);

  const value = { accounts, categories, isLoading, user, householdId, dataVersion, refetchData, handleOpenModalForCreate, handleOpenModalForEdit };

  return (
    <AppDataContext.Provider value={value}>
      {children}
      {/* Modal sekarang dirender secara global dari provider */}
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTransaction} 
        editId={editId}
        isSaving={isSaving} 
        type={formType} setType={setFormType} 
        amount={formAmount} setAmount={setFormAmount} 
        category={formCategory} setCategory={setFormCategory} 
        accountId={formAccountId} setAccountId={setFormAccountId} 
        toAccountId={formToAccountId} setToAccountId={setFormToAccountId} 
        note={formNote} setNote={setFormNote} 
        date={formDate} 
        setDate={setFormDate} 
        categories={categories}
        accounts={accounts}
      />
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