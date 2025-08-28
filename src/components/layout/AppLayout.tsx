// src/components/layout/AppLayout.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { AppDataContext, AppDataProvider, useAppData, TransactionModalActions } from '@/contexts/AppDataContext';
import { Plus, PlusSquare, Upload } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types';
import * as transactionService from '@/lib/transactionService';

import TransactionModal from '@/components/TransactionModal';
import ImportTransactionModal from '@/components/modals/ImportTransactionModal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  
  const initialContext = useAppData();
  const { isLoading, user, refetchData, accounts, categories, householdId } = initialContext;
  
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formType, setFormType] = useState<Transaction['type']>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState('');
  const [modalActions, setModalActions] = useState<TransactionModalActions>({});

  const filteredAccountsForModal = useMemo(() => {
    return accounts.filter(acc => acc.name !== 'Modal Awal Aset');
  }, [accounts]);

  const handleOpenModalForCreate = useCallback(() => { 
    setEditId(null); 
    setFormType('expense'); 
    setFormAmount(''); 
    setFormCategory(''); 
    setFormAccountId(''); 
    setFormToAccountId(''); 
    setFormNote(''); 
    setFormDate(new Date().toISOString().split('T')[0]); 
    setModalActions({}); 
    setIsTransactionModalOpen(true); 
  }, []);
  
  const handleOpenModalForEdit = useCallback((transaction: Transaction, actions?: TransactionModalActions) => {
    setEditId(transaction.id);
    setFormType(transaction.type);
    setFormAmount(String(transaction.amount));
    // --- PERBAIKAN: Membaca dari `category` ---
    setFormCategory(transaction.category?.toString() || '');
    setFormAccountId(transaction.account_id || '');
    setFormToAccountId(transaction.to_account_id || '');
    setFormNote(transaction.note || '');
    setFormDate(transaction.date);
    setModalActions(actions || {});
    setIsTransactionModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsTransactionModalOpen(false);
    setModalActions({});
  }, []);

  const handleOpenImportModal = useCallback(() => setIsImportModalOpen(true), []);

  const handleSaveTransaction = async () => { 
    setIsSaving(true); 
    if (!user || !householdId) { 
      toast.error('User session not found.'); 
      setIsSaving(false); 
      return false; 
    } 

    const payload: Partial<Transaction> = { 
      type: formType, 
      amount: Number(formAmount), 
      note: formNote || null, 
      date: formDate, 
      user_id: user.id, 
      household_id: householdId, 
      category: formType !== 'transfer' ? Number(formCategory) : null, 
      account_id: formAccountId, 
      to_account_id: formType === 'transfer' ? formToAccountId : null, 
    }; 
    
    const result = await transactionService.saveTransaction(supabase, payload, editId); 
    
    if (result) { 
      if (formType === 'transfer' && formToAccountId) { 
        const targetAccount = accounts.find(acc => acc.id === formToAccountId); 
        if (targetAccount && targetAccount.type === 'goal') { 
          toast.success(`Kerja Bagus! Selangkah lebih dekat menuju "${targetAccount.name}"! 🎉`); 
        } else { 
          toast.success(editId ? 'Transaction updated!' : 'Transaction saved!'); 
        } 
      } else { 
        toast.success(editId ? 'Transaction updated!' : 'Transaction saved!'); 
      }
      setIsTransactionModalOpen(false); 
      refetchData(); 
    } 
    setIsSaving(false); 
    return result;
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  if (user) {
    const contextValue = { ...initialContext, handleOpenModalForCreate, handleOpenModalForEdit, handleCloseModal, handleOpenImportModal };
    return (
      <AppDataContext.Provider value={contextValue}>
        <div className="relative h-screen flex overflow-hidden bg-gray-100">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          
          <div className="flex-1 flex flex-col">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>

          <div className="sm:hidden fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
              <div className={cn("flex flex-col items-center gap-3 transition-all duration-300 ease-in-out", isFabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
                  <Button variant="secondary" className="rounded-full h-12 w-12 shadow-lg" aria-label="Import from CSV" onClick={() => { handleOpenImportModal(); setIsFabOpen(false); }}>
                      <Upload size={20} />
                  </Button>
                  <Button variant="secondary" className="rounded-full h-12 w-12 shadow-lg" aria-label="Bulk Input" onClick={() => { router.push('/transactions/bulk-add'); setIsFabOpen(false); }}>
                      <PlusSquare size={20} />
                  </Button>
                  <Button variant="secondary" className="rounded-full h-12 w-12 shadow-lg" aria-label="Add Single Transaction" onClick={() => { handleOpenModalForCreate(); setIsFabOpen(false); }}>
                      <Plus size={20} />
                  </Button>
              </div>
              <Button onClick={() => setIsFabOpen(!isFabOpen)} className={cn("bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 h-16 w-16 shadow-lg transition-transform duration-300 ease-in-out", isFabOpen && "rotate-45 bg-destructive hover:bg-destructive/90")} aria-label="Add Transaction Menu">
                <Plus size={28} />
              </Button>
          </div>
          
          <TransactionModal 
            isOpen={isTransactionModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSaveTransaction} 
            onDelete={modalActions.onDelete}
            onMakeRecurring={modalActions.onMakeRecurring}
            editId={editId} 
            isSaving={isSaving} 
            type={formType} setType={setFormType} 
            amount={formAmount} setAmount={setFormAmount} 
            category={formCategory} setCategory={setFormCategory} 
            accountId={formAccountId} setAccountId={setFormAccountId} 
            toAccountId={formToAccountId} setToAccountId={setFormToAccountId} 
            note={formNote} setNote={setFormNote} 
            date={formDate} setDate={setFormDate}
            categories={categories} 
            accounts={filteredAccountsForModal} 
          />
          <ImportTransactionModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
      </AppDataContext.Provider>
    );
  }
  
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AppDataProvider>
  );
}