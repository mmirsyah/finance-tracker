// src/app/(app)/budgets/BudgetView.tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { BudgetPlanModal } from '@/components/budget/BudgetPlanModal';
import { toast } from 'sonner';
import { saveBudgetPlanWithCategories, deleteBudgetPlan } from '@/lib/budgetPlanService';
import { Budget, BudgetAllocation, BudgetSummary, OverallBudgetSummary } from '@/types';
import { BudgetPlanCard } from '@/components/budget/BudgetPlanCard';
import { getBudgetSummary, saveAllocation, getAllocationsByPeriod, getOverallBudgetSummary } from '@/lib/budgetService';
import { format, addMonths, subMonths } from 'date-fns';
import { getCustomPeriod } from '@/lib/periodUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BudgetSummaryCards } from '@/components/budget/BudgetSummaryCards';
import { BudgetPeriodNavigator } from '@/components/budget/BudgetPeriodNavigator';

type PendingAllocationData = {
    mode: 'total' | 'category';
    allocations: Record<string, number | undefined>;
};

const BudgetView = () => {
  const { householdId, categories, dataVersion, profile } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [budgetSummaries, setBudgetSummaries] = useState<BudgetSummary[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [overallSummary, setOverallSummary] = useState<OverallBudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingPlan, setEditingPlan] = useState<Budget | null>(null);
  const [planToDelete, setPlanToDelete] = useState<BudgetSummary | null>(null);

  // --- PERBAIKAN: useMemo sekarang mengembalikan objek Date juga ---
  const { periodForSave, periodStartDate, periodEndDate, periodStartDateObj, periodEndDateObj, periodDisplayText } = useMemo(() => {
    if (!profile) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            periodForSave: format(now, 'yyyy-MM-01'),
            periodStartDate: format(startOfMonth, 'yyyy-MM-dd'),
            periodEndDate: format(endOfMonth, 'yyyy-MM-dd'),
            periodStartDateObj: startOfMonth,
            periodEndDateObj: endOfMonth,
            periodDisplayText: format(now, 'MMMM yyyy'),
        };
    }
    const startDay = profile.period_start_day || 1;
    const period = getCustomPeriod(startDay, currentDate);
    const displayText = `${format(period.from, 'd MMM')} - ${format(period.to, 'd MMM yyyy')}`;
    
    return {
        periodForSave: format(period.from, 'yyyy-MM-01'),
        periodStartDate: format(period.from, 'yyyy-MM-dd'),
        periodEndDate: format(period.to, 'yyyy-MM-dd'),
        periodStartDateObj: period.from,
        periodEndDateObj: period.to,
        periodDisplayText: displayText,
    };
  }, [profile, currentDate]);

  const fetchBudgetDashboards = useCallback(async () => {
    if (householdId) {
      setIsLoading(true);
      try {
        const [summaryData, allocationData, overallSummaryData] = await Promise.all([
          // getBudgetSummary masih menggunakan string
          getBudgetSummary(householdId, periodStartDate, periodEndDate),
          getAllocationsByPeriod(householdId, periodForSave),
          // --- PERBAIKAN: Gunakan objek Date ---
          getOverallBudgetSummary(householdId, periodStartDateObj, periodEndDateObj)
        ]);
        setBudgetSummaries(summaryData || []);
        setAllocations(allocationData);
        setOverallSummary(overallSummaryData);
      } catch (error) {
        let errorMessage = "Gagal memuat data ringkasan anggaran.";
        if (error instanceof Error) { errorMessage += `: ${error.message}`; }
        toast.error(errorMessage);
        console.error("Error detail:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [householdId, periodStartDate, periodEndDate, periodForSave, periodStartDateObj, periodEndDateObj]);

  useEffect(() => {
    fetchBudgetDashboards();
  }, [fetchBudgetDashboards, dataVersion]);

  const handlePeriodChange = (direction: 'next' | 'prev') => {
    setCurrentDate(current => {
      const currentPeriod = getCustomPeriod(profile?.period_start_day || 1, current);
      const baseDate = currentPeriod.from;
      return direction === 'next' ? addMonths(baseDate, 1) : subMonths(baseDate, 1);
    });
  };

  const handleSaveChanges = async (planId: number, data: PendingAllocationData) => {
    if (!householdId) return;
    const { mode, allocations: pendingAllocs } = data;
    const isTotalMode = mode === 'total';
    const previouslySavedMode = allocations.some(a => a.budget_id === planId && a.category_id === null) ? 'total' : 'category';
    try {
        if (mode !== previouslySavedMode) {
            const modeToClear = isTotalMode ? 'category' : 'total';
            await clearAllocationsForMode(planId, modeToClear);
        }
        const promises: Promise<void>[] = [];
        if (isTotalMode) {
            for (const key in pendingAllocs) {
                const amount = pendingAllocs[key] || 0;
                if (key.startsWith('total-')) {
                    promises.push(saveAllocation({ household_id: householdId, period: periodForSave, budget_id: planId, category_id: null, amount }));
                } else if (key.startsWith('cat-')) {
                    const categoryId = parseInt(key.replace('cat-', ''), 10);
                    promises.push(saveAllocation({ household_id: householdId, period: periodForSave, budget_id: planId, category_id: categoryId, amount }));
                }
            }
        } else {
            for (const key in pendingAllocs) {
                if (key.startsWith('cat-')) {
                    const categoryId = parseInt(key.replace('cat-', ''), 10);
                    const amount = pendingAllocs[key] || 0;
                    promises.push(saveAllocation({ household_id: householdId, period: periodForSave, budget_id: planId, category_id: categoryId, amount }));
                }
            }
        }
        await Promise.all(promises);
        toast.success("Perubahan alokasi berhasil disimpan!");
        fetchBudgetDashboards();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(`Gagal menyimpan perubahan: ${errorMessage}`);
    }
  };

  const clearAllocationsForMode = async (planId: number, modeToClear: 'total' | 'category') => {
      if (!householdId) return;
      let query = supabase.from('budget_allocations').delete().eq('household_id', householdId).eq('period', periodForSave).eq('budget_id', planId);
      if (modeToClear === 'total') {
          query = query.is('category_id', null);
      } else {
          query = query.not('category_id', 'is', null);
      }
      const { error } = await query;
      if (error) throw error;
  };

  const handleOpenCreateModal = () => { setEditingPlan(null); setIsModalOpen(true); };

  const handleOpenEditModal = async (planSummary: BudgetSummary) => {
    const { data: planToEdit, error } = await supabase.from('budgets').select(`*, categories ( * )`).eq('id', planSummary.plan_id).single();
    if (error) { toast.error(`Gagal memuat detail rencana: ${error.message}`); return; }
    if (planToEdit) { setEditingPlan(planToEdit as Budget); setIsModalOpen(true); }
    else { toast.error("Rencana anggaran tidak ditemukan."); }
  };

  const handleSavePlan = async (id: number | null, name: string, categoryIds: number[]) => {
    if (!householdId) { toast.error("Household tidak ditemukan."); return; }
    const promise = saveBudgetPlanWithCategories(id, name, householdId, categoryIds).then(() => { fetchBudgetDashboards() });
    toast.promise(promise, { loading: 'Menyimpan rencana...', success: `Rencana anggaran "${name}" berhasil disimpan!`, error: (err: Error) => `Gagal menyimpan: ${err.message}` });
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
        await deleteBudgetPlan(planToDelete.plan_id);
        toast.success(`"${planToDelete.plan_name}" berhasil dihapus.`);
        setPlanToDelete(null);
        fetchBudgetDashboards();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(`Gagal menghapus: ${errorMessage}`);
    }
  };

  if (isLoading && !overallSummary) {
    return (<div className="flex flex-col items-center justify-center h-full p-10"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" /><p className="text-muted-foreground">Memuat data anggaran Anda...</p></div>)
  }

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Ringkasan Anggaran</h1>
          <BudgetPeriodNavigator 
            periodText={periodDisplayText}
            onPrev={() => handlePeriodChange('prev')}
            onNext={() => handlePeriodChange('next')}
          />
        </div>
        
        <BudgetSummaryCards summary={overallSummary} />

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4 border-t">
            <h2 className="text-xl font-bold text-gray-800">Rencana Anggaran</h2>
            <Button onClick={handleOpenCreateModal} className="w-full md:w-auto">
                Buat Rencana Baru
            </Button>
        </div>

        <div className="relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}
            {budgetSummaries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                    {budgetSummaries.map(summary => (
                        <BudgetPlanCard
                            key={summary.plan_id}
                            planSummary={summary}
                            allocations={allocations.filter(a => a.budget_id === summary.plan_id)}
                            onSaveChanges={(data) => handleSaveChanges(summary.plan_id, data)}
                            onEdit={() => handleOpenEditModal(summary)}
                            onDelete={() => setPlanToDelete(summary)}
                            onRefresh={fetchBudgetDashboards}
                            currentDate={currentDate}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-700">Belum Ada Rencana Anggaran</h3>
                    <p className="text-muted-foreground mt-2">Tidak ada data anggaran untuk periode ini.</p>
                </div>
            )}
        </div>
      </div>

      <BudgetPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        editingPlan={editingPlan}
        allCategories={categories.filter(c => c.type === 'expense')}
      />

      <Dialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Anda yakin ingin menghapus?</DialogTitle>
                <DialogDescription>
                    Aksi ini akan menghapus Rencana Anggaran &quot;{planToDelete?.plan_name}&quot; beserta semua alokasi dananya secara permanen.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPlanToDelete(null)}>Batal</Button>
                <Button variant="destructive" onClick={handleDeletePlan}>Ya, Hapus</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BudgetView;