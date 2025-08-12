// src/components/budget/BudgetSummaryCards.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { OverallBudgetSummary } from "@/types";
import { ArrowDown, Banknote, PiggyBank, Scale } from "lucide-react";

interface BudgetSummaryCardsProps {
    summary: OverallBudgetSummary | null;
}

const SummaryCard = ({ title, value, icon, valueColor, note }: { title: string, value: number, icon: React.ReactNode, valueColor?: string, note?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueColor)}>
                {formatCurrency(value)}
            </div>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </CardContent>
    </Card>
);

export const BudgetSummaryCards = ({ summary }: BudgetSummaryCardsProps) => {
    if (!summary) {
        // Tampilkan skeleton loader saat data belum siap
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-gray-200 rounded w-32"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const { total_income, total_budgeted, total_spent } = summary;
    const remainingInBudget = total_budgeted - total_spent;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <SummaryCard
                title="Pemasukan Periode Ini"
                value={total_income}
                icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
                valueColor="text-green-600"
            />
            <SummaryCard
                title="Total Dianggarkan"
                value={total_budgeted}
                icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
            />
            <SummaryCard
                title="Total Pengeluaran"
                value={total_spent}
                icon={<ArrowDown className="h-4 w-4 text-muted-foreground" />}
                valueColor="text-red-600"
            />
             <SummaryCard
                title="Sisa Dana Anggaran"
                value={remainingInBudget}
                icon={<Scale className="h-4 w-4 text-muted-foreground" />}
                valueColor={remainingInBudget < 0 ? "text-orange-500" : ""}
                note={remainingInBudget < 0 ? "Pengeluaran melebihi anggaran" : "Dapat digunakan"}
            />
        </div>
    );
};
