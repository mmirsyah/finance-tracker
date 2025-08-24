// src/components/dashboard/SpendingByCategory.tsx
"use client";

import { useAppData } from "@/contexts/AppDataContext";
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { Loader2, AlertCircle, TrendingDown } from 'lucide-react';

// --- Tambahkan tipe data untuk hasil RPC ---
type SpendingData = {
    category_name: string;
    total_spent: number;
};

const fetcher = async ([_, householdId, dateRange]: [string, string, DateRange]): Promise<{ name: string; value: number; percentage: number }[]> => {
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

    const spendingData = data as SpendingData[];
    const totalSpending = spendingData.reduce((sum, item) => sum + item.total_spent, 0);
    
    return spendingData.map((item) => ({
        name: item.category_name,
        value: item.total_spent,
        percentage: totalSpending > 0 ? (item.total_spent / totalSpending) * 100 : 0
    }));
};

// Custom BarList Component
const CustomBarList = ({ data }: { data: { name: string; value: number; percentage: number }[] }) => {
    const maxValue = Math.max(...data.map(item => item.value));
    
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">
                            {item.name}
                        </span>
                        <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(item.value)}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                                {item.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ 
                                width: `${(item.value / maxValue) * 100}%`,
                                backgroundColor: `hsl(${220 - (index * 30)}, 70%, 50%)`
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

interface SpendingByCategoryProps {
    dateRange: DateRange | undefined;
}

export default function SpendingByCategory({ dateRange }: SpendingByCategoryProps) {
    const { householdId } = useAppData();
    const { data: spendingData, isLoading, error } = useSWR(
        (householdId && dateRange?.from && dateRange?.to) ? ['spendingByCategory', householdId, dateRange] : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Cache for 1 minute
        }
    );

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pengeluaran per Kategori</CardTitle>
                    <CardDescription>5 kategori pengeluaran terbesar pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-72 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-sm text-muted-foreground">Memuat data pengeluaran...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pengeluaran per Kategori</CardTitle>
                    <CardDescription>5 kategori pengeluaran terbesar pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-72 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-red-500">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-sm">Gagal memuat data pengeluaran</p>
                            <p className="text-xs text-muted-foreground">Silakan refresh halaman</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (!spendingData || spendingData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pengeluaran per Kategori</CardTitle>
                    <CardDescription>5 kategori pengeluaran terbesar pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-72 flex items-center justify-center">
                        <div className="text-center">
                            <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-muted-foreground mb-2">Tidak ada pengeluaran</p>
                            <p className="text-sm text-muted-foreground">Belum ada transaksi pengeluaran pada periode ini</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const topSpending = spendingData.slice(0, 5);
    const totalAmount = spendingData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Pengeluaran per Kategori
                </CardTitle>
                <CardDescription>
                    5 kategori pengeluaran terbesar • Total: {formatCurrency(totalAmount)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CustomBarList data={topSpending} />
                {spendingData.length > 5 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            +{spendingData.length - 5} kategori lainnya
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}