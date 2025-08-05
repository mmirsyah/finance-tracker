// src/app/transactions/page.tsx

"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import * as transactionService from '@/lib/transactionService';
import TransactionSummary from '@/components/TransactionSummary';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import TransactionToolbar from '@/components/TransactionToolbar';
import { Transaction, Category, Account } from '@/types';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  
  useEffect(() => {
    if (date?.from) { setFilterStartDate(format(date.from, 'yyyy-MM-dd')); } else { setFilterStartDate(''); }
    if (date?.to) { setFilterEndDate(format(date.to, 'yyyy-MM-dd')); } 
    else { if (date?.from) { setFilterEndDate(format(date.from, 'yyyy-MM-dd')); } else { setFilterEndDate(''); } }
  }, [date]);

  const [formType, setFormType] = useState<Transaction['type']>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async (userId: string) => {
    const [fetchedCategories, fetchedAccounts] = await Promise.all([
      transactionService.fetchCategories(supabase, userId),
      transactionService.fetchAccounts(supabase, userId)
    ]);
    setCategories(fetchedCategories);
    setAccounts(fetchedAccounts);
  }, []);

  useEffect(() => {
    async function getUserSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setUser(session.user); await fetchData(session.user.id); } else { router.push('/login'); }
      setIsLoading(false);
    }
    getUserSession();
  }, [fetchData, router]);

  const resetForm = () => {
    setFormType('expense'); setFormAmount(''); setFormCategory(''); setFormAccountId(''); setFormNote('');
    setFormDate(new Date().toISOString().split('T')[0]); setEditId(null); setFormToAccountId('');
  };
  const onResetFilters = () => {
    setFilterType(''); setFilterCategory(''); setFilterAccount(''); setDate(undefined);
  };
  const handleOpenModalForCreate = () => { resetForm(); setIsModalOpen(true); };
  const handleOpenModalForEdit = (t: Transaction) => {
    setEditId(t.id); setFormType(t.type); setFormAmount(String(t.amount)); 
    setFormCategory(t.category?.toString() || '');
    setFormAccountId(t.account_id || ''); setFormToAccountId(t.to_account_id || '');
    setFormNote(t.note || ''); setFormDate(t.date); setIsModalOpen(true);
  };
  const handleSaveTransaction = async () => {
    setIsSaving(true);
    if (!user) { alert('Sesi pengguna tidak ditemukan.'); setIsSaving(false); return; }
    if (formType === 'transfer') {
      if (!formAccountId || !formToAccountId) { alert('Please select both From and To accounts.'); setIsSaving(false); return; }
      if (formAccountId === formToAccountId) { alert('From and To accounts cannot be the same.'); setIsSaving(false); return; }
    } else {
      if (!formAmount || !formCategory || !formAccountId || !formDate) { alert('Harap lengkapi semua data.'); setIsSaving(false); return; }
    }
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single();
    if (!profile) { alert('Could not find user profile.'); setIsSaving(false); return; }
    
    const payload = {
      type: formType, amount: Number(formAmount), note: formNote || null, date: formDate,
      user_id: user.id, household_id: profile.household_id,
      category: formType !== 'transfer' ? Number(formCategory) : null,
      account_id: formAccountId, to_account_id: formType === 'transfer' ? formToAccountId : null,
    };
    
    const success = await transactionService.saveTransaction(supabase, payload, editId);
    if (success) { setIsModalOpen(false); }
    setIsSaving(false);
  };

  const filters = useMemo(() => ({ filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, }), 
    [filterType, filterCategory, filterAccount, filterStartDate, filterEndDate]);
  
  if (isLoading) { return <div className="p-6">Loading...</div>; }
  if (!user) { return null; }
  return (
    <div className="p-4 sm:p-6 w-full h-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <TransactionToolbar 
            onAddTransaction={handleOpenModalForCreate} 
            dateRange={date} setDateRange={setDate}
            filterType={filterType} setFilterType={setFilterType}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterAccount={filterAccount} setFilterAccount={setFilterAccount}
            categories={categories} accounts={accounts}
            onResetFilters={onResetFilters}
          />
          <TransactionList key={user.id} userId={user.id} startEdit={handleOpenModalForEdit} filters={filters}/>
        </div>
        <div className="order-1 lg:order-2"><TransactionSummary userId={user.id} /></div>
      </div>
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTransaction} editId={editId}
        isSaving={isSaving} type={formType} setType={setFormType} amount={formAmount} setAmount={setFormAmount} category={formCategory}
        setCategory={setFormCategory} accountId={formAccountId} setAccountId={setFormAccountId} 
        toAccountId={formToAccountId} setToAccountId={setFormToAccountId} note={formNote}
        setNote={setFormNote} date={formDate} setDate={setFormDate} categories={categories} accounts={accounts}/>
    </div>
  )
}
