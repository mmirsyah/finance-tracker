// src/app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, Metric, Text, Flex, Title, DonutChart } from '@tremor/react';
import { format } from 'date-fns';
import type { TransactionSummary } from '@/types';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import { getCustomPeriod } from '@/lib/periodUtils';
import CashFlowChart from '@/components/dashboard/CashFlowChart';

type SpendingItem = { name: string; value: number; };

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};


export default function DashboardPage() {
  const router = useRouter();
  // --- PERBAIKAN: Ambil householdId dari context ---
  const { user, isLoading: isAppDataLoading, dataVersion, categories, householdId } = useAppData();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [periodStartDay, setPeriodStartDay] = useState<number>(1);

  const [summary, setSummary] = useState<TransactionSummary | null>(null);
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
      // --- PERBAIKAN: Pastikan householdId juga sudah siap ---
      if (!user || !householdId) {
        if (!isAppDataLoading) router.push('/login');
        return;
      }

      if (!date?.from) return;

      setLoading(true);
      try {
        // --- PERBAIKAN: Gunakan p_household_id, bukan p_user_id ---
        const [ summaryResult, spendingResult ] = await Promise.all([
          supabase.rpc('get_transaction_summary', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
          supabase.rpc('get_spending_by_category', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
        ]);

        if (summaryResult.error) throw new Error(`Summary Error: ${summaryResult.error.message}`);
        if (spendingResult.error) throw new Error(`Spending Error: ${spendingResult.error.message}`);

        if (Array.isArray(summaryResult.data)) setSummary(summaryResult.data[0]);

        if (Array.isArray(spendingResult.data)) {
          const spendingMap = spendingResult.data.reduce((acc: Record<string, number>, item) => {
            const categoryName = categories.find(c => c.id === item.category_id)?.name || 'Lainnya';
            if (!acc[categoryName]) {
              acc[categoryName] = 0;
            }
            acc[categoryName] += item.total_spent;
            return acc;
          }, {});

          const aggregatedSpendingData = Object.entries(spendingMap).map(([name, value]) => ({
            name,
            value,
          }));

          setSpendingData(aggregatedSpendingData);
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
  }, [router, user, householdId, isAppDataLoading, startDate, endDate, dataVersion, date, categories]);

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
  
  const spendingColors = ["blue", "cyan", "indigo", "violet", "fuchsia", "pink"];
  
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
          <CashFlowChart startDate={startDate} />
          
          <Card>
            <Title>Spending by Category</Title>
            <div className="flex items-center justify-start mt-6">
              <DonutChart
                className="h-48 w-48"
                data={spendingData}
                category="value"
                index="name"
                valueFormatter={formatCurrency}
                colors={spendingColors}
                showAnimation={true}
              />
              <div className="ml-20">
                {spendingData.map((item, index) => (
                  <div key={item.name} className="flex items-center space-x-2 my-2">
                    <span className={`w-3 h-3 rounded-full bg-${spendingColors[index % spendingColors.length]}-500`}></span>
                    <Text className="w-24 truncate">{item.name}</Text>
                    <Text className="font-medium">{formatCurrency(item.value)}</Text>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}