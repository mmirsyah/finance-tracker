// src/components/budget/BudgetPlanCard.tsx

import { useState, useMemo, useEffect } from 'react';
import { BudgetSummary, BudgetAllocation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { Loader2, Trash2, Info, AlertCircle, Save } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type PendingAllocationData = {
    mode: 'total' | 'category';
    allocations: Record<string, number | undefined>;
};

interface BudgetPlanCardProps {
  planSummary: BudgetSummary;
  allocations: BudgetAllocation[];
  onEdit: () => void;
  onDelete: () => void;
  onSaveChanges: (data: PendingAllocationData) => Promise<void>;
}

export const BudgetPlanCard = ({ planSummary, allocations, onEdit, onDelete, onSaveChanges }: BudgetPlanCardProps) => {
  const [currentMode, setCurrentMode] = useState<'total' | 'category'>('category');
  const [pendingAllocations, setPendingAllocations] = useState<Record<string, number | undefined>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const totalAllocationExists = allocations.some(a => a.category_id === null);
    setCurrentMode(totalAllocationExists ? 'total' : 'category');
    setPendingAllocations({});
  }, [allocations, planSummary]);

  const handleAllocationChange = (key: string, value: string) => {
    const amount = value === '' ? undefined : parseFloat(value);
    setPendingAllocations(prev => ({ ...prev, [key]: amount }));
  };
  
  const handleSaveAll = async () => {
    setIsSaving(true);
    await onSaveChanges({
        mode: currentMode,
        allocations: pendingAllocations
    });
    setIsSaving(false);
  };
  
  const hasPendingChanges = useMemo(() => Object.keys(pendingAllocations).length > 0, [pendingAllocations]);

  const getDisplayValue = (key: string, savedValue: number) => {
      if (pendingAllocations[key] !== undefined) {
          return pendingAllocations[key];
      }
      return savedValue || '';
  };

  const savedTotalAllocation = useMemo(() => allocations.find(a => a.category_id === null)?.amount ?? 0, [allocations]);
  
  const sumOfCategoryAllocations = useMemo(() => {
      return (planSummary.categories || []).reduce((sum, cat) => {
          const key = `cat-${cat.id}`;
          const pendingValue = pendingAllocations[key];
          const savedValue = cat.allocated || 0;
          const currentValue = pendingValue !== undefined ? pendingValue : savedValue;
          return sum + (currentValue || 0);
      }, 0);
  }, [planSummary.categories, pendingAllocations]);
  
  const totalAllocatedForDisplay = currentMode === 'total'
    ? (getDisplayValue(`total-${planSummary.plan_id}`, savedTotalAllocation) as number | string) === ''
      ? 0
      : parseFloat(getDisplayValue(`total-${planSummary.plan_id}`, savedTotalAllocation).toString())
    : sumOfCategoryAllocations;

  const totalSpentForDisplay = planSummary.total_spent;
  const headerRemaining = totalAllocatedForDisplay - totalSpentForDisplay;
  const headerProgress = totalAllocatedForDisplay > 0 ? (totalSpentForDisplay / totalAllocatedForDisplay) * 100 : 0;
  const unallocatedHybridBalance = (getDisplayValue(`total-${planSummary.plan_id}`, savedTotalAllocation) as number || 0) - sumOfCategoryAllocations;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span className="text-xl font-bold">{planSummary.plan_name}</span>
          <div className="text-right">
            <span className={cn("text-lg font-semibold", headerRemaining < 0 ? "text-red-600" : "text-blue-600")}>{formatCurrency(headerRemaining)}</span>
            <p className="text-xs text-muted-foreground">Sisa</p>
          </div>
        </CardTitle>
        <div className="space-y-1 pt-2">
            <Progress value={headerProgress} />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(totalSpentForDisplay)}</span>
                <span>{formatCurrency(totalAllocatedForDisplay)}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={`plan-${planSummary.plan_id}`}>
            <AccordionTrigger>Atur Alokasi Dana</AccordionTrigger>
            <AccordionContent>
              {/* --- PERUBAHAN RESPONSIVE DI SINI --- */}
              <RadioGroup value={currentMode} onValueChange={(val) => setCurrentMode(val as 'total' | 'category')} className="flex flex-col sm:flex-row gap-2 sm:gap-4 my-4">
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="total" id={`r1-${planSummary.plan_id}`} />
                      <Label htmlFor={`r1-${planSummary.plan_id}`}>Mode Total (Hybrid)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="category" id={`r2-${planSummary.plan_id}`} />
                      <Label htmlFor={`r2-${planSummary.plan_id}`}>Mode per Kategori</Label>
                  </div>
              </RadioGroup>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border-b">
                <span className="flex-1 font-semibold">Anggaran Total</span>
                <Input type="number" placeholder="0" className="w-full sm:w-40 h-8" 
                  value={
                    currentMode === 'category'
                      ? sumOfCategoryAllocations
                      : getDisplayValue(`total-${planSummary.plan_id}`, savedTotalAllocation)
                  }
                  onChange={(e) => handleAllocationChange(`total-${planSummary.plan_id}`, e.target.value)} 
                  disabled={currentMode === 'category'} 
                />
              </div>
              
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Rincian per Kategori</p>
                {currentMode === 'total' && (<div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200"><Info className="h-4 w-4 text-blue-600"/><span className="flex-1 text-sm font-semibold text-blue-800">Sisa untuk kategori lain</span><span className={cn("text-sm font-bold", unallocatedHybridBalance < 0 ? "text-red-600" : "text-blue-800")}>{formatCurrency(unallocatedHybridBalance)}</span></div>)}
                
                {(!planSummary.categories || planSummary.categories.length === 0) ? (
                    <div className="text-center p-4 my-2 border-2 border-dashed rounded-lg">
                        <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-muted-foreground">Tidak ada kategori di rencana ini.</p>
                        <Button variant="link" size="sm" className="mt-1" onClick={onEdit}>Klik di sini untuk menambahkannya</Button>
                    </div>
                ) : (
                    (planSummary.categories || []).map(cat => {
                        const key = `cat-${cat.id}`;
                        const savedValue = cat.allocated || 0;
                        const categoryRemaining = savedValue - cat.spent;
                        return (
                            <div key={key} className="flex flex-col gap-2 p-2 rounded-md hover:bg-gray-50">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <p className="flex-1 text-sm font-medium">{cat.name}</p>
                                    <Input 
                                      type="number" 
                                      placeholder="0" 
                                      className="w-full sm:w-40 h-8" 
                                      value={getDisplayValue(key, savedValue)} 
                                      onChange={(e) => handleAllocationChange(key, e.target.value)} 
                                    />
                                </div>
                                <div className="sm:pl-1">
                                  <Progress value={savedValue > 0 ? (cat.spent / savedValue) * 100 : 0} className="h-1.5"/>
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                      <span>Aktual: {formatCurrency(cat.spent)}</span>
                                      {savedValue > 0 && (
                                          <span className={cn(categoryRemaining < 0 && "text-red-600 font-semibold")}>
                                              Sisa: {formatCurrency(categoryRemaining)}
                                          </span>
                                      )}
                                  </div>
                                </div>
                            </div>
                        )
                    })
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveAll} disabled={isSaving || !hasPendingChanges}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Alokasi
                </Button>
              </div>

            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 mt-auto pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-500"/></Button>
        <Button variant="outline" size="sm" onClick={onEdit}>Edit Rencana</Button>
      </CardFooter>
    </Card>
  );
};
