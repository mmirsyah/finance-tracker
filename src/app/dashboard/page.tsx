// src/app/dashboard/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, Metric, Text, Flex, Title, BarChart, DonutChart, BarList } from '@tremor/react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { Account } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner'; // Import spinner

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // State baru untuk menangani error
  
  const [summary, setSummary] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [spendingData, setSpendingData] = useState([]);
  const [accountBalances, setAccountBalances] = useState<Account[]>([]);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);

          const now = new Date();
          const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

          const [
            summaryResult, 
            cashFlowResult, 
            spendingResult, 
            accountsResult
          ] = await Promise.all([
            supabase.rpc('get_transaction_summary', { p_user_id: session.user.id, p_start_date: startDate, p_end_date: endDate }),
            supabase.rpc('get_monthly_cash_flow', { p_user_id: session.user.id }),
            supabase.rpc('get_spending_by_category', { p_user_id: session.user.id, p_start_date: startDate, p_end_date: endDate }),
            supabase.rpc('get_accounts_with_balance', { p_user_id: session.user.id })
          ]);
          
          // Cek error untuk setiap hasil
          if (summaryResult.error) console.error("Summary RPC Error:", summaryResult.error);
          else if (summaryResult.data) setSummary(summaryResult.data[0]);

          if (cashFlowResult.error) console.error("Cash Flow RPC Error:", cashFlowResult.error);
          else setCashFlowData(cashFlowResult.data as any);

          if (spendingResult.error) console.error("Spending RPC Error:", spendingResult.error);
          else setSpendingData(spendingResult.data as any);

          if (accountsResult.error) console.error("Accounts RPC Error:", accountsResult.error);
          else setAccountBalances(accountsResult.data as any);

        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error("A critical error occurred during dashboard data fetching:", err);
        setError("Sorry, something went wrong while loading the dashboard.");
      } finally {
        // 'finally' akan selalu berjalan, baik ada error maupun tidak
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);

  if (loading) {
    return <LoadingSpinner text="Loading your dashboard..." />;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  const netCashFlow = (summary?.total_income || 0) - (summary?.total_spending || 0);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <Text>Summary for {format(new Date(), 'MMMM yyyy')}</Text>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <Card><Flex justifyContent="start" className="space-x-4"><div className="p-3 rounded-full bg-green-100"><ArrowUp className="w-6 h-6 text-green-600" /></div><div><Text>Total Income</Text><Metric className="text-green-600">{formatCurrency(summary?.total_income)}</Metric></div></Flex></Card>
        <Card><Flex justifyContent="start" className="space-x-4"><div className="p-3 rounded-full bg-red-100"><ArrowDown className="w-6 h-6 text-red-600" /></div><div><Text>Total Spending</Text><Metric className="text-red-600">{formatCurrency(summary?.total_spending)}</Metric></div></Flex></Card>
        <Card><Flex justifyContent="start" className="space-x-4"><div className={`p-3 rounded-full ${netCashFlow >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}><Minus className={`w-6 h-6 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} /></div><div><Text>Net Cash Flow</Text><Metric className={`${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netCashFlow)}</Metric></div></Flex></Card>
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3"><Card className="h-full"><Title>Cash Flow Over Last 6 Months</Title><BarChart className="mt-6 h-72" data={cashFlowData} index="month_start" categories={['total_income', 'total_expense']} colors={['green', 'red']} valueFormatter={formatCurrency} yAxisWidth={60} noDataText="Not enough data to display chart." /></Card></div>
          <div className="lg:col-span-2"><Card className="h-full"><Title>Spending by Category (This Month)</Title><DonutChart className="mt-6 h-72" data={spendingData} category="amount" index="name" valueFormatter={formatCurrency} colors={["blue", "cyan", "indigo", "violet", "fuchsia"]} noDataText="No spending data for this month." /></Card></div>
          <div className="lg:col-span-5"><Card><Title>Account Balances</Title><BarList data={accountBalances.map(acc => ({ name: acc.name, value: acc.balance || 0 }))} className="mt-4" valueFormatter={formatCurrency} /></Card></div>
      </div>
    </div>
  );
}