// src/components/SummaryDisplay.tsx
"use client";

import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Tipe props yang baru dan lebih fleksibel
interface SummaryDisplayProps {
  label: string;
  amount: number | null | undefined;
  description?: string;
  isLoading?: boolean;
}

export default function SummaryDisplay({ label, amount, description, isLoading }: SummaryDisplayProps) {
    if (isLoading) {
        // Tampilan skeleton sederhana saat data loading
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium h-4 bg-gray-200 rounded w-3/4"></CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold h-8 bg-gray-200 rounded w-1/2"></div>
                    {description && <div className="text-xs text-muted-foreground h-3 bg-gray-200 rounded w-full mt-1"></div>}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">
                    {/* --- PERBAIKAN DI SINI --- */}
                    {/* Cek dulu apakah amount ada nilainya sebelum diformat */}
                    {(amount === null || amount === undefined) ? 'Rp 0' : formatCurrency(amount)}
                </p>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}