// src/components/TransactionSummary.tsx

"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Download } from 'lucide-react';
import type { TransactionSummary as TSummary } from '@/types';

interface SummaryProps { userId: string; }
const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };
const formatDate = (dateString: string | null | undefined) => { if (!dateString) return 'N/A'; const date = new Date(dateString); if (isNaN(date.getTime())) return 'N/A'; return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };

export default function TransactionSummary({ userId }: SummaryProps) {
  const [summary, setSummary] = useState<TSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const startDate = '1970-01-01';
    const endDate = '2999-12-31';
    
    const { data, error } = await supabase.rpc('get_transaction_summary', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    if (error) { console.error('Error fetching summary:', error); } else if (data && data.length > 0) { setSummary(data[0]); }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSummary();
      const channel = supabase.channel(`transaction_summary_update_for_${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, () => { fetchSummary(); }).subscribe();
       return () => { supabase.removeChannel(channel); };
    }
  }, [userId, fetchSummary]);

  if (loading) { return (<div className="bg-white p-6 rounded-lg shadow-md"><h2 className="text-xl font-bold mb-4 text-gray-800">Summary</h2><div className="text-center text-gray-500">Loading summary...</div></div>); }
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Summary</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Total transactions</span><span className="font-medium text-gray-900">{summary?.total_transactions || 0}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Largest transaction</span><span className="font-medium text-green-600">{formatCurrency(summary?.largest_transaction)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Largest expense</span><span className="font-medium text-red-600">{formatCurrency(summary?.largest_expense)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Average transaction</span><span className="font-medium text-gray-900">{formatCurrency(summary?.average_transaction)}</span></div>
        <hr className="my-3"/>
        <div className="flex justify-between"><span className="text-gray-600">Total income</span><span className="font-medium text-green-600">{formatCurrency(summary?.total_income)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Total spending</span><span className="font-medium text-red-600">{formatCurrency(summary?.total_spending)}</span></div>
        <hr className="my-3"/>
        <div className="flex justify-between"><span className="text-gray-600">First transaction</span><span className="font-medium text-gray-900">{formatDate(summary?.first_transaction_date)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Last transaction</span><span className="font-medium text-gray-900">{formatDate(summary?.last_transaction_date)}</span></div>
      </div>
      <button disabled className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed"><Download className="w-4 h-4" /> Download CSV</button>
    </div>
  );
}