// src/app/dashboard/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, Metric, Text, Flex, Title, BarChart, DonutChart, BarList } from '@tremor/react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { Account, TransactionSummary } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import OnboardingGuide from '@/components/OnboardingGuide';

type CashFlowItem = { month_start: string; total_income: number; total_expense: number; };
type SpendingItem = { name: string; amount: number; };
const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowItem[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingItem[]>([]);
  const [accountBalances, setAccountBalances] = useState<Account[]>([]);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true });
          setAccountCount(count ?? 0);

          if (count !== null && count > 0) {
            const now = new Date();
            const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
            const [ summaryResult, cashFlowResult, spendingResult, accountsResult ] = await Promise.all([
              supabase.rpc('get_transaction_summary', { p_user_id: session.user.id, p_start_date: startDate, p_end_date: endDate }),
              supabase.rpc('get_monthly_cash_flow', { p_user_id: session.user.id }),
              supabase.rpc('get_spending_by_category', { p_user_id: session.user.id, p_start_date: startDate, p_end_date: endDate }),
              supabase.rpc('get_accounts_with_balance', { p_user_id: session.user.id })
            ]);
            if (summaryResult.error) throw new Error(`Summary Error: ${summaryResult.error.message}`);
            if (cashFlowResult.error) throw new Error(`Cash Flow Error: ${cashFlowResult.error.message}`);
            if (spendingResult.error) throw new Error(`Spending Error: ${spendingResult.error.message}`);
            if (accountsResult.error) throw new Error(`Accounts Error: ${accountsResult.error.message}`);
            setSummary(summaryResult.data?.[0] || null);
            setCashFlowData(cashFlowResult.data || []);
            setSpendingData(spendingResult.data || []);
            setAccountBalances(accountsResult.data || []);
          }
        } else {
          router.push('/login');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error("Critical dashboard fetch error:", err);
        setError(`Failed to load dashboard: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    initializeDashboard();
  }, [router]);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  if (accountCount === 0) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center" style={{ height: 'calc(100vh - 4rem)'}}>
        <OnboardingGuide
          title={`Welcome!`}
          message="This app will help you manage your finances to achieve financial freedom. To get started, let's add your first financial account."
          buttonText="Add Your First Account"
          buttonLink="/accounts?action=new"
        />
      </div>
    );
  }

  const netCashFlow = (summary?.total_income || 0) - (summary?.total_spending || 0);
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1><Text>Summary for {format(new Date(), 'MMMM yyyy')}</Text>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <Card><Flex justifyContent="start" className="space-x-4"><div className="p-3 rounded-full bg-green-100"><ArrowUp className="w-6 h-6 text-green-600" /></div><div><Text>Total Income</Text><Metric className="text-green-600">{formatCurrency(summary?.total_income)}</Metric></div></Flex></Card>
        <Card><Flex justifyContent="start" className="space-x-4"><div className="p-3 rounded-full bg-red-100"><ArrowDown className="w-6 h-6 text-red-600" /></div><div><Text>Total Spending</Text><Metric className="text-red-600">{formatCurrency(summary?.total_spending)}</Metric></div></Flex></Card>
        <Card><Flex justifyContent="start" className="space-x-4"><div className={`p-3 rounded-full ${netCashFlow >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}><Minus className={`w-6 h-6 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} /></div><div><Text>Net Cash Flow</Text><Metric className={`${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netCashFlow)}</Metric></div></Flex></Card>
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3"><Card className="h-full"><Title>Cash Flow Over Last 6 Months</Title><BarChart className="mt-6 h-72" data={cashFlowData} index="month_start" categories={['total_income', 'total_expense']} colors={['green', 'red']} valueFormatter={formatCurrency} yAxisWidth={60} noDataText="Not enough data." /></Card></div>
        <div className="lg:col-span-2"><Card className="h-full"><Title>Spending by Category (This Month)</Title><DonutChart className="mt-6 h-72" data={spendingData} category="amount" index="name" valueFormatter={formatCurrency} colors={["blue", "cyan", "indigo", "violet", "fuchsia"]} noDataText="No spending data." /></Card></div>
        <div className="lg:col-span-5"><Card><Title>Account Balances</Title><BarList data={accountBalances.map(acc => ({ name: acc.name, value: acc.balance || 0 }))} className="mt-4" valueFormatter={formatCurrency} /></Card></div>
      </div>
    </div>
  );
}
