// src/components/TransactionList.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, TransactionGroup } from '@/types';
import Link from 'next/link';
import { MoreVertical, Edit, Trash2, ArrowRight } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import toast from 'react-hot-toast';

interface TransactionListProps { 
  userId: string; 
  startEdit: (transaction: Transaction) => void; 
  filters: { filterType: string; filterCategory: string; filterAccount: string; filterStartDate: string; filterEndDate: string; };
  onDataLoaded: () => void;
  onTransactionChange: () => void;
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

export default function TransactionList({ userId, startEdit, filters, onDataLoaded, onTransactionChange }: TransactionListProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { householdId } = useAppData();

  const fetchTransactions = useCallback(async () => {
    if (!householdId) {
      onDataLoaded();
      return;
    };

    setError(null);

    let query = supabase
      .from('transactions')
      .select(`*, categories ( name ), accounts:account_id ( name ), to_account:to_account_id ( name )`)
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      // --- PERUBAHAN DI SINI ---
      // Menambahkan urutan sortir sekunder berdasarkan waktu pembuatan (created_at)
      .order('created_at', { ascending: false });

    if (filters.filterType) query = query.eq('type', filters.filterType);
    if (filters.filterCategory) query = query.eq('category', Number(filters.filterCategory));
    if (filters.filterAccount) query = query.or(`account_id.eq.${filters.filterAccount},to_account_id.eq.${filters.filterAccount}`);
    if (filters.filterStartDate) query = query.gte('date', filters.filterStartDate);
    if (filters.filterEndDate) query = query.lte('date', filters.filterEndDate);
    
    const { data, error: fetchError } = await query.returns<Transaction[]>();
    
    if (fetchError) { setError(`Failed to load data: ${fetchError.message}`); } 
    else { setAllTransactions(data || []); }
    onDataLoaded();
  }, [householdId, filters, onDataLoaded]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);


  useEffect(() => {
    
    const channel = supabase.channel(`realtime-transactions-${userId}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, 
          () => {
            console.log('Realtime change detected, triggering refetch.');
            onTransactionChange();
          }
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [userId, onTransactionChange]);
  
  const handleDelete = async (transactionId: string) => { 
    if (confirm('Are you sure you want to delete this transaction?')) { 
      const promise = async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        if (error) throw error;
        onTransactionChange();
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
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setActiveMenu(null); } }; 
    if (activeMenu) { 
      document.addEventListener('mousedown', handleClickOutside); 
      document.addEventListener('keydown', handleKeyDown); 
    } 
    return () => { 
      document.removeEventListener('mousedown', handleClickOutside); 
      document.removeEventListener('keydown', handleKeyDown); 
    }; 
  }, [activeMenu]);
  
  const groupedTransactions = groupTransactionsByDate(allTransactions);


  if (error) return <div className="text-center p-6 bg-white rounded-lg shadow text-red-500">{error}</div>;
  if (groupedTransactions.length === 0) return <div className="text-center p-6 bg-white rounded-lg shadow text-gray-500">No transactions found for the selected filters.</div>;
  
  const renderTransactionDetails = (t: Transaction) => { if (t.type === 'transfer') { return ( <div className="flex-grow"> <p className="font-semibold text-gray-800">Transfer</p> <div className="text-sm text-gray-500 flex items-center gap-1"> <span>{t.accounts?.name || '?'}</span> <ArrowRight size={12} /> <span>{t.to_account?.name || '?'}</span> </div> </div> ); } return ( <div className="flex-grow"> <p className="font-semibold text-gray-800"> <Link href={`/categories/${t.category}`} className="text-blue-600 hover:text-blue-800 hover:underline">{t.categories?.name || 'Uncategorized'}</Link> </p> <p className="text-sm text-gray-500">{t.note || 'No note'}</p> </div> ); };
  const getAmountColor = (type: string) => { if (type === 'income') return 'text-green-600'; if (type === 'expense') return 'text-red-600'; return 'text-gray-500'; };
  
  return (
    <div className="space-y-4">{groupedTransactions.map(group => (<div key={group.date} className="bg-white rounded-lg shadow"><header className="flex justify-between items-center p-3 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">{new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3><span className={`font-bold text-sm ${group.subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(group.subtotal)}</span></header><ul className="divide-y divide-gray-200">{group.transactions.map(t => (<li key={t.id} className="flex items-center p-3 hover:bg-gray-50">{renderTransactionDetails(t)}<div className="flex items-center gap-4">{t.type !== 'transfer' && (<span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full hidden md:block">{t.accounts?.name || 'No Account'}</span>)}<p className={`font-bold text-right w-32 ${getAmountColor(t.type)}`}>{t.type === 'income' ? '+' : ''} {formatCurrency(t.amount)}</p><div className="relative"><button onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)} className="p-1 text-gray-500 hover:text-gray-800"><MoreVertical size={20} /></button>{activeMenu === t.id && (<div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10 border"><button onClick={() => { startEdit(t); setActiveMenu(null); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Edit size={14} /> Edit</button><button onClick={() => handleDelete(t.id)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"><Trash2 size={14} /> Delete</button></div>)}</div></div></li>))}</ul></div>))}</div>
  );
}