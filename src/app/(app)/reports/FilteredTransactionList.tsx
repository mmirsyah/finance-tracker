// src/app/(app)/reports/FilteredTransactionList.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/contexts/AppDataContext';
import { toast } from 'sonner';
import { ArrowUpDown, ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import TransactionListSkeleton from '@/components/skeletons/TransactionListSkeleton';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;

interface Props {
  startDate: string;
  endDate: string;
}

type SortKey = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function FilteredTransactionList({ startDate, endDate }: Props) {
    const { householdId, handleOpenModalForEdit } = useAppData();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loaderRef = useRef<HTMLDivElement | null>(null);

    const fetchTransactions = useCallback(async (pageNum: number) => {
        if (!householdId) return;
        
        setIsLoading(true);

        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error, count } = await supabase
            .from('transactions')
            .select('*, categories(name), accounts:account_id(name), to_account:to_account_id(name)', { count: 'exact' })
            .eq('household_id', householdId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order(sortKey, { ascending: sortDirection === 'asc' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            toast.error("Failed to load transaction list: " + error.message);
        } else {
            const newTransactions = (data as Transaction[]) || [];
            setTransactions(prev => pageNum === 0 ? newTransactions : [...prev, ...newTransactions]);
            setHasMore((count || 0) > (pageNum + 1) * PAGE_SIZE);
        }
        setIsLoading(false);
    }, [householdId, startDate, endDate, sortKey, sortDirection]);
    
    useEffect(() => {
        setPage(0);
        setTransactions([]);
        setHasMore(true);
        // Gunakan function callback daripada string
        setTimeout(() => {
            fetchTransactions(0);
        }, 0);
    }, [startDate, endDate, sortKey, sortDirection, fetchTransactions]);

    useEffect(() => {
        if (page > 0) {
            fetchTransactions(page);
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
        
        if (loaderRef.current) {
          observerRef.current.observe(loaderRef.current);
        }
        
        const currentObserver = observerRef.current;
        
        return () => {
          if (currentObserver) {
            currentObserver.disconnect();
          }
        };
    }, [hasMore, isLoading]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const SortButton = ({ columnKey, label }: { columnKey: SortKey, label: string }) => (
        <Button variant="ghost" onClick={() => handleSort(columnKey)}>
            {label}
            {sortKey === columnKey && <ArrowUpDown className="ml-2 h-4 w-4" />}
        </Button>
    );

    const renderTransactionDetails = (t: Transaction) => {
        if (t.type === 'transfer') {
          return ( <div className="flex-grow"> <p className="font-semibold text-foreground">Transfer</p> <div className="text-sm text-muted-foreground flex items-center gap-1"> <span>{t.accounts?.name || '?'}</span> <ArrowRight size={12} /> <span>{t.to_account?.name || '?'}</span> </div> </div> );
        }
        return ( <div className="flex-grow"> <p className="font-semibold text-foreground">{t.categories?.name || 'Uncategorized'}</p> <p className="text-sm text-muted-foreground">{t.note || 'No note'}</p> </div> );
    };
      
    const getAmountColor = (type: string) => {
        if (type === 'income') return 'text-secondary';
        if (type === 'expense') return 'text-destructive';
        return 'text-muted-foreground';
    };

    if (isLoading && page === 0) {
        return <TransactionListSkeleton />;
    }

    return (
        <div className="bg-card rounded-lg shadow overflow-hidden border">
            <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="text-lg font-semibold">All Transactions</h3>
                <div className="flex gap-2">
                    <SortButton columnKey="date" label="Date" />
                    <SortButton columnKey="amount" label="Amount" />
                </div>
            </div>
            {transactions.length > 0 ? (
                <>
                    <ul className="divide-y divide-border">
                        {transactions.map(t => (
                            <li key={t.id} className="flex items-center p-3 hover:bg-muted/50 cursor-pointer" onClick={() => handleOpenModalForEdit(t)}>
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="text-center w-12 shrink-0">
                                        <p className="font-bold text-foreground">{format(parseISO(t.date), 'd')}</p>
                                        <p className="text-xs text-muted-foreground uppercase">{format(parseISO(t.date), 'MMM')}</p>
                                    </div>
                                    {renderTransactionDetails(t)}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm bg-muted text-muted-foreground px-2 py-1 rounded-full hidden md:block">
                                        {t.accounts?.name || 'No Account'}
                                    </span>
                                    <p className={`font-bold text-right w-32 ${getAmountColor(t.type)}`}>
                                        {t.type === 'income' ? '+' : ''} {formatCurrency(t.amount)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div ref={loaderRef} className="flex justify-center items-center p-4 h-10">
                        {isLoading && page > 0 && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
                        {!hasMore && transactions.length > 0 && <p className="text-sm text-muted-foreground">You&apos;ve reached the end.</p>}
                    </div>
                </>
            ) : (
                <p className="p-6 text-center text-muted-foreground">No transactions found for this period.</p>
            )}
        </div>
    );
}
