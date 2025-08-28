// src/app/(app)/transactions/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import TransactionSummary from '@/components/transaction/TransactionSummary';
import TransactionList from '@/components/TransactionList';
import TransactionToolbar from '@/components/TransactionToolbar';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import TransactionListSkeleton from '@/components/skeletons/TransactionListSkeleton';
import { supabase } from '@/lib/supabase';
import { getCustomPeriod } from '@/lib/periodUtils';

// Import komponen baru
import BulkActionToolbar from '@/components/transaction/BulkActionToolbar';
import BulkReassignCategoryModal from '@/components/modals/BulkReassignCategoryModal';
import RecurringFromTransactionModal from '@/components/modals/RecurringFromTransactionModal';
import * as transactionService from '@/lib/transactionService';
import { Transaction } from '@/types';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const router = useRouter();
  const { 
    accounts, categories, isLoading: isAppDataLoading, user, dataVersion, 
    refetchData, handleOpenModalForEdit, handleOpenImportModal, handleCloseModal 
  } = useAppData();
  const [isListLoading, setIsListLoading] = useState(true);

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');

  // State untuk aksi massal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // State untuk recurring modal
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // State untuk melacak ID transaksi yang sedang diedit
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !date) {
      const fetchProfileAndSetDate = async () => {
        const { data: profile } = await supabase.from('profiles').select('period_start_day').eq('id', user.id).single();
        const startDay = profile?.period_start_day || 1;
        setDate(getCustomPeriod(startDay));
      };
      fetchProfileAndSetDate();
    }
  }, [user, date]);

  const { filterStartDate, filterEndDate } = useMemo(() => {
    const from = date?.from ? format(date.from, 'yyyy-MM-dd') : '';
    const to = date?.to ? format(date.to, 'yyyy-MM-dd') : (date?.from ? format(date.from, 'yyyy-MM-dd') : '');
    return { filterStartDate: from, filterEndDate: to };
  }, [date]);

  useEffect(() => {
    if (!isAppDataLoading && !user) {
      router.push('/login');
    }
  }, [isAppDataLoading, user, router]);

  const handleDataLoaded = useCallback(() => {
    setIsListLoading(false);
  }, []);

  const onResetFilters = () => {
    setFilterType(''); setFilterCategory(''); setFilterAccount('');
    const fetchProfileAndSetDate = async () => {
        if(user) {
            const { data: profile } = await supabase.from('profiles').select('period_start_day').eq('id', user.id).single();
            const startDay = profile?.period_start_day || 1;
            setDate(getCustomPeriod(startDay));
        }
    };
    fetchProfileAndSetDate();
  };

  const filters = useMemo(() => ({ filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, transactionVersion: dataVersion }),
    [filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, dataVersion]);

  useEffect(() => {
    setIsListLoading(true);
  }, [filters]);

  // Wrapper untuk handleOpenModalForEdit untuk melacak ID yang diedit
  const startEditing = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    handleOpenModalForEdit(transaction, {
      onDelete: () => handleDelete(transaction.id),
      onMakeRecurring: () => handleMakeRecurring(transaction),
    });
  };
  
  // Wrapper untuk handleCloseModal untuk membersihkan ID yang diedit
  const closeEditing = () => {
    setEditingTransactionId(null);
    handleCloseModal();
  };


  const handleBulkReassign = async (newCategoryId: number) => {
    const promise = transactionService.bulkUpdateCategory(Array.from(selectedIds), newCategoryId)
      .then((updatedCount) => {
        toast.success(`${updatedCount} transaksi berhasil diperbarui.`);
        refetchData(); // Memuat ulang semua data aplikasi
        setSelectedIds(new Set()); // Mengosongkan pilihan
        setIsReassignModalOpen(false); // Menutup modal
      });

    toast.promise(promise, {
      loading: 'Memperbarui transaksi...',
      error: (err: Error) => `Gagal memperbarui: ${err.message}`,
    });
  };

  const handleMakeRecurring = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsRecurringModalOpen(true);
  };

  const handleRecurringSaved = () => {
    setIsRecurringModalOpen(false);
    setSelectedTransaction(null);
    toast.success('Recurring template created successfully!');
    closeEditing(); // Tutup juga modal transaksi utama
  };

  const handleDelete = async (transactionId: string) => {
    // We need to find the full transaction object to check if it's from a recurring template
    const { data: transaction } = await supabase.from('transactions').select('note').eq('id', transactionId).single();
    const isFromRecurring = transaction?.note?.includes('(from:');
    
    const confirmMessage = isFromRecurring 
      ? 'This transaction was created from a recurring template.\n\nDeleting it will reset the recurring instance to "upcoming" status, allowing you to confirm it again.\n\nAre you sure you want to delete this transaction?' 
      : 'Are you sure you want to delete this transaction?';
    
    if (confirm(confirmMessage)) {
      const promise = async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        if (error) { throw error; }
        refetchData();
        closeEditing(); // Tutup modal transaksi setelah hapus
      };

      toast.promise(promise(), {
        loading: 'Deleting transaction...', 
        success: isFromRecurring 
          ? 'Transaction deleted! Recurring instance reset to pending.' 
          : 'Transaction deleted!',
        error: (err) => `Error: ${err.message}`,
      });
    }
  };

  if (isAppDataLoading || !date) { return <div className="p-6"><TransactionListSkeleton /></div>; }
  if (!user) { return null; }

  return (
      <>
        <div className="p-4 sm:p-6 w-full h-full">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 order-2 lg:order-1 space-y-4">
              <TransactionToolbar
                dateRange={date} 
                onDateChange={setDate}
                filterType={filterType} setFilterType={setFilterType}
                filterCategory={filterCategory} setFilterCategory={setFilterCategory}
                filterAccount={filterAccount} setFilterAccount={setFilterAccount}
                categories={categories}
                accounts={accounts}
                onResetFilters={onResetFilters}
                onOpenImportModal={handleOpenImportModal}
              />

              {/* Toolbar Aksi Massal */}
              {selectedIds.size > 0 && (
                <BulkActionToolbar 
                  selectedCount={selectedIds.size}
                  onClear={() => setSelectedIds(new Set())}
                  onReassignCategory={() => setIsReassignModalOpen(true)}
                />
              )}
              
              {isListLoading && <TransactionListSkeleton />}
              <div style={{ display: isListLoading ? 'none' : 'block' }}>
                <TransactionList
                  startEdit={startEditing}
                  filters={filters}
                  onDataLoaded={handleDataLoaded}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  editingId={editingTransactionId}
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
                <TransactionSummary
                    startDate={filterStartDate}
                    endDate={filterEndDate}
                />
            </div>
          </div>
        </div>

        {/* Modal untuk Aksi Massal */}
        <BulkReassignCategoryModal
            isOpen={isReassignModalOpen}
            onClose={() => setIsReassignModalOpen(false)}
            onSave={handleBulkReassign}
            transactionCount={selectedIds.size}
            categories={categories}
        />

        {/* Modal untuk Make Recurring */}
        <RecurringFromTransactionModal
            isOpen={isRecurringModalOpen}
            onClose={() => {
              setIsRecurringModalOpen(false);
              setSelectedTransaction(null);
            }}
            onSave={handleRecurringSaved}
            transaction={selectedTransaction}
            accounts={accounts}
            categories={categories}
        />
      </>
  )
}