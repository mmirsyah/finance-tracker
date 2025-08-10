// src/app/(app)/budgets/BudgetView.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { getTotalIncome, getBudgetsByPeriod, upsertSingleBudget, deleteBudget } from '@/lib/budgetService';
import { getExpensesByPeriod } from '@/lib/transactionService';
import { updateCategoryBudgetTypes } from '@/lib/categoryService';
import { getCustomPeriod } from '@/lib/periodUtils';
import { Budget, BudgetType, Category } from '@/types';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ManageCategoriesModal } from '@/components/budget/ManageCategoriesModal';
import { formatCurrency } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type SpendingByCategory = Record<number, number>;
type BudgetsByCategory = Record<number, number>;

// Komponen-komponen ini tidak berubah
const CategoryBudgetRow = ({ category, budgetAmount, spendingAmount, onBudgetChange, onSave, isSaving }: { category: Category; budgetAmount: number; spendingAmount: number; onBudgetChange: (categoryId: number, amount: number) => void; onSave: (categoryId: number) => Promise<void>; isSaving: boolean; }) => { const remaining = budgetAmount - spendingAmount; const progress = budgetAmount > 0 ? (spendingAmount / budgetAmount) * 100 : 0; return ( <div className="p-3 my-2 border rounded-lg"> <div className="flex justify-between items-center mb-2"> <span className="text-sm font-medium">{category.name}</span> <div className="flex items-center gap-2"> <Input type="number" placeholder="0" value={budgetAmount || ''} onChange={(e) => onBudgetChange(category.id, parseFloat(e.target.value) || 0)} className="w-32 h-8 text-sm" /> <Button size="sm" onClick={() => onSave(category.id)} disabled={isSaving}> {isSaving ? '...' : 'Simpan'} </Button> </div> </div> <div className="space-y-2 text-xs"> <div className='flex justify-between'> <span className='text-muted-foreground'>Terpakai</span> <span className='font-medium'>{formatCurrency(spendingAmount)}</span> </div> <div className='flex justify-between'> <span className='text-muted-foreground'>Sisa</span> <span className={`font-medium ${remaining < 0 ? 'text-red-500' : ''}`}>{formatCurrency(remaining)}</span> </div> <Progress value={progress} className="w-full h-2" /> </div> </div> ); };
const BudgetCard = ({ title, categories, bucketBudget, categoryBudgets, spendingTotal, spendingByCategory, onBucketBudgetChange, onCategoryBudgetChange, onSaveBucket, onSaveCategory, savingStatus }: { title: string; categories: Category[]; bucketBudget: number; categoryBudgets: BudgetsByCategory; spendingTotal: number; spendingByCategory: SpendingByCategory; onBucketBudgetChange: (amount: number) => void; onCategoryBudgetChange: (categoryId: number, amount: number) => void; onSaveBucket: () => Promise<void>; onSaveCategory: (categoryId: number) => Promise<void>; savingStatus: Record<string, boolean>; }) => { const isCategoryMode = Object.values(categoryBudgets).some(amount => amount > 0); const displayBudget = isCategoryMode ? Object.values(categoryBudgets).reduce((sum, amount) => sum + amount, 0) : bucketBudget; const remaining = displayBudget - spendingTotal; const progress = displayBudget > 0 ? (spendingTotal / displayBudget) * 100 : 0; return ( <Card className="flex flex-col"> <CardHeader> <CardTitle>{title}</CardTitle> </CardHeader> <CardContent className="space-y-4 flex-grow"> <div className="space-y-1"> <label className="text-sm font-medium text-muted-foreground">Anggaran {isCategoryMode ? "Total" : ""}</label> <Input type="number" placeholder="0" value={displayBudget || ''} onChange={(e) => onBucketBudgetChange(parseFloat(e.target.value) || 0)} className="text-lg font-semibold" disabled={isCategoryMode} /> </div> <div className="space-y-2 text-sm"> <div className='flex justify-between'> <span>Terpakai</span> <span className='font-medium'>{formatCurrency(spendingTotal)}</span> </div> <div className='flex justify-between'> <span>Sisa</span> <span className={`font-medium ${remaining < 0 ? 'text-red-500' : ''}`}>{formatCurrency(remaining)}</span> </div> <Progress value={progress} className="w-full" /> </div> <Accordion type="single" collapsible> <AccordionItem value="item-1"> <AccordionTrigger>Rincian per Kategori</AccordionTrigger> <AccordionContent> {categories.map(cat => ( <CategoryBudgetRow key={cat.id} category={cat} budgetAmount={categoryBudgets[cat.id] || 0} spendingAmount={spendingByCategory[cat.id] || 0} onBudgetChange={onCategoryBudgetChange} onSave={onSaveCategory} isSaving={savingStatus[`cat-${cat.id}`] || false} /> ))} </AccordionContent> </AccordionItem> </Accordion> </CardContent> <CardFooter> <Button onClick={onSaveBucket} disabled={savingStatus.bucket || isCategoryMode} className="w-full"> {savingStatus.bucket ? 'Menyimpan...' : 'Simpan Anggaran Bucket'} </Button> </CardFooter> </Card> ); };


const BudgetView = () => {
  const { householdId, categories, refetchData, profile } = useAppData();
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const [bucketBudgets, setBucketBudgets] = useState<Record<BudgetType, number>>({ Fixed: 0, Flex: 0, 'Non-Monthly': 0 });
  const [categoryBudgets, setCategoryBudgets] = useState<BudgetsByCategory>({});
  const [bucketSpending, setBucketSpending] = useState<Record<BudgetType, number>>({ Fixed: 0, Flex: 0, 'Non-Monthly': 0 });
  const [categorySpending, setCategorySpending] = useState<SpendingByCategory>({});
  const [totalIncome, setTotalIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      const startDay = profile.period_start_day || 1;
      setDate(getCustomPeriod(startDay));
    }
  }, [profile]);

  /**
   * ====================================================================
   * PERBAIKAN DI SINI: Menambahkan penjaga untuk date.to
   * ====================================================================
   */
  const { startDate, endDate, periodForSave } = useMemo(() => {
    const startDay = profile?.period_start_day || 1;
    const currentPeriod = date || getCustomPeriod(startDay);

    // Pastikan 'from' dan 'to' selalu ada
    if (!currentPeriod.from || !currentPeriod.to) {
        const defaultPeriod = getCustomPeriod(startDay);
        return {
            startDate: format(defaultPeriod.from, 'yyyy-MM-dd'),
            endDate: format(defaultPeriod.to, 'yyyy-MM-dd'),
            periodForSave: format(defaultPeriod.from, 'yyyy-MM-01'),
        }
    }

    return {
        startDate: format(currentPeriod.from, 'yyyy-MM-dd'),
        endDate: format(currentPeriod.to, 'yyyy-MM-dd'),
        periodForSave: format(currentPeriod.from, 'yyyy-MM-01'),
    }
  }, [date, profile]);


  const categoriesKey = useMemo(() => {
    return categories.map(c => c.id).join(',');
  }, [categories]);

  useEffect(() => {
    if (!householdId || !startDate) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [budgetsData, expenseTransactions, incomeData] = await Promise.all([
            getBudgetsByPeriod(householdId, periodForSave),
            getExpensesByPeriod(supabase, householdId, startDate, endDate),
            getTotalIncome(householdId, startDate, endDate),
        ]);
        
        const newBucketBudgets: Record<BudgetType, number> = { Fixed: 0, Flex: 0, 'Non-Monthly': 0 };
        const newCategoryBudgets: BudgetsByCategory = {};
        budgetsData.forEach((budget: Budget) => { if (budget.category_id) { newCategoryBudgets[budget.category_id] = budget.amount; } else { newBucketBudgets[budget.budget_type] = budget.amount; } });
        setBucketBudgets(newBucketBudgets);
        setCategoryBudgets(newCategoryBudgets);
        const newBucketSpending: Record<BudgetType, number> = { Fixed: 0, Flex: 0, 'Non-Monthly': 0 };
        const newCategorySpending: SpendingByCategory = {};
        for (const trx of expenseTransactions) { if (trx.category) { newCategorySpending[trx.category] = (newCategorySpending[trx.category] || 0) + trx.amount; const categoryDetails = categories.find(c => c.id === trx.category); if (categoryDetails) { newBucketSpending[categoryDetails.budget_type] = (newBucketSpending[categoryDetails.budget_type] || 0) + trx.amount; } } }
        setBucketSpending(newBucketSpending);
        setCategorySpending(newCategorySpending);
        setTotalIncome(incomeData);

      } catch (error) {
        console.error("Error fetching budget data:", error);
        toast.error('Gagal memuat data budget.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [householdId, startDate, endDate, periodForSave, refetchData, categoriesKey, categories]);

  
  const totalBudgeted = useMemo(() => {
    const totalFromCategories = Object.values(categoryBudgets).reduce((sum, amount) => sum + amount, 0);
    if (totalFromCategories > 0) return totalFromCategories;
    return Object.values(bucketBudgets).reduce((sum, amount) => sum + amount, 0);
  }, [bucketBudgets, categoryBudgets]);

  const budgetVsIncome = totalIncome - totalBudgeted;

  const handleSaveBudget = async ( budgetType: BudgetType, amount: number, categoryId?: number ) => {
    if (!householdId) return;
    const savingKey = categoryId ? `cat-${categoryId}` : `bucket-${budgetType}`;
    setSavingStatus(prev => ({ ...prev, [savingKey]: true }));
    const sanitizedAmount = isNaN(amount) ? 0 : amount;
    try {
      if (sanitizedAmount > 0) {
        const budgetToSave: Partial<Budget> = {
          household_id: householdId,
          period: periodForSave,
          budget_type: budgetType,
          amount: sanitizedAmount,
          category_id: categoryId || null,
        };
        await upsertSingleBudget(budgetToSave);
      } else {
        await deleteBudget(householdId, periodForSave, budgetType, categoryId);
      }
      toast.success(`Anggaran berhasil disimpan!`);
    } catch (error) {
      console.error("Save budget error:", error);
      toast.error(`Gagal menyimpan anggaran.`);
    } finally {
      setSavingStatus(prev => ({ ...prev, [savingKey]: false }));
    }
  };

  const handleCategoryUpdates = async (updates: { id: number; budget_type: BudgetType }[]) => { try { await updateCategoryBudgetTypes(updates); toast.success('Tipe kategori berhasil diperbarui!'); refetchData(); } catch (error) { console.error('Gagal memperbarui tipe kategori:', error);toast.error('Gagal memperbarui tipe kategori.'); } };
  const handleCategoryBudgetChange = (categoryId: number, amount: number) => { setCategoryBudgets(prev => ({...prev, [categoryId]: amount })); };
  const groupedCategories = useMemo(() => { const fixed: Category[] = []; const flex: Category[] = []; const nonMonthly: Category[] = []; categories .filter(cat => cat.type === 'expense') .forEach((cat) => { if (cat.budget_type === 'Fixed') fixed.push(cat); else if (cat.budget_type === 'Non-Monthly') nonMonthly.push(cat); else flex.push(cat); }); return { fixedCategories: fixed, flexCategories: flex, nonMonthlyCategories: nonMonthly }; }, [categories]);

  if (isLoading || !date) {
    return <div>Memuat data anggaran...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Atur Anggaran</h1>
          <Button variant="outline" onClick={() => setIsManageModalOpen(true)}>
            Kelola Kategori
          </Button>
        </div>
        
        <Card className="bg-green-50 border-green-200"><CardHeader className="pb-2"><CardTitle className="text-base font-medium text-green-800">Pemasukan Bulan Ini</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-green-700">{formatCurrency(totalIncome)}</p></CardContent></Card>
        <Card className={ budgetVsIncome >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200" }><CardHeader className="pb-2"><CardTitle className={`text-base font-medium ${ budgetVsIncome >= 0 ? "text-blue-800" : "text-red-800" }`}> Ringkasan Anggaran </CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Pemasukan</span><span>{formatCurrency(totalIncome)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Rencana Budget</span><span>- {formatCurrency(totalBudgeted)}</span></div><hr className="my-1"/><div className={`flex justify-between font-semibold ${ budgetVsIncome >= 0 ? "text-blue-700" : "text-red-700" }`}><span> {budgetVsIncome >= 0 ? "Sisa untuk ditabung" : "Melebihi pemasukan"} </span><span>{formatCurrency(budgetVsIncome)}</span></div></CardContent></Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BudgetCard title="Tagihan Tetap (Fixed)" categories={groupedCategories.fixedCategories} bucketBudget={bucketBudgets.Fixed} categoryBudgets={Object.fromEntries(Object.entries(categoryBudgets).filter(([catId]) => groupedCategories.fixedCategories.some(c => c.id === Number(catId))))} spendingTotal={bucketSpending.Fixed} spendingByCategory={categorySpending} onBucketBudgetChange={amount => setBucketBudgets(prev => ({...prev, Fixed: amount}))} onCategoryBudgetChange={handleCategoryBudgetChange} onSaveBucket={() => handleSaveBudget('Fixed', bucketBudgets.Fixed)} onSaveCategory={(catId) => handleSaveBudget('Fixed', categoryBudgets[catId], catId)} savingStatus={savingStatus} />
          <BudgetCard title="Pengeluaran Fleksibel (Flex)" categories={groupedCategories.flexCategories} bucketBudget={bucketBudgets.Flex} categoryBudgets={Object.fromEntries(Object.entries(categoryBudgets).filter(([catId]) => groupedCategories.flexCategories.some(c => c.id === Number(catId))))} spendingTotal={bucketSpending.Flex} spendingByCategory={categorySpending} onBucketBudgetChange={amount => setBucketBudgets(prev => ({...prev, Flex: amount}))} onCategoryBudgetChange={handleCategoryBudgetChange} onSaveBucket={() => handleSaveBudget('Flex', bucketBudgets.Flex)} onSaveCategory={(catId) => handleSaveBudget('Flex', categoryBudgets[catId], catId)} savingStatus={savingStatus} />
          <BudgetCard title="Kebutuhan Non-Bulanan" categories={groupedCategories.nonMonthlyCategories} bucketBudget={bucketBudgets['Non-Monthly']} categoryBudgets={Object.fromEntries(Object.entries(categoryBudgets).filter(([catId]) => groupedCategories.nonMonthlyCategories.some(c => c.id === Number(catId))))} spendingTotal={bucketSpending['Non-Monthly']} spendingByCategory={categorySpending} onBucketBudgetChange={amount => setBucketBudgets(prev => ({...prev, 'Non-Monthly': amount}))} onCategoryBudgetChange={handleCategoryBudgetChange} onSaveBucket={() => handleSaveBudget('Non-Monthly', bucketBudgets['Non-Monthly'])} onSaveCategory={(catId) => handleSaveBudget('Non-Monthly', categoryBudgets[catId], catId)} savingStatus={savingStatus} />
        </div>
      </div>

      <ManageCategoriesModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} categories={categories} onSave={handleCategoryUpdates} />
    </>
  );
};

export default BudgetView;