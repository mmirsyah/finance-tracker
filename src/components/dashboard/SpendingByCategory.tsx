// src/components/dashboard/SpendingByCategory.tsx
"use client";

import { useAppData } from "@/contexts/AppDataContext";
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarList } from "@tremor/react";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';

// --- Tambahkan tipe data untuk hasil RPC ---
type SpendingData = {
    category_name: string;
    total_spent: number;
};

const fetcher = async ([_, householdId, dateRange]: [string, string, DateRange]): Promise<{ name: string; value: number }[]> => {
    if (!dateRange.from || !dateRange.to) return [];

    const { data, error } = await supabase.rpc('get_spending_by_parent_category', {
        p_household_id: householdId,
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
    });

    if (error) {
        console.error("Spending by category error:", error);
        throw new Error(error.message);
    }
    // --- PERBAIKAN: Beri tipe pada 'item' ---
    return (data as SpendingData[]).map((item) => ({
        name: item.category_name,
        value: item.total_spent
    }));
};

interface SpendingByCategoryProps {
    dateRange: DateRange | undefined;
}

export default function SpendingByCategory({ dateRange }: SpendingByCategoryProps) {
    const { householdId } = useAppData();
    const { data: spendingData, isLoading } = useSWR(
        (householdId && dateRange?.from && dateRange?.to) ? ['spendingByCategory', householdId, dateRange] : null,
        fetcher
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pengeluaran per Kategori</CardTitle>
                <CardDescription>5 kategori pengeluaran terbesar pada periode yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="h-72 flex items-center justify-center text-muted-foreground">Loading data...</div>}
                {(!isLoading && (!spendingData || spendingData.length === 0)) && <div className="h-72 flex items-center justify-center text-muted-foreground">Tidak ada pengeluaran untuk ditampilkan.</div>}
                {(!isLoading && spendingData && spendingData.length > 0) && (
                    <BarList
                        data={spendingData.slice(0, 5)}
                        valueFormatter={formatCurrency}
                        className="mt-2"
                    />
                )}
            </CardContent>
        </Card>
    );
}