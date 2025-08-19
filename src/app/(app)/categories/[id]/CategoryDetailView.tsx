// src/app/(app)/categories/[id]/CategoryDetailView.tsx
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Category } from '@/types';
import { getCategoryAnalytics } from '@/lib/categoryService';
import { useAppData } from '@/contexts/AppDataContext';
import { DateRangePicker } from '@/components/DateRangePicker';
import CategoryModal from '@/components/modals/CategoryModal';
import { toast } from 'sonner';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import { formatCurrency } from '@/lib/utils';
import { DonutChart } from '@tremor/react';

// --- PERBAIKAN: Menghapus initialTransactions dari props ---
interface CategoryDetailViewProps {
  initialCategory: Category;
}

const StatCard = ({ title, value, change, changeType }: { title: string, value: string, change?: string, changeType?: 'increase' | 'decrease' | 'neutral' }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {change && (
                <p className={`text-xs ${changeType === 'increase' ? 'text-red-500' : 'text-green-500'}`}>
                    {change} vs periode sebelumnya
                </p>
            )}
        </CardContent>
    </Card>
);

export default function CategoryDetailView({ initialCategory }: CategoryDetailViewProps) {
  const router = useRouter();
  const { householdId, refetchData, categories } = useAppData();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const { data, isLoading } = useSWR(
    (householdId && date?.from && date?.to) ? ['categoryAnalytics', initialCategory.id, date] : null,
    () => getCategoryAnalytics(householdId!, initialCategory.id, date!.from!, date!.to!)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleSaveCategory = () => {
    toast.success("Kategori berhasil diperbarui!");
    refetchData();
    setIsModalOpen(false);
  };
  
  const handleDeleteCategory = () => {
    toast.success("Kategori berhasil dihapus!");
    router.push('/categories');
    refetchData();
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };
  
  const parentCategories = useMemo(() => {
    return categories.filter(c => c.parent_id === null && c.id !== initialCategory.id);
  }, [categories, initialCategory.id]);

  if (isLoading) {
    return <ReportSkeleton />;
  }
  
  const changeType = (data && data.current_period_total > data.previous_period_total) ? 'increase' : 'decrease';
  
  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/categories')}><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h1 className="text-3xl font-bold">{initialCategory.name}</h1>
                    <p className="text-muted-foreground">Analisis detail untuk kategori ini.</p>
                </div>
            </div>
            <div className="flex gap-2 self-start md:self-center">
                <DateRangePicker onUpdate={({ range }) => setDate(range)} initialDate={date} />
                <Button variant="outline" onClick={() => setIsModalOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                <Button variant="destructive" onClick={handleDeleteCategory}><Trash2 className="mr-2 h-4 w-4"/> Hapus</Button>
            </div>
        </div>

        {data ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Total Pengeluaran" 
                        value={formatCurrency(data.current_period_total)}
                        change={calculateChange(data.current_period_total, data.previous_period_total)}
                        changeType={changeType}
                    />
                    <StatCard 
                        title="Rata-rata 6 Bulan" 
                        value={formatCurrency(data.period_average)}
                    />
                    <StatCard 
                        title="% dari Total" 
                        value={`${data.percentage_of_total.toFixed(1)}%`}
                    />
                    <StatCard 
                        title="Pengeluaran Periode Lalu" 
                        value={formatCurrency(data.previous_period_total)}
                    />
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Rincian Sub-kategori</CardTitle>
                        <CardDescription>
                            Distribusi pengeluaran di dalam kategori {initialCategory.name} pada periode yang dipilih.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        {data.sub_category_spending.length > 0 ? (
                            <DonutChart
                                data={data.sub_category_spending}
                                category="value"
                                index="name"
                                valueFormatter={formatCurrency}
                                className="h-80"
                            />
                        ) : (
                            <div className="h-80 flex items-center justify-center text-muted-foreground">
                                Tidak ada rincian sub-kategori untuk periode ini.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        ) : (
            <div className="text-center py-16 text-gray-500">
                Pilih rentang tanggal untuk melihat data analisis.
            </div>
        )}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCategory}
        category={initialCategory}
        parentCategories={parentCategories}
      />
    </>
  );
}