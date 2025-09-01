'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, TransactionGroup } from '@/types';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
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
    editingId: string | null;
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

export default function TransactionList({ startEdit, filters, onDataLoaded, selectedIds, onSelectionChange, editingId }: TransactionListProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const { householdId } = useAppData();

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

  const renderTransactionDetails = (t: Transaction) => {
    const isFromRecurring = t.note?.includes('(from:)');
    const categoryName = t.categories?.name || 'Uncategorized';
    const categoryId = t.categories?.id || t.category;

    if (t.type === 'transfer') {
      const primaryText = t.note || 'Transfer';
      const secondaryText = `${t.accounts?.name || '?'} → ${t.to_account?.name || '?'}`;
      return (
        <div className="flex-grow min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{primaryText}</p>
          <p className="text-xs text-muted-foreground truncate">{secondaryText}</p>
        </div>
      );
    }

    if (t.note) {
      return (
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate text-sm">{t.note}</p>
            {isFromRecurring && (
              <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full flex-shrink-0">Recurring</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span>{t.accounts?.name || 'No Account'}</span>
            <span>-</span>
            {categoryId ? (
                 <Link href={`/categories/${categoryId}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                    {categoryName}
                 </Link>
            ) : (
                <span>{categoryName}</span>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate text-sm">
                {categoryId ? (
                    <Link href={`/categories/${categoryId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {categoryName}
                    </Link>
                ) : (
                    <span>{categoryName}</span>
                )}
            </p>
            {isFromRecurring && (
              <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full flex-shrink-0">Recurring</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{t.accounts?.name || 'No Account'}</p>
        </div>
      );
    }
  };
  
  const getAmountColor = (type: string) => { 
      if (type === 'income') return 'text-secondary-text'; 
      if (type === 'expense') return 'text-destructive-text'; 
      return 'text-muted-foreground';
  };

  const groupedTransactions = groupTransactionsByDate(allTransactions);

  if (error) return <div className="text-center p-6 bg-card rounded-lg shadow border text-destructive">{error}</div>;
  if (groupedTransactions.length === 0 && !isLoading) return <div className="text-center p-6 bg-card rounded-lg shadow border text-muted-foreground">No transactions found.</div>;

  return (
    <div className="space-y-4">
      {groupedTransactions.map(group => {
        const groupTransactionIds = group.transactions.map(t => t.id);
        const areAllInGroupSelected = groupTransactionIds.every(id => selectedIds.has(id));

        return (
          <div key={group.date} className="bg-card rounded-lg shadow border">
            <header className="flex justify-between items-center p-3 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={areAllInGroupSelected}
                  onCheckedChange={(checked) => handleGroupSelect(groupTransactionIds, !!checked)}
                  aria-label={`Select all transactions for ${group.date}`}
                />
                <h3 className="font-semibold text-foreground">{new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              </div>
              <span className={cn('font-bold text-sm', group.subtotal >= 0 ? 'text-secondary-text' : 'text-destructive-text')}>{formatCurrency(group.subtotal)}</span>
            </header>
            <ul className="divide-y divide-border">
              {group.transactions.map(t => (
                <li 
                  key={t.id} 
                  className={cn(
                    "flex items-center p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    editingId === t.id && "bg-accent"
                  )} 
                  onClick={() => startEdit(t)}
                >
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => handleRowSelect(t.id)}
                    onClick={(e) => e.stopPropagation()}
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
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      <div ref={loaderRef} className="flex justify-center items-center p-4 h-10">
        {isLoading && page > 0 && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
        {!hasMore && allTransactions.length > 0 && <p className="text-sm text-muted-foreground">You&apos;ve reached the end.</p>}
      </div>
    </div>
  );
}
