// src/components/budget/BudgetPlanModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { Budget, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface BudgetPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number | null, name: string, categoryIds: number[]) => Promise<void>;
  editingPlan: Budget | null;
  allCategories: Category[];
}

export const BudgetPlanModal = ({ isOpen, onClose, onSave, editingPlan, allCategories }: BudgetPlanModalProps) => {
  const [budgetName, setBudgetName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (editingPlan && isOpen) {
      setBudgetName(editingPlan.name || '');
      setSelectedCategories(editingPlan.categories || []);
    } else {
      setBudgetName('');
      setSelectedCategories([]);
    }
  }, [editingPlan, isOpen]);

  const handleSave = async () => {
    if (!budgetName.trim()) return;
    setIsSaving(true);
    const categoryIds = selectedCategories.map(c => c.id);
    await onSave(editingPlan?.id || null, budgetName, categoryIds);
    setIsSaving(false);
    onClose();
  };
  
  const isEditMode = !!editingPlan;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Rencana Anggaran' : 'Buat Rencana Anggaran Baru'}</DialogTitle>
          <DialogDescription>
            Beri nama dan pilih kategori yang akan dimasukkan ke dalam kelompok anggaran ini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="budget-name" className="text-sm font-medium">Nama Anggaran</label>
            <Input id="budget-name" value={budgetName} onChange={(e) => setBudgetName(e.target.value)} placeholder="Contoh: Kebutuhan Pokok" />
          </div>
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedCategories.length > 0 ? `${selectedCategories.length} kategori terpilih` : "Pilih kategori..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Cari kategori..." />
                  <CommandList>
                    <CommandEmpty>Kategori tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {allCategories.map(cat => {
                        const isSelected = selectedCategories.some(s => s.id === cat.id);
                        return (
                          <CommandItem key={cat.id} onSelect={() => {
                              if (isSelected) {
                                setSelectedCategories(prev => prev.filter(s => s.id !== cat.id));
                              } else {
                                setSelectedCategories(prev => [...prev, cat]);
                              }
                            }}>
                            <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                            {cat.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button onClick={handleSave} disabled={isSaving || !budgetName.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};