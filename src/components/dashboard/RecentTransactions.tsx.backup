// src/components/dashboard/RecentTransactions.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, Title, Text } from '@tremor/react';
import { ArrowRightLeft, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import Link from 'next/link';
import { RecentTransaction, Transaction } from '@/types';
import { toast } from 'sonner';

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const TransactionIcon = ({ type }: { type: string }) => {
  if (type === 'income') return <ArrowUp className="w-5 h-5 text-green-500 bg-green-100 rounded-full p-1" />;
  if (type === 'expense') return <ArrowDown className="w-5 h-5 text-red-500 bg-red-100 rounded-full p-1" />;
  return <ArrowRightLeft className="w-5 h-5 text-gray-500 bg-gray-100 rounded-full p-1" />;
};

export default function RecentTransactions() {
  // --- PERUBAHAN: Mengambil householdId dari context ---
  const { user, householdId, dataVersion, handleOpenModalForEdit } = useAppData();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      // --- PERUBAHAN: Pastikan householdId sudah ada sebelum fetch ---
      if (!user || !householdId) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, date, type, amount, note,
          categories ( name ),
          accounts:account_id ( name )
        `)
        // --- PERBAIKAN UTAMA: Filter berdasarkan household_id, bukan user_id ---
        .eq('household_id', householdId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)
        .returns<Transaction[]>();

      if (error) {
        console.error("Error fetching recent transactions:", error);
      } else if (data) {
        const mappedData = data.map(t => ({
          id: t.id,
          date: t.date,
          type: t.type as 'expense' | 'income' | 'transfer',
          amount: t.amount,
          note: t.note,
          category_name: t.categories?.name || (t.type === 'transfer' ? 'Transfer' : 'Uncategorized'),
          account_name: t.accounts?.name || 'N/A'
        }));
        setTransactions(mappedData);
      }
      setLoading(false);
    };

    fetchRecent();
    // --- PERUBAHAN: Menambahkan householdId ke dependency array ---
  }, [user, householdId, dataVersion]);

  const handleEdit = async (transactionId: string) => {
    const { data: fullTransaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !fullTransaction) {
      toast.error("Gagal mengambil detail transaksi untuk diedit.");
      console.error("Edit error:", error);
      return;
    }

    handleOpenModalForEdit(fullTransaction);
  };

  if (loading) {
    return (
      <Card>
        <Title>Recent Transactions</Title>
        <div className="mt-4 space-y-4">
          {[...Array(5)].map((_, i) => ( // Tampilkan 5 skeleton item
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  
  return (
    <Card>
      <Title>Recent Transactions</Title>
      {transactions.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-200">
          {transactions.map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <TransactionIcon type={t.type} />
                <div className="flex-1 min-w-0">
                  <Text className="font-medium text-gray-800 truncate">
                    {t.note || t.category_name}
                  </Text>
                  <Text className="text-sm text-gray-500 truncate">
                    {t.account_name}
                  </Text>
                </div>
              </div>
              <Text className={`font-semibold shrink-0 ml-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(t.amount)}
              </Text>
              <button
                onClick={() => handleEdit(t.id)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded"
                aria-label="Edit transaction"
              >
                <Edit className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Text className="mt-4 text-center text-gray-500">No recent transactions found.</Text>
      )}
      <div className="mt-4 text-center">
        <Link href="/transactions" className="text-sm font-semibold text-primary hover:underline">
          View All Transactions
        </Link>
      </div>
    </Card>
  );
}