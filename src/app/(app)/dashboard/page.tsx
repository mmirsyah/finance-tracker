// src/app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, Metric, Text, Flex, Title, BarChart, DonutChart } from '@tremor/react';
// --- PERBAIKAN: endOfMonth dihapus dari import di bawah ini ---
import { startOfMonth, format, subMonths } from 'date-fns';
import type { TransactionSummary } from '@/types';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import { getCustomPeriod } from '@/lib/periodUtils';

// Tipe data untuk grafik
type CashFlowItem = { date: string; Pemasukan: number; Pengeluaran: number; };
type SpendingItem = { name: string; value: number; };

const formatCurrency = (value: number | null | undefined) => { 
  if (value === null || value === undefined) return 'Rp 0'; 
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); 
};

const formatNumberShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(value) >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  if (Math.abs(value) >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`;
  return `Rp ${value.toString()}`;
};


export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAppDataLoading, dataVersion } = useAppData();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [periodStartDay, setPeriodStartDay] = useState<number>(1);

  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowItem[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingItem[]>([]);

  useEffect(() => {
    const fetchProfileAndSetDate = async () => {
      if(user) {
        const { data: profile } = await supabase.from('profiles').select('period_start_day').eq('id', user.id).single();
        const startDay = profile?.period_start_day || 1;
        setPeriodStartDay(startDay);
        setDate(getCustomPeriod(startDay));
      }
    };
    fetchProfileAndSetDate();
  }, [user]);

  const { startDate, endDate } = useMemo(() => {
    const defaultPeriod = getCustomPeriod(periodStartDay);
    return {
      startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : format(defaultPeriod.from, 'yyyy-MM-dd'),
      endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : format(defaultPeriod.to, 'yyyy-MM-dd'),
    };
  }, [date, periodStartDay]);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user) {
        if (!isAppDataLoading) router.push('/login');
        return;
      }
      
      if (!date?.from) return;

      setLoading(true);
      try {
        const [ summaryResult, spendingResult ] = await Promise.all([
          supabase.rpc('get_transaction_summary', { p_user_id: user.id, p_start_date: startDate, p_end_date: endDate }),
          supabase.rpc('get_spending_by_category', { p_user_id: user.id, p_start_date: startDate, p_end_date: endDate }),
        ]);
        
        if (summaryResult.error) throw new Error(`Summary Error: ${summaryResult.error.message}`);
        if (spendingResult.error) throw new Error(`Spending Error: ${spendingResult.error.message}`);

        if (Array.isArray(summaryResult.data)) setSummary(summaryResult.data[0]);
        if (Array.isArray(spendingResult.data)) {
          setSpendingData(spendingResult.data.map(item => ({ name: item.name, value: item.amount })));
        }

        const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
        const { data: cashFlowResult, error: cashFlowError } = await supabase.rpc('get_monthly_cash_flow_v2', { 
            p_user_id: user.id, 
            p_start_date: sixMonthsAgo 
        });
        if (cashFlowError) throw new Error(`Cash Flow Error: ${cashFlowError.message}`);
        if (Array.isArray(cashFlowResult)) {
            setCashFlowData(cashFlowResult.map(item => ({
                date: format(new Date(item.month_start), 'MMM yy'),
                Pemasukan: item.total_income,
                Pengeluaran: item.total_expense,
            })));
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
  }, [router, user, isAppDataLoading, startDate, endDate, dataVersion, date]);

  if (isAppDataLoading || loading || !date) return <DashboardSkeleton />;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const netCashFlow = (summary?.total_income || 0) - (summary?.total_spending || 0);
  
  const renderDateRangeText = () => {
    if (date?.from && date?.to) {
      if (format(date.from, 'yyyy-MM-dd') === format(date.to, 'yyyy-MM-dd')) {
        return `Summary for ${format(date.from, 'd MMMM yyyy')}`;
      }
      return `Summary for ${format(date.from, 'd MMM')} to ${format(date.to, 'd MMM yyyy')}`;
    }
    return `Summary for current period`;
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div><h1 className="text-3xl font-bold text-gray-800">Dashboard</h1><Text>{renderDateRangeText()}</Text></div>
        <div><DateRangePicker date={date} setDate={setDate} /></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><Flex justifyContent="start" className="space-x-4"><div className="p-3 rounded-full bg-green-100"><ArrowUp className="w-6 h-6 text-green-600" /></div><div><Text>Total Income</Text><Metric className="text-green-600">{formatCurrency(summary?.total_income)}</Metric></div></Flex></Card>
        <Card><Flex justifyContent="start" className="space-x-4"><div className="p-3 rounded-full bg-red-100"><ArrowDown className="w-6 h-6 text-red-600" /></div><div><Text>Total Spending</Text><Metric className="text-red-600">{formatCurrency(summary?.total_spending)}</Metric></div></Flex></Card>
        <Card><Flex justifyContent="start" className="space-x-4"><div className={`p-3 rounded-full ${netCashFlow >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}><Minus className={`w-6 h-6 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} /></div><div><Text>Net Cash Flow</Text><Metric className={`${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netCashFlow)}</Metric></div></Flex></Card>
      </div>
      
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Title>Cash Flow Over Time</Title>
            <BarChart 
              className="mt-6 h-72" 
              data={cashFlowData} 
              index="date" 
              categories={['Pemasukan', 'Pengeluaran']} 
              colors={['green', 'red']}
              valueFormatter={formatNumberShort}
              yAxisWidth={60}
              noDataText="Not enough data for the past 6 months." 
            />
          </Card>
          <Card>
            <Title>Spending by Category</Title>
            <DonutChart 
              className="mt-6 h-72" 
              data={spendingData} 
              category="value" 
              index="name" 
              valueFormatter={formatCurrency} 
              colors={["blue", "cyan", "indigo", "violet", "fuchsia"]} 
              noDataText="No spending data for this period." 
            />
          </Card>
        </div>
        <div className="lg:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}