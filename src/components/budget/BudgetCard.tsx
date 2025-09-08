// src/components/budget/BudgetCard.tsx
"use client";

import { useState, useEffect } from 'react';
import { BudgetCategoryData } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BudgetProgressBar } from './BudgetProgressBar';
import { Repeat, Star, BrainCircuit } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import { updateCategoryRolloverStatus } from '@/lib/budgetService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BudgetingAssistant } from './BudgetingAssistant';

interface BudgetCardProps {
  category: BudgetCategoryData & { is_rollover: boolean };
  onAssignmentChange: (categoryId: number, newAmount: number) => void;
  onRefresh: () => void;
  isPriority: boolean;
  onTogglePriority: (categoryId: number) => void;
  currentPeriodStart: Date;
}

export const BudgetCard = ({ category, onAssignmentChange, onRefresh, isPriority, onTogglePriority, currentPeriodStart }: BudgetCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(String(category.assigned || ''));
  const [isEditing, setIsEditing] = useState(false);
  const [isRolloverActive, setIsRolloverActive] = useState(category.is_rollover);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    // Update input value from props only when it's not being edited
    if (!isEditing) {
      setInputValue(String(category.assigned || ''));
    }
    setIsRolloverActive(category.is_rollover);
  }, [category.assigned, category.is_rollover, isEditing]);

  const debouncedSave = useDebouncedCallback((value: number) => {
    onAssignmentChange(category.id, value);
  }, 750);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Allow only numbers
    setInputValue(value);
    const numberValue = parseFloat(value);
    if (!isNaN(numberValue) && numberValue >= 0) {
      debouncedSave(numberValue);
    } else if (value === '') {
      debouncedSave(0);
    }
  };

  const handleApplyFromAssistant = (amount: number) => {
    const roundedAmount = Math.ceil(amount / 1000) * 1000;
    setInputValue(String(roundedAmount));
    onAssignmentChange(category.id, roundedAmount);
    setIsEditing(false); // Ensure the input is blurred and formatted after applying
  };

  const handleToggleRollover = async (newStatus: boolean) => {
    setIsRolloverActive(newStatus);
    setIsSwitching(true);
    try {
      await updateCategoryRolloverStatus(category.id, newStatus);
      toast.success(`Rollover untuk "${category.name}" telah di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`);
      onRefresh();
    } catch {
      toast.error('Gagal mengubah status rollover.');
      setIsRolloverActive(!newStatus);
    } finally {
      setIsSwitching(false);
    }
  };

  const availableColor = category.available >= 0 ? 'text-secondary' : 'text-destructive';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm transition-all">
      {/* Collapsed View */}
      <div className="p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isRolloverActive && <Repeat className="w-3 h-3 text-blue-500" />}
            <span className="font-semibold text-gray-800">{category.name}</span>
          </div>
          <div className={cn("font-bold text-lg", availableColor)}>
            {formatCurrency(category.available)}
          </div>
        </div>
        <div className="mt-2">
          <BudgetProgressBar value={category.activity} max={category.assigned} />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(category.activity)} dari {formatCurrency(category.assigned)}</span>
            <span>{category.assigned > 0 ? `${((category.activity / category.assigned) * 100).toFixed(0)}%` : '0%'}</span>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`budget-input-${category.id}`} className="text-sm font-medium text-gray-700 mb-1 block">Dialokasikan</label>
              <Input
                id={`budget-input-${category.id}`}
                type="text"
                placeholder="Rp 0"
                value={isEditing ? inputValue : formatCurrency(parseFloat(inputValue) || 0)}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                onChange={handleInputChange}
                className="bg-white text-right"
              />
            </div>

            <div className="flex items-end">
              <Popover open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                      <BrainCircuit className="w-4 h-4 mr-2" />
                      Bantuan Anggaran
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                    <BudgetingAssistant 
                        categoryId={category.id}
                        onApply={handleApplyFromAssistant}
                        currentPeriodStart={currentPeriodStart}
                        onOpenChange={setIsAssistantOpen}
                    />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id={`rollover-switch-${category.id}`}
                checked={isRolloverActive}
                onCheckedChange={handleToggleRollover}
                disabled={isSwitching}
              />
              <label htmlFor={`rollover-switch-${category.id}`} className="text-sm text-gray-600">Sisa bulan lalu (Rollover)</label>
            </div>

            <Button variant={isPriority ? "default" : "ghost"} size="sm" onClick={() => onTogglePriority(category.id)}>
              <Star className={cn('w-4 h-4 mr-2', isPriority && 'fill-current')} />
              {isPriority ? 'Prioritas' : 'Jadikan Prioritas'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
