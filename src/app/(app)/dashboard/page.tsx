// src/app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowDown, ArrowUp, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Metric, Text, Flex } from '@tremor/react';
import { format, subDays, differenceInDays } from 'date-fns';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import { getCustomPeriod } from '@/lib/periodUtils';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import SpendingByCategory from '@/components/dashboard/SpendingByCategory';

interface SpendingDataPoint {
  id: number;
  name: string;
  value: number;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

interface MetricCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  currentValue: number;
  previousValue: number;
  isPositiveGood?: boolean;
}

const MetricCard = ({ title, icon: Icon, iconColor, currentValue, previousValue, isPositiveGood = true }: MetricCardProps) => {
  const diff = previousValue === 0 
    ? (currentValue !== 0 ? 100 : 0)
    : ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  
  const isPositive = diff >= 0;
  const isNeutral = Math.abs(diff) < 0.1 || (currentValue === 0 && previousValue === 0);

  let trendIcon; let trendColor;

  if (isNeutral) { trendIcon = Minus; trendColor = 'text-gray-500';
  } else if (isPositive) { trendIcon = TrendingUp; trendColor = isPositiveGood ? 'text-green-500' : 'text-red-500';
  } else { trendIcon = TrendingDown; trendColor = isPositiveGood ? 'text-red-500' : 'text-green-500'; }

  const TrendIndicator = trendIcon;

  return (
    <Card>
      <Flex justifyContent="start" alignItems="center" className="space-x-4">
        <div className={`p-3 rounded-full ${iconColor}`}><Icon className="w-6 h-6 text-white" /></div>
        <div><Text>{title}</Text><Metric>{formatCurrency(currentValue)}</Metric></div>
      </Flex>
      <Flex justifyContent="end" alignItems="center" className="mt-4 space-x-2">
        <TrendIndicator className={`w-4 h-4 ${trendColor}`} /><Text className={trendColor}>{isNeutral ? 'No change' : `${diff.toFixed(1)}% vs previous period`}</Text>
      </Flex>
    </Card>
  );
};


export default function DashboardPage() {
  const { user, isLoading: isAppDataLoading, dataVersion, householdId } = useAppData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [periodStartDay, setPeriodStartDay] = useState<number>(1);
  const [comparisonData, setComparisonData] = useState({ current_income: 0, current_spending: 0, previous_income: 0, previous_spending: 0 });
  
  const [spendingData, setSpendingData] = useState<SpendingDataPoint[]>([]);

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

  const { startDate, endDate, previousStartDate, previousEndDate } = useMemo(() => {
    const defaultPeriod = getCustomPeriod(periodStartDay);
    const from = date?.from || defaultPeriod.from;
    const to = date?.to || defaultPeriod.to;
    const periodLength = differenceInDays(to, from);
    const prevStart = subDays(from, periodLength + 1);
    const prevEnd = subDays(to, periodLength + 1);
    return {
      startDate: format(from, 'yyyy-MM-dd'),
      endDate: format(to, 'yyyy-MM-dd'),
      previousStartDate: format(prevStart, 'yyyy-MM-dd'),
      previousEndDate: format(prevEnd, 'yyyy-MM-dd'),
    };
  }, [date, periodStartDay]);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user || !householdId || !date?.from) return;
      setLoading(true);
      try {
        const [ comparisonResult, spendingResult ] = await Promise.all([
          supabase.rpc('get_comparison_metrics', { p_household_id: householdId, p_current_start_date: startDate, p_current_end_date: endDate, p_previous_start_date: previousStartDate, p_previous_end_date: previousEndDate }),
          supabase.rpc('get_spending_by_parent_category', { p_household_id: householdId, p_start_date: startDate, p_end_date: endDate }),
        ]);

        if (comparisonResult.error) throw new Error(`Comparison Error: ${comparisonResult.error.message}`);
        if (spendingResult.error) throw new Error(`Spending Error: ${spendingResult.error.message}`);

        if (Array.isArray(comparisonResult.data) && comparisonResult.data.length > 0) { setComparisonData(comparisonResult.data[0]); }

        if (Array.isArray(spendingResult.data)) {
          const formattedSpending = spendingResult.data.map(item => ({
            id: item.category_id,
            name: item.category_name,
            value: item.total_spent,
          }));
          setSpendingData(formattedSpending);
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to load dashboard: ${errorMessage}`);
      } finally { setLoading(false); }
    };
    initializeDashboard();
  }, [user, householdId, startDate, endDate, previousStartDate, previousEndDate, dataVersion, date]);

  if (isAppDataLoading || loading || !date) return <DashboardSkeleton />;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const netCashFlow = comparisonData.current_income - comparisonData.current_spending;
  const previousNetCashFlow = comparisonData.previous_income - comparisonData.previous_spending;

  const renderDateRangeText = () => {
    if (date?.from && date?.to) {
      if (format(date.from, 'yyyy-MM-dd') === format(date.to, 'yyyy-MM-dd')) return `Summary for ${format(date.from, 'd MMMM yyyy')}`;
      return `Summary for ${format(date.from, 'd MMM')} to ${format(date.to, 'd MMM yyyy')}`;
    } return `Summary for current period`;
  };
  
  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div><h1 className="text-3xl font-bold text-gray-800">Dashboard</h1><Text>{renderDateRangeText()}</Text></div>
        <div><DateRangePicker date={date} setDate={setDate} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Income" icon={ArrowUp} iconColor="bg-green-500" currentValue={comparisonData.current_income} previousValue={comparisonData.previous_income} isPositiveGood={true} />
        <MetricCard title="Total Spending" icon={ArrowDown} iconColor="bg-red-500" currentValue={comparisonData.current_spending} previousValue={comparisonData.previous_spending} isPositiveGood={false} />
        <MetricCard title="Net Cash Flow" icon={Minus} iconColor={netCashFlow >= 0 ? "bg-blue-500" : "bg-orange-500"} currentValue={netCashFlow} previousValue={previousNetCashFlow} isPositiveGood={true} />
      </div>
      
      {/* --- PERBAIKAN UTAMA PADA LAYOUT DI SINI --- */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
            <CashFlowChart startDate={startDate} endDate={endDate} />
        </div>
        <div className="lg:col-span-2">
            <SpendingByCategory data={spendingData} />
        </div>
        <div className="lg:col-span-1">
            <RecentTransactions />
        </div>
      </div>
    </div>
  );
}