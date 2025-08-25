// src/components/TransactionList.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, TransactionGroup } from '@/types';
import Link from 'next/link';
import { MoreVertical, Edit, Trash2, Loader2, Repeat } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface TransactionListProps {
    startEdit: (transaction: Transaction) => void;
    filters: {
        filterType: string;
        filterCategory: string;
        filterAccount: string;
        filterStartDate: string;
        filterEndDate: string;
        transactionVersion: number;
    };
    onDataLoaded: () => void;
    selectedIds: Set<string>;
    onSelectionChange: (newSelectedIds: Set<string>) => void;
    onMakeRecurring?: (transaction: Transaction) => void;
}

const formatCurrency = (value: number) => { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };

const groupTransactionsByDate = (transactions: Transaction[]): TransactionGroup[] => {
  if (!transactions) return [];
  const groups = transactions.reduce((acc, t) => {
    const date = t.date;
    if (!acc[date]) {
      acc[date] = { date, subtotal: 0, transactions: [] };
    }
    if (t.type !== 'transfer') {
      const amount = t.type === 'expense' ? -t.amount : t.amount;
      acc[date].subtotal += amount;
    }
    acc[date].transactions.push(t);
    return acc;
  }, {} as Record<string, TransactionGroup>);
  return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export default function TransactionList({ startEdit, filters, onDataLoaded, selectedIds, onSelectionChange, onMakeRecurring }: TransactionListProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const { householdId, refetchData } = useAppData();

  const fetchTransactions = useCallback(async (pageNum: number, isNewFilter: boolean) => {
    if (!householdId) {
        if (pageNum === 0) onDataLoaded();
        return;
    }

    setIsLoading(true);
    setError(null);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('transactions')
      .select(`*, categories ( id, name ), accounts:account_id ( name ), to_account:to_account_id ( name )`)
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.filterType) query = query.eq('type', filters.filterType);
    if (filters.filterCategory) query = query.eq('category', Number(filters.filterCategory));
    if (filters.filterAccount) query = query.or(`account_id.eq.${filters.filterAccount},to_account_id.eq.${filters.filterAccount}`);
    if (filters.filterStartDate) query = query.gte('date', filters.filterStartDate);
    if (filters.filterEndDate) query = query.lte('date', filters.filterEndDate);

    const { data, error: fetchError, count } = await query.returns<Transaction[]>();

    if (fetchError) {
      setError(`Failed to load data: ${fetchError.message}`);
    } else {
      const newTransactions = data || [];
      setAllTransactions(prev => isNewFilter ? newTransactions : [...prev, ...newTransactions]);
      setHasMore((count || 0) > (pageNum + 1) * PAGE_SIZE);
    }

    if (pageNum === 0) onDataLoaded();
    setIsLoading(false);
  }, [householdId, filters, onDataLoaded]);
  
  useEffect(() => {
    setPage(0);
    setAllTransactions([]);
    setHasMore(true);
    onSelectionChange(new Set()); 
    setTimeout(() => fetchTransactions(0, true), 0);
  }, [filters, fetchTransactions, onSelectionChange]);

  useEffect(() => {
      if (page > 0) {
          fetchTransactions(page, false);
      }
  }, [page, fetchTransactions]);

  useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading) {
        setPage(prevPage => prevPage + 1);
      }
    };

    observerRef.current = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observerRef.current.observe(loaderRef.current);

    const currentObserver = observerRef.current;
    return () => { if (currentObserver) currentObserver.disconnect(); };
  }, [hasMore, isLoading]);

  const handleDelete = async (transactionId: string) => {
    const transaction = allTransactions.find(t => t.id === transactionId);
    const isFromRecurring = transaction?.note?.includes('(from:');
    
    const confirmMessage = isFromRecurring 
      ? 'This transaction was created from a recurring template.\n\nDeleting it will reset the recurring instance to "upcoming" status, allowing you to confirm it again.\n\nAre you sure you want to delete this transaction?'
      : 'Are you sure you want to delete this transaction?';
    
    if (confirm(confirmMessage)) {
      const promise = async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        if (error) { throw error; }
        refetchData();
      };

      toast.promise(promise(), {
        loading: 'Deleting transaction...',
        success: isFromRecurring 
          ? 'Transaction deleted! Recurring instance reset to pending.' 
          : 'Transaction deleted!',
        error: (err) => `Error: ${err.message}`,
      });

      setActiveMenu(null);
    }
  };

  const handleMakeRecurring = (transaction: Transaction) => {
    if (onMakeRecurring) {
      onMakeRecurring(transaction);
      setActiveMenu(null);
    }
  };
  
  const handleRowSelect = (transactionId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(transactionId)) {
      newSelectedIds.delete(transactionId);
    } else {
      newSelectedIds.add(transactionId);
    }
    onSelectionChange(newSelectedIds);
  };

  const handleGroupSelect = (transactionIds: string[], select: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (select) {
      transactionIds.forEach(id => newSelectedIds.add(id));
    } else {
      transactionIds.forEach(id => newSelectedIds.delete(id));
    }
    onSelectionChange(newSelectedIds);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setActiveMenu(null); } };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [activeMenu]);

  const groupedTransactions = groupTransactionsByDate(allTransactions);

  if (error) return <div className="text-center p-6 bg-white rounded-lg shadow text-red-500">{error}</div>;
  if (groupedTransactions.length === 0 && !isLoading) return <div className="text-center p-6 bg-white rounded-lg shadow text-gray-500">No transactions found.</div>;

  // --- REVISI UTAMA: Fungsi render detail transaksi yang baru ---
  const renderTransactionDetails = (t: Transaction) => {
    const isFromRecurring = t.note?.includes('(from:)');

    const categoryName = t.categories?.name || 'Uncategorized';
    const categoryId = t.categories?.id || t.category;

    if (t.type === 'transfer') {
      const primaryText = t.note || 'Transfer';
      const secondaryText = `${t.accounts?.name || '?'} → ${t.to_account?.name || '?'}`;
      return (
        <div className="flex-grow min-w-0">
          <p className="font-medium text-gray-800 truncate text-sm">{primaryText}</p>
          <p className="text-xs text-muted-foreground truncate">{secondaryText}</p>
        </div>
      );
    }

    if (t.note) {
      // Jika ada note, note jadi primary, akun & kategori jadi secondary
      return (
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-800 truncate text-sm">{t.note}</p>
            {isFromRecurring && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full flex-shrink-0">Recurring</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span>{t.accounts?.name || 'No Account'}</span>
            <span>-</span>
            {categoryId ? (
                 <Link href={`/categories/${categoryId}`} className="hover:underline text-blue-600" onClick={(e) => e.stopPropagation()}>
                    {categoryName}
                 </Link>
            ) : (
                <span>{categoryName}</span>
            )}
          </div>
        </div>
      );
    } else {
      // Jika tidak ada note, kategori jadi primary, akun jadi secondary
      return (
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-800 truncate text-sm">
                {categoryId ? (
                    <Link href={`/categories/${categoryId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {categoryName}
                    </Link>
                ) : (
                    <span>{categoryName}</span>
                )}
            </p>
            {isFromRecurring && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full flex-shrink-0">Recurring</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{t.accounts?.name || 'No Account'}</p>
        </div>
      );
    }
  };
  
  const getAmountColor = (type: string) => { 
      if (type === 'income') return 'text-green-600'; 
      if (type === 'expense') return 'text-red-600'; 
      return 'text-gray-700';
  };

  return (
    <div className="space-y-4">
      {groupedTransactions.map(group => {
        const groupTransactionIds = group.transactions.map(t => t.id);
        const areAllInGroupSelected = groupTransactionIds.every(id => selectedIds.has(id));

        return (
          <div key={group.date} className="bg-white rounded-lg shadow">
            <header className="flex justify-between items-center p-3 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={areAllInGroupSelected}
                  onCheckedChange={(checked) => handleGroupSelect(groupTransactionIds, !!checked)}
                  aria-label={`Select all transactions for ${group.date}`}
                />
                <h3 className="font-semibold text-gray-700">{new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              </div>
              <span className={`font-bold text-sm ${group.subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(group.subtotal)}</span>
            </header>
            <ul className="divide-y divide-gray-200">
              {group.transactions.map(t => (
                <li key={t.id} className="flex items-center p-3 hover:bg-gray-50">
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => handleRowSelect(t.id)}
                    aria-label={`Select transaction ${t.id}`}
                    className="mr-4"
                  />
                  {renderTransactionDetails(t)}
                  <div className="flex items-center gap-2 md:gap-4">
                    <p className={cn(
                        "font-semibold text-right w-28 md:w-32 text-sm", 
                        getAmountColor(t.type)
                    )}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} {formatCurrency(t.amount)}
                    </p>
                    <div className="relative">
                      <button onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)} className="p-1 text-gray-500 hover:text-gray-800"><MoreVertical size={20} /></button>
                      {activeMenu === t.id && (
                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                          <button onClick={() => { startEdit(t); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Edit size={14} /> Edit</button>
                          {onMakeRecurring && !t.note?.includes('(from:') && (
                            <button onClick={() => handleMakeRecurring(t)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"><Repeat size={14} /> Make Recurring</button>
                          )}
                          <button onClick={() => handleDelete(t.id)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      <div ref={loaderRef} className="flex justify-center items-center p-4 h-10">
        {isLoading && page > 0 && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        {!hasMore && allTransactions.length > 0 && <p className="text-sm text-gray-500">You&apos;ve reached the end.</p>}
      </div>
    </div>
  );
}