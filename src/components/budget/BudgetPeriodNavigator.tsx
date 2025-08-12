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
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev} aria-label="Periode sebelumnya">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center w-48">
        <span className="text-sm font-semibold text-gray-700">{periodText}</span>
      </div>
      <Button variant="outline" size="icon" onClick={onNext} aria-label="Periode selanjutnya">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
