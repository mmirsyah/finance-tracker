// src/components/budget/BudgetHeader.tsx
"use client";

import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BudgetHeaderProps {
  totalBudgeted: number;
  totalActivity: number;
  totalIncome: number;
  remainingBudget: number;
  isLoading: boolean;
}

const MetricCard = ({ title, value, color, isLoading }: { title: string, value: number, color: string, isLoading: boolean }) => {
    return (
        <div className="flex flex-col p-3 bg-white rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse mt-1"></div>
            ) : (
                <p className={cn("text-2xl font-bold", color)}>
                    {formatCurrency(value)}
                </p>
            )}
        </div>
    );
};

export const BudgetHeader = ({ totalBudgeted, totalActivity, totalIncome, remainingBudget, isLoading }: BudgetHeaderProps) => {
  const remainingColor = remainingBudget >= 0 ? 'text-blue-600' : 'text-red-600';

  return (
    // === PERUBAHAN DIMULAI DI SINI ===
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Pemasukan" value={totalIncome} color="text-green-600" isLoading={isLoading} />
        <MetricCard title="Total Anggaran" value={totalBudgeted} color="text-gray-900" isLoading={isLoading} />
        <MetricCard title="Total Pengeluaran" value={totalActivity} color="text-orange-500" isLoading={isLoading} />
        <MetricCard title="Sisa Anggaran" value={remainingBudget} color={remainingColor} isLoading={isLoading} />
    </div>
    // === PERUBAHAN BERAKHIR DI SINI ===
  );
};