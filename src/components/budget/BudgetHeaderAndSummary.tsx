// src/components/budget/BudgetHeaderAndSummary.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface BudgetHeaderAndSummaryProps {
  periodText: string;
  handlePeriodChange: (direction: 'next' | 'prev') => void;
  totalIncome: number;
  budgetVsIncome: number;
  totalBudgeted: number;
}

export const BudgetHeaderAndSummary = ({
  periodText,
  handlePeriodChange,
  totalIncome,
  budgetVsIncome,
  totalBudgeted,
}: BudgetHeaderAndSummaryProps) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Atur Anggaran</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handlePeriodChange('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-muted-foreground w-48 text-center">{periodText}</span>
            <Button variant="outline" size="icon" onClick={() => handlePeriodChange('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/buckets">Kelola Buckets</Link>
        </Button>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-green-800">Pemasukan Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-green-700">{formatCurrency(totalIncome)}</p>
        </CardContent>
      </Card>

      <Card className={budgetVsIncome >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-base font-medium ${budgetVsIncome >= 0 ? "text-blue-800" : "text-red-800"}`}>
            Ringkasan Anggaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Pemasukan</span>
            <span>{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Rencana Budget</span>
            <span>- {formatCurrency(totalBudgeted)}</span>
          </div>
          <hr className="my-1" />
          <div className={`flex justify-between font-semibold ${budgetVsIncome >= 0 ? "text-blue-700" : "text-red-700"}`}>
            <span>{budgetVsIncome >= 0 ? "Sisa untuk ditabung" : "Melebihi pemasukan"}</span>
            <span>{formatCurrency(budgetVsIncome)}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};