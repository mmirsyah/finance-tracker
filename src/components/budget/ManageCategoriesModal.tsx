// src/components/budget/ManageCategoriesModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { Category, BudgetType } from '@/types';

// Komponen UI dari Shadcn yang baru saja kita tambahkan
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Definisikan tipe untuk props yang akan diterima komponen ini
interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (updates: { id: number; budget_type: BudgetType }[]) => Promise<void>;
}

export const ManageCategoriesModal = ({
  isOpen,
  onClose,
  categories,
  onSave,
}: ManageCategoriesModalProps) => {
  // State untuk menyimpan perubahan yang dibuat pengguna sebelum menekan "Simpan"
  const [pendingChanges, setPendingChanges] = useState<Record<number, BudgetType>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Jika modal ditutup, reset perubahan yang tertunda
  useEffect(() => {
    if (!isOpen) {
      setPendingChanges({});
    }
  }, [isOpen]);

  // Fungsi untuk menangani perubahan pada dropdown
  const handleTypeChange = (categoryId: number, newType: BudgetType) => {
    setPendingChanges((prev) => ({
      ...prev,
      [categoryId]: newType,
    }));
  };

  // Fungsi yang dipanggil saat tombol "Simpan Perubahan" ditekan
  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Ubah format data dari { 1: 'Fixed', 2: 'Flex' } menjadi [{id: 1, budget_type: 'Fixed'}, ...]
    const updates = Object.entries(pendingChanges).map(([id, budget_type]) => ({
      id: Number(id),
      budget_type,
    }));

    if (updates.length > 0) {
      await onSave(updates);
    }
    setIsSaving(false);
    onClose(); // Tutup modal setelah menyimpan
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kelola Tipe Budget Kategori</DialogTitle>
          <DialogDescription>
            Pindahkan kategori ke dalam kelompok budget yang sesuai dengan gaya hidup Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {categories
            .filter(cat => cat.type === 'expense') // Hanya tampilkan kategori pengeluaran
            .map((category) => {
              // Tentukan tipe budget saat ini: dari data perubahan atau data asli
              const currentBudgetType = pendingChanges[category.id] || category.budget_type;

              return (
                <div key={category.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{category.name}</span>
                  <Select
                    value={currentBudgetType}
                    onValueChange={(newType: BudgetType) => handleTypeChange(category.id, newType)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Flex">Fleksibel (Flex)</SelectItem>
                      <SelectItem value="Fixed">Tagihan Tetap (Fixed)</SelectItem>
                      <SelectItem value="Non-Monthly">Non-Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSaving || Object.keys(pendingChanges).length === 0}>
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};