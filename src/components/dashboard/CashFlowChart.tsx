// src/components/dashboard/CashFlowChart.tsx
"use client";

import { useAppData } from "@/contexts/AppDataContext";
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { getDashboardCashFlow } from "@/lib/reportService";
import { ComboChart } from "@/components/ComboChart"; // <-- Import ComboChart kustom kita

interface CashFlowChartProps {
    dateRange: DateRange | undefined;
}

// Tipe data untuk hasil RPC
type DashboardCashFlowData = {
    period: string;
    pemasukan: number;
    pengeluaran: number; // Ini adalah angka negatif
    kas_tersedia: number;
};

export default function CashFlowChart({ dateRange }: CashFlowChartProps) {
    const { householdId } = useAppData();
    
    const { data: chartData, isLoading } = useSWR(
        (householdId && dateRange?.from && dateRange.to) ? ['dashboardCashFlow', householdId, dateRange] : null, 
        () => getDashboardCashFlow(householdId!, dateRange!)
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Arus Kas & Saldo Tersedia</CardTitle>
                <CardDescription>Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>}
                {(!isLoading && (!chartData || chartData.length === 0)) && <div className="h-80 flex items-center justify-center text-muted-foreground">Tidak ada data untuk ditampilkan.</div>}
                {(!isLoading && chartData && chartData.length > 0) && (
                    <ComboChart
                        className="h-80 mt-4"
                        data={chartData.map((item: DashboardCashFlowData) => ({
                            period: item.period,
                            'Pemasukan': item.pemasukan,
                            // Pengeluaran dibuat positif agar bar naik, tapi warnanya akan merah
                            'Pengeluaran': Math.abs(item.pengeluaran),
                            'Kas Tersedia': item.kas_tersedia,
                        }))}
                        index="period"
                        barCategories={['Pemasukan', 'Pengeluaran']}
                        lineCategories={['Kas Tersedia']}
                        colors={['emerald', 'rose', 'blue']}
                        valueFormatter={formatCurrency}
                    />
                )}
            </CardContent>
        </Card>
    );
}