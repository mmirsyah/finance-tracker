// src/app/(app)/categories/[id]/CategoryDetailView.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Category, Transaction } from '@/types';
// --- PERBAIKAN: Hapus 'Edit' dari import ---
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Card, DonutChart, Flex, Metric, Text, Title } from '@tremor/react';
import { format, startOfMonth } from 'date-fns';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import { getCustomPeriod } from '@/lib/periodUtils';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
// --- PERBAIKAN: Hapus import 'Button' ---

type AnalyticsData = {
  current_period_total: number;
  previous_period_total: number;
  period_average: number;
  percentage_of_total: number;
  sub_category_spending: { name: string; value: number }[];
};

interface CategoryDetailViewProps {
  initialCategory: Category & { parent?: { name: string } | null };
  initialTransactions: Transaction[];
  initialAnalytics: AnalyticsData;
}

const StatCard = ({ title, metric, diff, diffType }: { title: string, metric: string, diff: number, diffType: 'positive' | 'negative' | 'neutral' }) => {
  const Icon = diffType === 'positive' ? TrendingUp : diffType === 'negative' ? TrendingDown : Minus;
  const color = diffType === 'positive' ? 'emerald' : diffType === 'negative' ? 'red' : 'gray';
  return (
    <Card>
      <Text>{title}</Text>
      <Flex justifyContent="start" alignItems="baseline" className="space-x-3 truncate">
        <Metric>{metric}</Metric>
      </Flex>
      <Flex justifyContent="start" className="space-x-2 mt-2">
        <Icon className={`w-4 h-4 text-${color}-500`} />
        <Text className={`text-${color}-500`}>
          {diff.toFixed(1)}% vs previous period
        </Text>
      </Flex>
    </Card>
  );
};


export default function CategoryDetailView({ initialCategory, initialTransactions, initialAnalytics }: CategoryDetailViewProps) {
    const router = useRouter();
    const { householdId, profile } = useAppData();
    const [category] = useState<Category | null>(initialCategory);
    const [allTransactions] = useState<Transaction[]>(initialTransactions);
    const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics);
    const [date, setDate] = useState<DateRange | undefined>();

    useEffect(() => {
        if (profile && !date) {
          setDate(getCustomPeriod(profile.period_start_day || 1));
        }
    }, [profile, date]);

    useEffect(() => {
        if (!householdId || !category || !date?.from || !date?.to) return;
        
        const fetchNewAnalytics = async () => {
            const { data, error } = await supabase.rpc('get_category_analytics', {
                p_household_id: householdId,
                p_category_id: category.id,
                p_start_date: format(date.from!, 'yyyy-MM-dd'),
                p_end_date: format(date.to!, 'yyyy-MM-dd'),
            });
            if (error) {
                toast.error("Gagal memuat data analitik baru.");
            } else {
                setAnalytics(data);
            }
        };
        fetchNewAnalytics();
    }, [date, category, householdId]);
    
    const { chartData, displayedTransactions, hasChildren } = useMemo(() => {
        const dateFilteredTransactions = allTransactions.filter(t => {
            if (!date?.from || !date?.to) return true;
            const txDate = new Date(t.date);
            return txDate >= date.from && txDate <= date.to;
        });

        const aggregation: { [key: string]: number } = {};
        dateFilteredTransactions.forEach(t => {
            const monthKey = format(startOfMonth(new Date(t.date)), 'MMM yyyy');
            if (!aggregation[monthKey]) { aggregation[monthKey] = 0; }
            aggregation[monthKey] += t.amount;
        });

        const sortedChartData = Object.entries(aggregation)
            .map(([period, total]) => ({ period, Total: total }))
            .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
        
        const childCategories = analytics.sub_category_spending && analytics.sub_category_spending.length > 1;
        
        return { chartData: sortedChartData, displayedTransactions: dateFilteredTransactions, hasChildren: childCategories };
    }, [allTransactions, date, analytics]);

    if (!category) { return <div className="p-6">Category not found.</div>; }
    
    const diff = analytics.previous_period_total === 0 ? (analytics.current_period_total > 0 ? 100 : 0) : ((analytics.current_period_total - analytics.previous_period_total) / analytics.previous_period_total) * 100;
    const diffType = diff > 0.1 ? 'negative' : diff < -0.1 ? 'positive' : 'neutral';

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline mb-2"><ArrowLeft size={16} />Back to Categories</button>
                    <h1 className="text-3xl font-bold">{category.name}</h1>
                    {initialCategory.parent && (
                        <Text>Sub-category of <span className="font-semibold">{initialCategory.parent.name}</span></Text>
                    )}
                </div>
                <DateRangePicker date={date} setDate={setDate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard title="Total Spending" metric={formatCurrency(analytics.current_period_total)} diff={diff} diffType={diffType} />
                <Card><Text>Monthly Average (6 Mo.)</Text><Metric>{formatCurrency(analytics.period_average)}</Metric></Card>
                <Card><Text>% of Total Spending</Text><Metric>{analytics.percentage_of_total.toFixed(1)}%</Metric></Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <Card className="lg:col-span-3">
                    <Title>Spending Trend</Title>
                    <AreaChart className="h-72 mt-4" data={chartData} index="period" categories={['Total']} colors={['blue']} yAxisWidth={60} valueFormatter={formatCurrency} noDataText="No data for this period." />
                </Card>
                <Card className="lg:col-span-2">
                    <Title>Sub-category Breakdown</Title>
                    {hasChildren ? (
                        <DonutChart className="h-72 mt-4" data={analytics.sub_category_spending} category="value" index="name" valueFormatter={formatCurrency} colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia']} />
                    ) : (
                        <div className="flex h-72 items-center justify-center text-center"><Text className="text-muted-foreground">No sub-categories with spending in this period.</Text></div>
                    )}
                </Card>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-semibold">Transactions</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">{displayedTransactions.map((t) => (<tr key={t.id}><td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="px-6 py-4 text-sm text-gray-800 font-medium">{t.accounts?.name || 'N/A'}</td><td className="px-6 py-4 text-sm text-gray-500">{t.note || '-'}</td><td className={`px-6 py-4 text-sm font-semibold text-right text-red-600`}>{formatCurrency(t.amount)}</td></tr>))}</tbody>
                </table>
                {displayedTransactions.length === 0 && (<p className="p-6 text-center text-gray-500">No transactions found for this period.</p>)}
            </div>
        </div>
    );
}