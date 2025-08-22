// src/components/modals/BulkReassignCategoryModal.tsx
"use client";

import { useState } from 'react';
import { Category } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryCombobox } from '@/components/CategoryCombobox';

interface BulkReassignCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCategoryId: number) => Promise<void>;
  transactionCount: number;
  categories: Category[];
}

export default function BulkReassignCategoryModal({ isOpen, onClose, onSave, transactionCount, categories }: BulkReassignCategoryModalProps) {
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newCategoryId) {
      toast.error("Silakan pilih kategori tujuan.");
      return;
    }
    setIsSaving(true);
    await onSave(Number(newCategoryId));
    setIsSaving(false);
  };

  // Filter categories to only show income/expense and non-archived ones
  const availableCategories = categories.filter(c => 
    (c.type === 'income' || c.type === 'expense') && !c.is_archived
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Kategori untuk {transactionCount} Transaksi</DialogTitle>
          <DialogDescription>
            Pilih kategori baru untuk semua transaksi yang dipilih. Aksi ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori Baru
          </label>
          <CategoryCombobox 
            allCategories={availableCategories}
            value={newCategoryId}
            onChange={(value) => setNewCategoryId(value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button onClick={handleSave} disabled={isSaving || !newCategoryId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}