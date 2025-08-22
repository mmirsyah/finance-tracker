// src/components/transaction/BulkActionToolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { X, Edit } from "lucide-react";

interface BulkActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onReassignCategory: () => void;
}

export default function BulkActionToolbar({ selectedCount, onClear, onReassignCategory }: BulkActionToolbarProps) {
  return (
    <div className="sticky top-[65px] z-20 bg-blue-600 text-white rounded-lg shadow-lg p-3 flex items-center justify-between transition-all duration-300 ease-in-out">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-500" onClick={onClear}>
          <X />
        </Button>
        <span className="font-semibold">{selectedCount} transaksi dipilih</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onReassignCategory}>
          <Edit className="mr-2 h-4 w-4" />
          Ubah Kategori
        </Button>
      </div>
    </div>
  );
}