// src/components/dashboard/RecentTransactions.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, Title, Text } from '@tremor/react';
import { ArrowRightLeft, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { RecentTransaction } from '@/types';

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const TransactionIcon = ({ type }: { type: string }) => {
  if (type === 'income') return <ArrowUp className="w-5 h-5 text-green-500 bg-green-100 rounded-full p-1" />;
  if (type === 'expense') return <ArrowDown className="w-5 h-5 text-red-500 bg-red-100 rounded-full p-1" />;
  return <ArrowRightLeft className="w-5 h-5 text-gray-500 bg-gray-100 rounded-full p-1" />;
};

export default function RecentTransactions() {
  const { user, dataVersion } = useAppData(); // Ambil juga dataVersion
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase.rpc('get_recent_transactions', {
        p_user_id: user.id,
        p_limit: 5,
      });

      if (error) {
        console.error("Error fetching recent transactions:", error);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    };

    fetchRecent();
    // Buat komponen ini juga "mendengarkan" perubahan data
  }, [user, dataVersion]);

  if (loading) {
    return (
      <Card>
        <Title>Recent Transactions</Title>
        <div className="mt-4 space-y-4">
          {[...Array(3)].map((_, i) => (
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
            <li key={t.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <TransactionIcon type={t.type} />
                <div className="flex-1">
                  {/* --- PERUBAHAN DI SINI --- */}
                  <Text className="font-medium text-gray-800 truncate">
                    {t.note || t.category_name || t.type}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {t.account_name}
                  </Text>
                </div>
              </div>
              <Text className={`font-semibold shrink-0 ml-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(t.amount)}
              </Text>
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