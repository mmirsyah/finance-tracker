// src/components/dashboard/RecentTransactions.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, ArrowUp, ArrowDown, Edit, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { RecentTransaction, Transaction } from '@/types';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const TransactionIcon = ({ type }: { type: string }) => {
  const iconClass = "w-5 h-5 rounded-full p-1";
  if (type === 'income') return <ArrowUp className={`${iconClass} text-green-600 bg-green-100`} />;
  if (type === 'expense') return <ArrowDown className={`${iconClass} text-red-600 bg-red-100`} />;
  return <ArrowRightLeft className={`${iconClass} text-blue-600 bg-blue-100`} />;
};

const TransactionSkeleton = () => (
  <div className="flex items-center space-x-4 py-3 animate-pulse">
    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="h-5 bg-gray-200 rounded w-20"></div>
    <div className="w-8 h-8 bg-gray-200 rounded"></div>
  </div>
);

export default function RecentTransactions() {
  const { user, householdId, dataVersion, handleOpenModalForEdit } = useAppData();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user || !householdId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            id, date, type, amount, note,
            categories ( name ),
            accounts:account_id ( name )
          `)
          .eq('household_id', householdId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5)
          .returns<Transaction[]>();

        if (error) throw error;

        if (data) {
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
      } catch (err) {
        console.error("Error fetching recent transactions:", err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [user, householdId, dataVersion]);

  const handleEdit = async (transactionId: string) => {
    try {
      const { data: fullTransaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !fullTransaction) {
        throw new Error('Failed to fetch transaction details');
      }

      handleOpenModalForEdit(fullTransaction);
    } catch (err) {
      toast.error("Gagal mengambil detail transaksi untuk diedit.");
      console.error("Edit error:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-600 mb-1">Gagal memuat transaksi</p>
            <p className="text-xs text-muted-foreground">Silakan refresh halaman</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Belum ada transaksi</p>
            <p className="text-sm text-muted-foreground mb-4">Mulai dengan menambah transaksi pertama Anda</p>
            <Button asChild size="sm">
              <Link href="/transactions">Tambah Transaksi</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Transaksi Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <TransactionIcon type={t.type} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {t.note || t.category_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="truncate">{t.account_name}</span>
                    <span>•</span>
                    <span>{formatDate(t.date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${
                  t.type === 'income' ? 'text-green-600' : 
                  t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                  {formatCurrency(t.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(t.id)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
                  aria-label="Edit transaction"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">
              Lihat Semua Transaksi
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}