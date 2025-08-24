// src/components/dashboard/CashFlowChart.tsx
"use client";

import { useAppData } from "@/contexts/AppDataContext";
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { getDashboardCashFlow } from "@/lib/reportService";
import { 
    ComposedChart, 
    Bar, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';

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

// Custom tooltip untuk format yang lebih baik
interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        color: string;
        dataKey: string;
        value: number;
    }>;
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                <p className="font-medium text-gray-900 mb-2">{label}</p>
                {payload.map((entry, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        <span className="font-medium">{entry.dataKey}:</span> {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Custom legend untuk styling yang lebih baik
interface LegendProps {
    payload?: Array<{
        color: string;
        value: string;
    }>;
}

const CustomLegend = ({ payload }: LegendProps) => {
    if (!payload) return null;
    
    return (
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-2 md:mt-4">
            {payload.map((entry, index: number) => (
                <div key={index} className="flex items-center gap-1.5 md:gap-2">
                    <div 
                        className="w-3 h-3 md:w-4 md:h-4 rounded-sm" 
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs md:text-sm text-gray-600 font-medium">
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function CashFlowChart({ dateRange }: CashFlowChartProps) {
    const { householdId } = useAppData();
    
    const { data: chartData, isLoading, error } = useSWR(
        (householdId && dateRange?.from && dateRange.to) ? ['dashboardCashFlow', householdId, dateRange] : null, 
        () => getDashboardCashFlow(householdId!, dateRange!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Cache for 1 minute
        }
    );

    // Loading state dengan spinner
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Arus Kas & Saldo Tersedia</CardTitle>
                    <CardDescription>Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-sm text-muted-foreground">Memuat data chart...</p>
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
                    <CardTitle>Arus Kas & Saldo Tersedia</CardTitle>
                    <CardDescription>Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-red-500">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-sm">Gagal memuat data chart</p>
                            <p className="text-xs text-muted-foreground">Silakan refresh halaman</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (!chartData || chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Arus Kas & Saldo Tersedia</CardTitle>
                    <CardDescription>Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-muted-foreground mb-2">Tidak ada data untuk ditampilkan</p>
                            <p className="text-sm text-muted-foreground">Coba ubah rentang tanggal atau tambah transaksi</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Transform data untuk chart
    const transformedData = chartData.map((item: DashboardCashFlowData) => ({
        period: item.period,
        'Pemasukan': item.pemasukan,
        'Pengeluaran': Math.abs(item.pengeluaran), // Tetap positif untuk visualisasi
        'Kas Tersedia': item.kas_tersedia,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base md:text-lg">Arus Kas & Saldo Tersedia</CardTitle>
                <CardDescription className="text-sm">Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Mobile-optimized height: shorter on mobile, taller on desktop */}
                <div className="h-64 md:h-80 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={transformedData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                                dataKey="period" 
                                tick={{ fontSize: 10 }}
                                tickLine={{ stroke: '#e5e7eb' }}
                                interval="preserveStartEnd"
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                tick={{ fontSize: 10 }}
                                tickLine={{ stroke: '#e5e7eb' }}
                                width={60}
                                tickFormatter={(value) => {
                                    // Mobile-friendly currency format
                                    if (value >= 1000000) {
                                        return `${(value / 1000000).toFixed(1)}M`;
                                    } else if (value >= 1000) {
                                        return `${(value / 1000).toFixed(0)}K`;
                                    }
                                    return value.toString();
                                }}
                            />
                            <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend 
                                content={<CustomLegend />}
                                wrapperStyle={{ paddingTop: '10px' }}
                            />
                            
                            {/* Bar untuk Pemasukan */}
                            <Bar 
                                dataKey="Pemasukan" 
                                fill="#10b981" 
                                name="Pemasukan"
                                radius={[2, 2, 0, 0]}
                            />
                            
                            {/* Bar untuk Pengeluaran */}
                            <Bar 
                                dataKey="Pengeluaran" 
                                fill="#ef4444" 
                                name="Pengeluaran"
                                radius={[2, 2, 0, 0]}
                            />
                            
                            {/* Line untuk Kas Tersedia */}
                            <Line 
                                type="monotone" 
                                dataKey="Kas Tersedia" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                name="Kas Tersedia"
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}