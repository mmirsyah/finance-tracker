'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getBudgetSummary } from '@/lib/budgetService';
import { BudgetSummaryItem } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { AlertTriangle, Info } from 'lucide-react';

const BudgetQuickViewSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 w-3/4 rounded-md bg-gray-200 animate-pulse" />
    <div className="h-6 w-1/2 rounded-md bg-gray-200 animate-pulse" />
    <div className="h-6 w-full rounded-md bg-gray-200 animate-pulse" />
    <div className="h-6 w-full rounded-md bg-gray-200 animate-pulse" />
  </div>
);

export function BudgetQuickView() {
  const [budgets, setBudgets] = useState<BudgetSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];
        const data = await getBudgetSummary(today);
        setBudgets(data);
      } catch (err) {
        setError('Gagal memuat ringkasan budget. Coba lagi nanti.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudget();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <BudgetQuickViewSkeleton />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-red-600 h-40">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p>{error}</p>
        </div>
      );
    }

    if (budgets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 h-40">
          <Info className="w-8 h-8 mb-2" />
          <p>Anda belum mengatur budget untuk bulan ini.</p>
          <p className="text-sm text-gray-400">
            Mulai atur di halaman Budget untuk melihat ringkasannya di sini.
          </p>
        </div>
      );
    }

    // Hanya menampilkan 5 budget teratas (yang paling kritis)
    return (
      <div className="space-y-6">
        {budgets.slice(0, 5).map((item) => {
          const progress = Math.min(item.progress_percentage, 100);
          const isOverspent = item.remaining_amount < 0;

          return (
            <div key={item.category_id}>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-medium text-gray-700">
                  {item.category_name}
                </span>
                <span
                  className={cn(
                    'font-semibold',
                    isOverspent ? 'text-red-600' : 'text-gray-600'
                  )}
                >
                  {isOverspent
                    ? `-${formatCurrency(Math.abs(item.remaining_amount))}`
                    : `${formatCurrency(item.remaining_amount)} tersisa`}
                </span>
              </div>
              <Progress
                value={progress}
                className={cn(
                  progress > 85 && !isOverspent && '[&>div]:bg-yellow-500',
                  isOverspent && '[&>div]:bg-red-600'
                )}
              />
              <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                <span>{formatCurrency(item.spent_amount)}</span>
                <span>{formatCurrency(item.assigned_amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Ringkasan Budget Bulan Ini</CardTitle>
        <CardDescription>
          Lihat sisa budget Anda di kategori terpenting.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}