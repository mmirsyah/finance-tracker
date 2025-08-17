// src/components/TransactionList.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, TransactionGroup } from '@/types';
import Link from 'next/link';
import { MoreVertical, Edit, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { toast } from 'sonner';

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

export default function TransactionList({ startEdit, filters, onDataLoaded }: TransactionListProps) {
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
      .select(`*, categories ( name ), accounts:account_id ( name ), to_account:to_account_id ( name )`, { count: 'exact' })
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

  // Effect untuk memuat data ketika filter berubah
  useEffect(() => {
    setPage(0);
    setAllTransactions([]);
    setHasMore(true);
    // setTimeout untuk memastikan state loading di parent sempat ter-update
    setTimeout(() => fetchTransactions(0, true), 0);
  }, [filters, fetchTransactions]);

  // Effect untuk infinite scroll
  useEffect(() => {
      if (page > 0) {
          fetchTransactions(page, false);
      }
  }, [page, fetchTransactions]);

  // Effect untuk setup IntersectionObserver
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
    if (confirm('Are you sure you want to delete this transaction?')) {
      const promise = async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        if (error) { throw error; }
        // Sekarang panggil refetchData dari context, bukan callback prop
        refetchData();
      };

      toast.promise(promise(), {
        loading: 'Deleting transaction...',
        success: 'Transaction deleted!',
        error: (err) => `Error: ${err.message}`,
      });

      setActiveMenu(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setActiveMenu(null); } };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [activeMenu]);

  const groupedTransactions = groupTransactionsByDate(allTransactions);

  if (error) return <div className="text-center p-6 bg-white rounded-lg shadow text-red-500">{error}</div>;
  if (groupedTransactions.length === 0 && !isLoading) return <div className="text-center p-6 bg-white rounded-lg shadow text-gray-500">No transactions found.</div>;

  const renderTransactionDetails = (t: Transaction) => { if (t.type === 'transfer') { return ( <div className="flex-grow"> <p className="font-semibold text-gray-800">Transfer</p> <div className="text-sm text-gray-500 flex items-center gap-1"> <span>{t.accounts?.name || '?'}</span> <ArrowRight size={12} /> <span>{t.to_account?.name || '?'}</span> </div> </div> ); } return ( <div className="flex-grow"> <p className="font-semibold text-gray-800"> <Link href={`/categories/${t.category}`} className="text-blue-600 hover:text-blue-800 hover:underline">{t.categories?.name || 'Uncategorized'}</Link> </p> <p className="text-sm text-gray-500">{t.note || 'No note'}</p> </div> ); };
  const getAmountColor = (type: string) => { if (type === 'income') return 'text-green-600'; if (type === 'expense') return 'text-red-600'; return 'text-gray-500'; };

  return (
    <div className="space-y-4">
      {groupedTransactions.map(group => (
        <div key={group.date} className="bg-white rounded-lg shadow">
          <header className="flex justify-between items-center p-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">{new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <span className={`font-bold text-sm ${group.subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(group.subtotal)}</span>
          </header>
          <ul className="divide-y divide-gray-200">
            {group.transactions.map(t => (
              <li key={t.id} className="flex items-center p-3 hover:bg-gray-50">
                {renderTransactionDetails(t)}
                <div className="flex items-center gap-4">
                  {t.type !== 'transfer' && (<span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full hidden md:block">{t.accounts?.name || 'No Account'}</span>)}
                  <p className={`font-bold text-right w-32 ${getAmountColor(t.type)}`}>{t.type === 'income' ? '+' : ''} {formatCurrency(t.amount)}</p>
                  <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)} className="p-1 text-gray-500 hover:text-gray-800"><MoreVertical size={20} /></button>
                    {activeMenu === t.id && (
                      <div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10 border">
                        <button onClick={() => { startEdit(t); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Edit size={14} /> Edit</button>
                        <button onClick={() => handleDelete(t.id)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div ref={loaderRef} className="flex justify-center items-center p-4 h-10">
        {isLoading && page > 0 && <Loader2 className="w-6 h-6 animate-spin text-gray-500" />}
        {!hasMore && allTransactions.length > 0 && <p className="text-sm text-gray-500">You&apos;ve reached the end.</p>}
      </div>
    </div>
  );
}