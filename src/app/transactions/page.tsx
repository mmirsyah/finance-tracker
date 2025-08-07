// src/app/transactions/page.tsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import * as transactionService from '@/lib/transactionService';
import TransactionSummary from '@/components/TransactionSummary';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import TransactionToolbar from '@/components/TransactionToolbar';
import { Transaction } from '@/types';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext'; // <-- 1. Import custom hook
import LoadingSpinner from '@/components/LoadingSpinner'; // <-- Import spinner

export default function TransactionsPage() {
  const router = useRouter();
  // 2. Ambil data, loading state, dan user dari context
  const { accounts, categories, isLoading: isAppDataLoading, user, householdId } = useAppData();

  const [isSaving, setIsSaving] = useState(false);

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

  // State untuk form tetap di sini karena spesifik untuk halaman ini
  const [formType, setFormType] = useState<Transaction['type']>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 3. Hapus useEffect dan useCallback untuk fetching data
  // Data sekarang datang dari AppDataContext

  useEffect(() => {
    // Redirect jika loading selesai dan tidak ada user
    if (!isAppDataLoading && !user) {
      router.push('/login');
    }
  }, [isAppDataLoading, user, router]);

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
    if (!user || !householdId) { 
      // Cek user dan householdId dari context
      alert('Sesi pengguna tidak ditemukan.'); 
      setIsSaving(false); 
      return; 
    }
    // ... (sisa logika validasi tetap sama)
    
    const payload = {
      type: formType, amount: Number(formAmount), note: formNote || null, date: formDate,
      user_id: user.id, household_id: householdId,
      category: formType !== 'transfer' ? Number(formCategory) : null,
      account_id: formAccountId, to_account_id: formType === 'transfer' ? formToAccountId : null,
    };
    
    const success = await transactionService.saveTransaction(supabase, payload, editId);
    if (success) { setIsModalOpen(false); }
    setIsSaving(false);
  };

  const filters = useMemo(() => ({ filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, }), 
    [filterType, filterCategory, filterAccount, filterStartDate, filterEndDate]);
  
  // 4. Tampilkan spinner selama data context masih loading
  if (isAppDataLoading) { return <LoadingSpinner text="Loading your financial data..." />; }
  if (!user) { return null; } // atau halaman "unauthorized"

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
            categories={categories} // <-- Data dari context
            accounts={accounts}     // <-- Data dari context
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
        setNote={setFormNote} date={formDate} setDate={setFormDate} 
        categories={categories} // <-- Data dari context
        accounts={accounts}     // <-- Data dari context
      />
    </div>
  )
}
