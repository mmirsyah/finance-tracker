// src/app/(app)/budgets/BudgetView.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { getTotalIncome, getBudgetsByPeriod, upsertSingleBudget, deleteBudget } from '@/lib/budgetService';
import { getExpensesByPeriod } from '@/lib/transactionService';
import { updateCategoryBudgetTypes } from '@/lib/categoryService';
import { getCustomPeriod } from '@/lib/periodUtils';
import { Budget, BudgetType, Category } from '@/types';
import { format, addMonths, subMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { DateRange } from 'react-day-picker';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ManageCategoriesModal } from '@/components/budget/ManageCategoriesModal';
import { formatCurrency } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type SpendingByCategory = Record<number, number>;
type BudgetsByCategory = Record<number, number>;

// Komponen-komponen ini tidak berubah
const BudgetCategoryRow = ({ category, budgetAmount, spendingAmount, onBudgetChange, onSave, isSaving }: { category: Category; budgetAmount: number; spendingAmount: number; onBudgetChange: (categoryId: number, amount: number) => void; onSave: (categoryId: number) => Promise<void>; isSaving: boolean; }) => { const remaining = budgetAmount - spendingAmount; const progress = budgetAmount > 0 ? (spendingAmount / budgetAmount) * 100 : 0; return ( <div className="flex flex-col"> <div className="flex items-center py-2 px-2 hover:bg-gray-50"> <div className="flex-1 text-sm font-medium">{category.name}</div> <div className="w-40 px-2"> <div className="flex items-center gap-2"> <Input type="number" placeholder="0" value={budgetAmount || ''} onChange={(e) => onBudgetChange(category.id, parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" /> <Button size="sm" variant="outline" onClick={() => onSave(category.id)} disabled={isSaving} className="w-16"> {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'} </Button> </div> </div> <div className="w-32 text-right text-sm px-2">{formatCurrency(spendingAmount)}</div> <div className="w-32 text-right px-2"> <span className={cn( "px-2 py-0.5 rounded-full text-xs font-semibold", { "bg-green-100 text-green-800": remaining >= 0, "bg-red-100 text-red-800": remaining < 0, } )}> {formatCurrency(remaining)} </span> </div> </div> <Progress value={progress} className="w-full h-1 mt-1" /> </div> ); };

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

  useEffect(() => { if (profile) { const startDay = profile.period_start_day || 1; setDate(getCustomPeriod(startDay)); } }, [profile]);
  
  const { startDate, endDate, periodForSave } = useMemo(() => {
    const startDay = profile?.period_start_day || 1;
    const currentPeriod = date || getCustomPeriod(startDay);
    if (!currentPeriod.from || !currentPeriod.to) { const defaultPeriod = getCustomPeriod(startDay); return { startDate: format(defaultPeriod.from, 'yyyy-MM-dd'), endDate: format(defaultPeriod.to, 'yyyy-MM-dd'), periodForSave: format(defaultPeriod.from, 'yyyy-MM-01'), } }
    return { startDate: format(currentPeriod.from, 'yyyy-MM-dd'), endDate: format(currentPeriod.to, 'yyyy-MM-dd'), periodForSave: format(currentPeriod.from, 'yyyy-MM-01'), }
  }, [date, profile]);

  const categoriesKey = useMemo(() => { return categories.map(c => c.id).join(','); }, [categories]);

  useEffect(() => {
    if (!householdId || !startDate) return;
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [budgetsData, expenseTransactions, incomeData] = await Promise.all([ getBudgetsByPeriod(householdId, periodForSave), getExpensesByPeriod(supabase, householdId, startDate, endDate), getTotalIncome(householdId, startDate, endDate), ]);
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
      } catch (error) { console.error("Error fetching budget data:", error); toast.error('Gagal memuat data budget.'); } finally { setIsLoading(false); }
    };
    fetchAllData();
  }, [householdId, startDate, endDate, periodForSave, refetchData, categoriesKey, categories]);

  const totalBudgeted = useMemo(() => { const totalFromCategories = Object.values(categoryBudgets).reduce((sum, amount) => sum + amount, 0); if (totalFromCategories > 0) return totalFromCategories; return Object.values(bucketBudgets).reduce((sum, amount) => sum + amount, 0); }, [bucketBudgets, categoryBudgets]);
  const budgetVsIncome = totalIncome - totalBudgeted;
  
  const handlePeriodChange = (direction: 'next' | 'prev') => {
    if (!date?.from) return;
    const referenceDate = direction === 'next' ? addMonths(date.from, 1) : subMonths(date.from, 1);
    const startDay = profile?.period_start_day || 1;
    setDate(getCustomPeriod(startDay, referenceDate));
  };
  
  const periodText = useMemo(() => {
    if (!date?.from || !date?.to) return "Loading...";
    return `${format(date.from, 'd MMM yyyy')} - ${format(date.to, 'd MMM yyyy')}`;
  }, [date]);

  const handleSaveBudget = async ( budgetType: BudgetType, amount: number, categoryId?: number ) => { if (!householdId) return; const savingKey = categoryId ? `cat-${categoryId}` : `bucket-${budgetType}`; setSavingStatus(prev => ({ ...prev, [savingKey]: true })); const sanitizedAmount = isNaN(amount) ? 0 : amount; try { if (sanitizedAmount > 0) { const budgetToSave: Partial<Budget> = { household_id: householdId, period: periodForSave, budget_type: budgetType, amount: sanitizedAmount, category_id: categoryId || null, }; await upsertSingleBudget(budgetToSave); } else { await deleteBudget(householdId, periodForSave, budgetType, categoryId); } toast.success(`Anggaran berhasil disimpan!`); } catch (error) { console.error("Save budget error:", error); toast.error(`Gagal menyimpan anggaran.`); } finally { setSavingStatus(prev => ({ ...prev, [savingKey]: false })); } };
  
  const handleCategoryUpdates = async (updates: { id: number; budget_type: BudgetType }[]) => {
    try {
      await updateCategoryBudgetTypes(updates);
      toast.success('Tipe kategori berhasil diperbarui!');
      refetchData();
    // PERBAIKAN DI SINI: Menggunakan komentar eslint-disable-next-line
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error('Gagal memperbarui tipe kategori.');
    }
  };

  const handleCategoryBudgetChange = (categoryId: number, amount: number) => { setCategoryBudgets(prev => ({...prev, [categoryId]: amount })); };
  const groupedCategories = useMemo(() => { const fixed: Category[] = []; const flex: Category[] = []; const nonMonthly: Category[] = []; categories .filter(cat => cat.type === 'expense') .forEach((cat) => { if (cat.budget_type === 'Fixed') fixed.push(cat); else if (cat.budget_type === 'Non-Monthly') nonMonthly.push(cat); else flex.push(cat); }); return { fixedCategories: fixed, flexCategories: flex, nonMonthlyCategories: nonMonthly }; }, [categories]);

  if (isLoading || !date) { return <div>Memuat data anggaran...</div>; }

  // Fungsi untuk merender satu seksi accordion
  const renderBudgetSection = (
    title: string,
    budgetType: BudgetType,
    sectionCategories: Category[]
  ) => {
    const sectionCategoryBudgets = Object.fromEntries(Object.entries(categoryBudgets).filter(([catId]) => sectionCategories.some(c => c.id === Number(catId))));
    const isCategoryMode = Object.values(sectionCategoryBudgets).some(amount => amount > 0);
    const totalSectionBudget = isCategoryMode 
        ? Object.values(sectionCategoryBudgets).reduce((sum, amount) => sum + amount, 0)
        : (bucketBudgets[budgetType] || 0);
    const totalSectionSpending = bucketSpending[budgetType] || 0;
    const totalSectionRemaining = totalSectionBudget - totalSectionSpending;

    return (
        <AccordionItem value={budgetType}>
            <AccordionTrigger className="hover:bg-gray-50 px-2">
                <div className="flex-1 flex items-center">
                    <div className="flex-1 text-left font-semibold">{title}</div>
                    <div className="w-40 text-right font-medium px-2">{formatCurrency(totalSectionBudget)}</div>
                    <div className="w-32 text-right text-muted-foreground px-2">{formatCurrency(totalSectionSpending)}</div>
                    <div className="w-32 text-right font-semibold px-2">
                        <span className={cn( "px-2 py-1 rounded-full text-sm", { "bg-green-100 text-green-800": totalSectionRemaining >= 0, "bg-red-100 text-red-800": totalSectionRemaining < 0, } )}>
                            {formatCurrency(totalSectionRemaining)}
                        </span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                {sectionCategories.map(cat => (
                    <BudgetCategoryRow
                        key={cat.id}
                        category={cat}
                        budgetAmount={categoryBudgets[cat.id] || 0}
                        spendingAmount={categorySpending[cat.id] || 0}
                        onBudgetChange={handleCategoryBudgetChange}
                        onSave={(catId) => handleSaveBudget(budgetType, categoryBudgets[catId], catId)}
                        isSaving={savingStatus[`cat-${cat.id}`] || false}
                    />
                ))}
            </AccordionContent>
        </AccordionItem>
    );
  }

  return (
    <>
      <div className="space-y-6">
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
          <Button variant="outline" onClick={() => setIsManageModalOpen(true)}>
            Kelola Kategori
          </Button>
        </div>
        
        <Card className="bg-green-50 border-green-200"><CardHeader className="pb-2"><CardTitle className="text-base font-medium text-green-800">Pemasukan Bulan Ini</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-green-700">{formatCurrency(totalIncome)}</p></CardContent></Card>
        <Card className={ budgetVsIncome >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200" }><CardHeader className="pb-2"><CardTitle className={`text-base font-medium ${ budgetVsIncome >= 0 ? "text-blue-800" : "text-red-800" }`}> Ringkasan Anggaran </CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Pemasukan</span><span>{formatCurrency(totalIncome)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Rencana Budget</span><span>- {formatCurrency(totalBudgeted)}</span></div><hr className="my-1"/><div className={`flex justify-between font-semibold ${ budgetVsIncome >= 0 ? "text-blue-700" : "text-red-700" }`}><span> {budgetVsIncome >= 0 ? "Sisa untuk ditabung" : "Melebihi pemasukan"} </span><span>{formatCurrency(budgetVsIncome)}</span></div></CardContent></Card>

        <Card>
            <CardContent className="p-2">
                <div className="flex items-center text-sm font-semibold text-muted-foreground border-b pb-2">
                    <div className="flex-1 text-left">Kategori</div>
                    <div className="w-40 text-right px-2">Budget</div>
                    <div className="w-32 text-right px-2">Aktual</div>
                    <div className="w-32 text-right px-2">Sisa</div>
                </div>
                <Accordion type="multiple" className="w-full">
                    {renderBudgetSection("Tagihan Tetap (Fixed)", 'Fixed', groupedCategories.fixedCategories)}
                    {renderBudgetSection("Pengeluaran Fleksibel (Flex)", 'Flex', groupedCategories.flexCategories)}
                    {renderBudgetSection("Kebutuhan Non-Bulanan", 'Non-Monthly', groupedCategories.nonMonthlyCategories)}
                </Accordion>
            </CardContent>
        </Card>
      </div>
      <ManageCategoriesModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} categories={categories} onSave={handleCategoryUpdates} />
    </>
  );
};

export default BudgetView;