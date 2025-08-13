// src/components/budget/BudgetTable.tsx

import React from 'react';
import { Budget } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

type BudgetsMap = Record<number, number>;
type SpendingMap = Record<number, number>;

interface BudgetTableProps {
  budgetPlans: Budget[];
  budgets: BudgetsMap;
  spending: SpendingMap;
  categorySpending: SpendingMap;
  handleSaveBudget: (planId: number) => Promise<void>;
  handleBudgetChange: (planId: number, amount: number) => void;
  savingStatus: Record<string, boolean>;
}

export const BudgetTable = ({
  budgetPlans,
  budgets,
  spending,
  handleSaveBudget,
  handleBudgetChange,
  savingStatus,
}: BudgetTableProps) => {

  const renderBudgetSection = (plan: Budget) => {
    const totalPlanBudget = budgets[plan.id] || 0;
    const totalPlanSpending = spending[plan.id] || 0;
    const totalPlanRemaining = totalPlanBudget - totalPlanSpending;

    return (
      <AccordionItem value={`plan-${plan.id}`} key={plan.id}>
        <AccordionTrigger className="hover:bg-gray-50 px-2">
          <div className="flex-1 flex items-center">
            <div className="flex-1 text-left font-semibold">{plan.name}</div>
            <div className="w-40 text-right font-medium px-2">{formatCurrency(totalPlanBudget)}</div>
            <div className="w-32 text-right text-muted-foreground px-2">{formatCurrency(totalPlanSpending)}</div>
            <div className="w-32 text-right font-semibold px-2">
              <span className={cn("px-2 py-1 rounded-full text-sm", { "bg-green-100 text-green-800": totalPlanRemaining >= 0, "bg-red-100 text-red-800": totalPlanRemaining < 0, })}>
                {formatCurrency(totalPlanRemaining)}
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="border rounded-lg p-2 m-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Anggaran untuk rencana &quot;{plan.name}&quot;</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={budgets[plan.id] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBudgetChange(plan.id, parseFloat(e.target.value) || 0)}
                  className="w-32 h-8 text-sm"
                />
                <Button size="sm" onClick={() => handleSaveBudget(plan.id)} disabled={savingStatus[`plan-${plan.id}`]}>
                  {savingStatus[`plan-${plan.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex items-center text-sm font-semibold text-muted-foreground border-b pb-2">
          <div className="flex-1 text-left">Rencana Anggaran & Kategori</div>
          <div className="w-40 text-right px-2">Budget</div>
          <div className="w-32 text-right px-2">Aktual</div>
          <div className="w-32 text-right px-2">Sisa</div>
        </div>

        {budgetPlans.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {budgetPlans.map(plan => renderBudgetSection(plan))}
          </Accordion>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Anda belum membuat Rencana Anggaran.</p>
            <Button asChild className="mt-4">
              <Link href="/budgets">Buat Rencana Pertama Anda</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
