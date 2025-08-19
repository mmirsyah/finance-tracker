// src/app/(app)/reports/AssetsReportTab.tsx
"use client";

import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DonutChart, Legend, BarChart } from '@tremor/react';
import { formatCurrency, cn } from '@/lib/utils';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import SummaryDisplay from '@/components/SummaryDisplay';

export default function AssetsReportTab() {
    const { assets, isLoading } = useAppData();

    if (isLoading) {
        return <ReportSkeleton />;
    }

    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.current_value, 0);
    const assetColors = ["amber", "yellow", "orange", "lime", "stone"];

    const pnlData = assets.map(asset => ({
        name: asset.name,
        "Untung/Rugi": asset.unrealized_pnl,
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <SummaryDisplay 
                      label="Total Nilai Aset" 
                      amount={totalAssetValue} 
                      description="Nilai pasar terkini dari semua aset Anda."
                      isLoading={isLoading}
                    />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alokasi Aset</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center">
                            <DonutChart
                                data={assets}
                                category="current_value"
                                index="name"
                                valueFormatter={formatCurrency}
                                colors={assetColors}
                                showAnimation={true}
                                noDataText="Tidak ada data aset."
                                className="h-40 w-40"
                            />
                            <Legend
                                categories={assets.map(item => item.name)}
                                colors={assetColors}
                                className="max-w-xs mt-4"
                            />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Keuntungan/Kerugian per Aset</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BarChart
                                className="mt-2 h-[220px]"
                                data={pnlData}
                                index="name"
                                categories={["Untung/Rugi"]}
                                colors={["blue"]}
                                valueFormatter={formatCurrency}
                                yAxisWidth={80}
                                noDataText="Tidak ada data."
                                showAnimation={true}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Rincian Aset</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="divide-y divide-gray-200">
                        {assets.length > 0 ? assets
                          .sort((a,b) => b.current_value - a.current_value)
                          .map((asset) => (
                            <li key={asset.account_id} className="py-3 px-1 grid grid-cols-3 md:grid-cols-5 gap-2 items-center">
                                <p className="md:col-span-2 text-sm font-medium text-gray-800">{asset.name}<br/><span className="text-xs text-muted-foreground">{asset.total_quantity} {asset.unit}</span></p>
                                <p className="text-sm font-semibold text-gray-900 text-right">{formatCurrency(asset.current_value)}</p>
                                <p className={cn("text-sm font-semibold text-right", asset.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600")}>
                                    {asset.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(asset.unrealized_pnl)}
                                </p>
                                <p className={cn("text-sm font-semibold text-right", asset.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600")}>
                                    {asset.unrealized_pnl_percent.toFixed(2)}%
                                </p>
                            </li>
                        )) : (
                            <p className="text-center py-16 text-gray-500">Tidak ada data aset.</p>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}