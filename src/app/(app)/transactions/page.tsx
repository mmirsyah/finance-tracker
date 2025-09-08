// src/app/(app)/transactions/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import TransactionSummary from '@/components/transaction/TransactionSummary';
import TransactionList from '@/components/TransactionList';
import TransactionToolbar from '@/components/TransactionToolbar';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { deleteAssetTransaction } from '@/lib/assetService';
import { Transaction, AssetTransaction } from '@/types';
import { toast } from 'sonner';
import { useHapticFeedback } from '@/lib/haptics';

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    accounts, categories, transactions, isLoading: isAppDataLoading, user, dataVersion, 
    refetchData, handleOpenModalForEdit, handleOpenImportModal, handleCloseModal 
  } = useAppData();
  const [isListLoading, setIsListLoading] = useState(true);
  const { triggerHaptic } = useHapticFeedback();

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

  // Fungsi untuk membuat template recurring
  const handleMakeRecurring = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsRecurringModalOpen(true);
    // Trigger haptic feedback for recurring action
    triggerHaptic('transaction');
  }, [triggerHaptic]);

  // Wrap closeEditing in useCallback
  const closeEditing = useCallback(() => {
    setEditingTransactionId(null);
    handleCloseModal();
    // Trigger haptic feedback for closing
    triggerHaptic('selection');
  }, [handleCloseModal, triggerHaptic]);

  // Wrap handleDelete in useCallback
  const handleDelete = useCallback(async (transactionId: string, linkedAssetTx?: AssetTransaction) => {
    console.log("handleDelete called for tx:", transactionId);
    console.log("Linked asset transaction received:", linkedAssetTx);

    // Trigger haptic feedback for delete action
    triggerHaptic('delete');

    if (linkedAssetTx && linkedAssetTx.id) {
        console.log("Asset path taken. Deleting asset tx:", linkedAssetTx.id);
        // This is an asset-related transaction, use the dedicated delete service
        if (confirm('This will delete both the financial transfer and the related asset transaction. Are you sure?')) {
            const promise = async () => {
                await deleteAssetTransaction(linkedAssetTx.id, linkedAssetTx.related_transaction_id);
                refetchData();
                closeEditing();
            };
            toast.promise(promise(), {
                loading: 'Deleting asset transaction...', 
                success: 'Asset transaction deleted successfully!',
                error: (err) => `Error: ${err.message}`,
            });
        }
        return;
    }

    console.log("Standard delete path taken.");
    // Original delete logic for non-asset transactions
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
  }, [refetchData, closeEditing, triggerHaptic]);

  // Check for transaction ID in URL parameters
  useEffect(() => {
    const transactionId = searchParams.get('txId');
    if (transactionId && !editingTransactionId) {
      // Find the transaction in our data
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        setEditingTransactionId(transactionId);
        handleOpenModalForEdit(transaction, {
          onDelete: () => handleDelete(transactionId),
          onMakeRecurring: () => handleMakeRecurring(transaction),
        });
        
        // Remove the txId parameter from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('txId');
        router.replace(`/transactions?${newParams.toString()}`, { scroll: false });
      }
    }
  }, [searchParams, handleOpenModalForEdit, transactions, editingTransactionId, handleDelete, handleMakeRecurring, router]);

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
    // Trigger haptic feedback for reset
    triggerHaptic('selection');
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
    // Trigger haptic feedback for editing
    triggerHaptic('transaction');
  };
  
  // closeEditing and handleDelete have been moved to useCallback above to fix dependency issues


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
    // Trigger haptic feedback for bulk reassign
    triggerHaptic('transaction');
  };

  const handleRecurringSaved = () => {
    setIsRecurringModalOpen(false);
    setSelectedTransaction(null);
    toast.success('Recurring template created successfully!');
    closeEditing(); // Tutup juga modal transaksi utama
    // Trigger haptic feedback for saving
    triggerHaptic('success');
  };

  // handleDelete function has been moved to useCallback above to fix dependency issues

  if (isAppDataLoading || !date) { return <div className="p-6"><TransactionListSkeleton /></div>; }
  if (!user) { return null; }

  return (
      <>
        <div className="p-4 sm:p-6 w-full h-full">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Toolbar: Mobile Order 2, Desktop Order 1 & Full Span */}
            <div className="order-2 lg:order-1 lg:col-span-3">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Transactions</h1>
                <p className="text-sm text-muted-foreground mt-1">Kelola semua transaksi keuangan Anda</p>
              </div>
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
            </div>

            {/* Transaction List: Mobile Order 3, Desktop Order 2 */}
            <div className="order-3 lg:order-2 lg:col-span-2 space-y-4">
              {selectedIds.size > 0 && (
                <BulkActionToolbar
                  selectedCount={selectedIds.size}
                  onClear={() => {
                    setSelectedIds(new Set());
                    // Trigger haptic feedback for clear selection
                    triggerHaptic('selection');
                  }}
                  onReassignCategory={() => {
                    setIsReassignModalOpen(true);
                    // Trigger haptic feedback for reassign
                    triggerHaptic('selection');
                  }}
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
                  onRefresh={refetchData}
                />
              </div>
            </div>

            {/* Transaction Summary: Mobile Order 1, Desktop Order 3 */}
            <div className="order-1 lg:order-3 lg:col-span-1">
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
            onClose={() => {
              setIsReassignModalOpen(false);
              // Trigger haptic feedback for closing modal
              triggerHaptic('selection');
            }}
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
              // Trigger haptic feedback for closing modal
              triggerHaptic('selection');
            }}
            onSave={handleRecurringSaved}
            transaction={selectedTransaction}
            accounts={accounts}
            categories={categories}
        />
      </>
  )
}