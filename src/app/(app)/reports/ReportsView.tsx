// src/app/(app)/reports/ReportsView.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import { getReportData } from '@/lib/reportService';
import { getCustomPeriod } from '@/lib/periodUtils';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Card, Metric, Text, Title, BarChart } from '@tremor/react';
import { toast } from 'sonner';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// --- DEFINISI TIPE DATA ---
interface SummaryMetrics {
  total_expense: number;
  total_income: number;
  top_category: string;
  top_category_amount: number;
}
interface CashFlowItem {
  period: string;
  Pemasukan: number;
  Pengeluaran: number;
  date?: string;
}
interface TopTransactionItem {
  id: string;
  date: string;
  note: string | null;
  amount: number;
  category_name: string;
  account_name: string;
}
interface SpendingByCategoryItem {
  name: string;
  value: number;
  category_id: number;
}
// --- PERBAIKAN: Tambahkan tipe untuk data mentah dari RPC ---
interface RawSpendingItem {
  category_id: number;
  total_spent: number;
}
interface ReportData {
  summary: SummaryMetrics;
  cashFlow: CashFlowItem[];
  topTransactions: TopTransactionItem[];
  spendingByCategory: SpendingByCategoryItem[];
}

// Komponen Kartu Ringkasan
const SummaryCard = ({ title, value, color }: { title: string, value: string | number, color?: string }) => (
    <Card>
      <Text>{title}</Text>
      <Metric className={cn(color)}>{value}</Metric>
    </Card>
);

export default function ReportsView() {
  const { householdId, profile, categories } = useAppData();
  const [date, setDate] = useState<DateRange | undefined>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && !date) {
      setDate(getCustomPeriod(profile.period_start_day || 1));
    }
  }, [profile, date]);

  useEffect(() => {
    if (householdId && date?.from && date?.to) {
      setIsLoading(true);
      const startDate = format(date.from, 'yyyy-MM-dd');
      const endDate = format(date.to, 'yyyy-MM-dd');

      getReportData(householdId, startDate, endDate)
        .then(data => {
          // --- PERBAIKAN: Ganti 'any' dengan tipe 'RawSpendingItem' yang sudah dibuat ---
          const spendingData = data.spendingByCategory.map((item: RawSpendingItem) => ({
              category_id: item.category_id,
              name: categories.find(c => c.id === item.category_id)?.name || 'Lainnya',
              value: item.total_spent
          }));
          setReportData({ ...data, spendingByCategory: spendingData });
        })
        .catch(error => {
          console.error("Failed to fetch report data:", error);
          toast.error("Gagal memuat data laporan.", { description: error.message });
        })
        .finally(() => setIsLoading(false));
    }
  }, [householdId, date, categories]);

  const netCashFlow = useMemo(() => {
    if (!reportData?.summary) return 0;
    return reportData.summary.total_income - reportData.summary.total_expense;
  }, [reportData]);

  const savingsRate = useMemo(() => {
    if (!reportData?.summary || !reportData.summary.total_income) return 0;
    return (netCashFlow / reportData.summary.total_income) * 100;
  }, [reportData, netCashFlow]);

  const cashFlowForChart = useMemo(() => {
      if (!reportData?.cashFlow) return [];
      return reportData.cashFlow.map(item => ({
          ...item,
          date: format(parseISO(item.period), 'd MMM'),
      }));
  }, [reportData?.cashFlow]);


  if (isLoading || !date) {
    return <ReportSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Laporan & Analisa</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <div className="space-y-6">
        {/* Cash Flow Chart */}
        <Card>
            <Title>Arus Kas</Title>
            <BarChart
                className="mt-6 h-80"
                data={cashFlowForChart}
                index="date"
                categories={["Pemasukan", "Pengeluaran"]}
                colors={["green", "red"]}
                valueFormatter={formatCurrency}
                yAxisWidth={60}
            />
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title="Total Pemasukan" value={formatCurrency(reportData?.summary.total_income || 0)} color="text-green-600" />
            <SummaryCard title="Total Pengeluaran" value={formatCurrency(reportData?.summary.total_expense || 0)} color="text-red-600" />
            <SummaryCard title="Arus Kas Bersih" value={formatCurrency(netCashFlow)} color={netCashFlow >= 0 ? "text-blue-600" : "text-orange-600"} />
            <SummaryCard title="Rasio Tabungan" value={`${savingsRate.toFixed(1)}%`} color={savingsRate >= 0 ? "text-emerald-600" : "text-amber-600"} />
        </div>

        {/* Insight Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
                <Title>Wawasan Pengeluaran</Title>
                <div className="mt-4 space-y-4">
                  {(reportData?.spendingByCategory || []).map((item, index) => (
                    <div key={item.category_id || index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="font-medium text-gray-700">{formatCurrency(item.value)}</span>
                      </div>
                      <Progress value={(item.value / (reportData?.summary.total_expense || 1)) * 100} />
                    </div>
                  ))}
                </div>
            </Card>
            <Card className="lg:col-span-2">
                <Title>Transaksi Teratas (Pengeluaran)</Title>
                <ul className="mt-4 divide-y divide-gray-200">
                  {(reportData?.topTransactions || []).map((t) => (
                    <li key={t.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-800 truncate">{t.note || t.category_name}</p>
                        <p className="text-xs text-gray-500">{format(parseISO(t.date), 'd MMM yyyy')} • {t.account_name}</p>
                      </div>
                      <p className="text-sm font-semibold text-red-600 shrink-0 ml-4">
                        {formatCurrency(t.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
            </Card>
        </div>
      </div>
    </div>
  );
}