// src/app/(app)/reports/ReportsView.tsx
"use client";

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import { getReportData } from '@/lib/reportService';
import { getCustomPeriod } from '@/lib/periodUtils';
import { DateRangePicker } from '@/components/DateRangePicker';
import { toast } from 'sonner';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CashFlowReportTab from './CashFlowReportTab';
import SpendingReportTab from './SpendingReportTab';
import { TransactionSummary } from '@/types';

// ... (interface tidak berubah)
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
interface RawSpendingItem {
  category_id: number;
  total_spent: number;
}
export interface ReportData {
  summary: SummaryMetrics;
  cashFlow: CashFlowItem[];
  topTransactions: TopTransactionItem[];
  spendingByCategory: SpendingByCategoryItem[];
  detailedSummary: TransactionSummary;
}


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
          const spendingData = data.spendingByCategory.map((item: RawSpendingItem) => ({
              category_id: item.category_id,
              name: categories.find(c => c.id === item.category_id)?.name || 'Others',
              value: item.total_spent
          }));
          
          const finalData: ReportData = {
            summary: data.summary,
            cashFlow: data.cashFlow,
            topTransactions: data.topTransactions,
            detailedSummary: data.detailedSummary,
            spendingByCategory: spendingData,
          };
          setReportData(finalData);
        })
        .catch(error => {
          console.error("Failed to fetch report data:", error);
          toast.error("Failed to load report data.", { description: error.message });
        })
        .finally(() => setIsLoading(false));
    }
  }, [householdId, date, categories]);


  if (isLoading || !date?.from || !date?.to) {
    return <ReportSkeleton />;
  }

  const startDate = format(date.from, 'yyyy-MM-dd');
  const endDate = format(date.to, 'yyyy-MM-dd');

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Reports & Analysis</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <Tabs defaultValue="cashflow" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="income" disabled>Income</TabsTrigger>
        </TabsList>
        <TabsContent value="cashflow" className="mt-6">
            <CashFlowReportTab data={reportData} />
        </TabsContent>
        <TabsContent value="spending" className="mt-6">
            <SpendingReportTab data={reportData} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="income">
            {/* Placeholder for future Income tab */}
        </TabsContent>
      </Tabs>
    </div>
  );
}