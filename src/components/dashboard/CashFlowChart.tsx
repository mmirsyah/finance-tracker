'use client';

import { useMemo } from 'react';
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
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';

interface CashFlowChartProps {
    dateRange: DateRange | undefined;
}

type DashboardCashFlowData = {
    period: string;
    pemasukan: number;
    pengeluaran: number;
    kas_tersedia: number;
};

interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        color: string;
        dataKey: string;
        value: number;
    }>;
    label?: string;
}

// Custom tooltip untuk menampilkan nilai format rupiah
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg">
                <p className="font-medium text-foreground mb-2">{label}</p>
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

interface LegendProps {
    payload?: Array<{
        color: string;
        value: string;
    }>;
}

// Custom legend agar lebih rapi
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
                    <span className="text-xs md:text-sm text-muted-foreground font-medium">
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function CashFlowChart({ dateRange }: CashFlowChartProps) {
    const { householdId } = useAppData();
    
    // Hitung endDate efektif → tidak boleh lewat dari hari ini
    const effectiveEndDate = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!dateRange?.to) {
            return today;
        }

        const selectedTo = new Date(dateRange.to);
        selectedTo.setHours(0, 0, 0, 0);

        return new Date(Math.min(selectedTo.getTime(), today.getTime()));
    }, [dateRange?.to]);

    // Fetch data arus kas
    const { data: chartData, isLoading, error } = useSWR(
        (householdId && dateRange?.from) 
            ? ['dashboardCashFlow', householdId, dateRange.from, effectiveEndDate] 
            : null, 
        () => getDashboardCashFlow(householdId!, { from: dateRange!.from!, to: effectiveEndDate }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // cache 1 menit
        }
    );

    // Kondisi loading
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
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Memuat data chart...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Kondisi error
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Arus Kas & Saldo Tersedia</CardTitle>
                    <CardDescription>Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-sm">Gagal memuat data chart</p>
                            <p className="text-xs text-muted-foreground">Silakan refresh halaman</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Kondisi data kosong
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

    // Utility untuk pastikan angka valid
    const toNumber = (v: unknown) => {
        const n = Number(String(v ?? 0).replace(/[^0-9.-]+/g, ''));
        return Number.isFinite(n) ? n : 0;
    };

    // Transformasi data → pastikan pengeluaran negatif
    const transformedData = chartData.map((item: DashboardCashFlowData) => ({
        period: item.period,
        Pemasukan: toNumber(item.pemasukan),
        Pengeluaran: -Math.abs(toNumber(item.pengeluaran)), // selalu negatif
        'Kas Tersedia': toNumber(item.kas_tersedia),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base md:text-lg">Arus Kas & Saldo Tersedia</CardTitle>
                <CardDescription className="text-sm">Pergerakan dana harian dan total kas yang tersedia pada periode yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 md:h-80 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={transformedData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                            {/* Grid */}
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            
                            {/* Sumbu X */}
                            <XAxis 
                                
                                dataKey="period" 
                                axisLine={false}
                                tick={{ fontSize: 10 }}
                                tickLine={{ stroke: 'oklch(var(--border))' }}
                                interval="preserveStartEnd"
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />

                            {/* Sumbu Y → pastikan bisa render negatif */}
                            <YAxis 
                                domain={[
                                    (_dataMin: number) => Math.min(0, ...transformedData.map((d: { Pengeluaran: number; }) => d.Pengeluaran)),
                                    (_dataMax: number) => Math.max(...transformedData.map((d: { Pemasukan: number; 'Kas Tersedia': number; }) => Math.max(d.Pemasukan, d['Kas Tersedia'])))
                                ]}
                                axisLine={false}
                                tick={{ fontSize: 10 }}
                                tickLine={{ stroke: 'oklch(var(--border))' }}
                                width={60}
                                tickFormatter={(value) => {
                                    const absValue = Math.abs(value as number);
                                    const sign = value < 0 ? '-' : '';
                                    if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(1)}M`;
                                    if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
                                    return value.toString();
                                }}
                            />


                            {/* Garis nol */}
                            <ReferenceLine y={0} strokeWidth={1} stroke="oklch(var(--foreground))" label={{ position: 'insideBottom', offset: 10 }} />
                            

                            {/* Tooltip & Legend */}
                            <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: 'oklch(var(--accent))' }}
                            />
                            <Legend 
                                content={<CustomLegend />}
                                wrapperStyle={{ paddingTop: '10px' }}
                            />
                            
                            {/* Bar pemasukan (positif) */}
                            <Bar 
                                dataKey="Pemasukan" 
                                fill="oklch(var(--secondary))" 
                                name="Pemasukan"
                                radius={[2, 2, 0, 0]}
                            />
                            
                            {/* Bar pengeluaran (negatif → kebawah) */}
                            <Bar 
                                dataKey="Pengeluaran" 
                                fill="oklch(var(--destructive))" 
                                name="Pengeluaran"
                                radius={[0, 0, 2, 2]}
                            />
                            
                            {/* Garis kas tersedia */}
                            <Line 
                                type="monotone" 
                                dataKey="Kas Tersedia" 
                                stroke="oklch(var(--primary))" 
                                strokeWidth={2}
                                name="Kas Tersedia"
                                dot={{ fill: 'oklch(var(--primary))', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: 'oklch(var(--primary))', strokeWidth: 2 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
