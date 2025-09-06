// src/components/budget/BudgetPeriodNavigator.tsx

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BudgetPeriodNavigatorProps {
  periodText: string;
  onPrev: () => void;
  onNext: () => void;
}

export const BudgetPeriodNavigator = ({ periodText, onPrev, onNext }: BudgetPeriodNavigatorProps) => {
  return (
    // Kita hapus justify-center agar komponen ini bisa fleksibel
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev} aria-label="Periode sebelumnya">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* FIX: Hapus div w-48. Ganti dengan span yang fleksibel.
        - w-full: akan mengambil ruang sisa di dalam flex container.
        - text-center: menjaga teks tetap di tengah.
        - whitespace-nowrap: Memastikan tanggal tidak terpotong jadi dua baris.
        - min-w-0: Trik flexbox agar bisa mengecil jika diperlukan.
      */}
      <span className="text-sm font-semibold text-gray-700 w-full text-center whitespace-nowrap min-w-0">
        {periodText}
      </span>
      
      <Button variant="outline" size="icon" onClick={onNext} aria-label="Periode selanjutnya">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};