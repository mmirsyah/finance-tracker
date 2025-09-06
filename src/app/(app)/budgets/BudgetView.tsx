'use client';

import { useState, useEffect, useMemo } from 'react';
import { BudgetHeader } from '@/components/budget/BudgetHeader';
import { getBudgetDataForPeriod, saveBudgetAssignment } from '@/lib/budgetService';
import { useAppData } from '@/contexts/AppDataContext';
import { getCustomPeriod } from '@/lib/periodUtils';
import { BudgetPageData } from '@/types';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';
import { BudgetList } from '@/components/budget/BudgetList';
import { BudgetSkeleton } from '@/components/budget/BudgetSkeleton';
import { cn } from '@/lib/utils';

// Utility untuk format mata uang
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    value = 0;
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const BudgetView = () => {
  const { householdId, profile } = useAppData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [data, setData] = useState<BudgetPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(Date.now()); // Untuk me-refresh data

  const { period } = useMemo(() => {
    if (!profile) return { period: null };
    const startDay = profile.period_start_day || 1;
    const p = getCustomPeriod(startDay, currentMonth);
    return {
      period: p,
    };
  }, [profile, currentMonth]);

  useEffect(() => {
    if (!householdId || !period) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const budgetData = await getBudgetDataForPeriod(householdId, period.from, period.to);
        setData(budgetData);
      } catch (error) {
        console.error('Failed to fetch budget data:', error);
        toast.error('Gagal memuat data anggaran.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [householdId, period, key]);

  const handleAssignmentChange = useDebouncedCallback(
    async (categoryId: number, assignedAmount: number) => {
      if (!householdId || !period) return;

      try {
        await saveBudgetAssignment({
          household_id: householdId,
          category_id: categoryId,
          month: format(period.from, 'yyyy-MM-dd'),
          assigned_amount: assignedAmount,
        });
        toast.success('Alokasi anggaran berhasil disimpan.');
        // Refresh data untuk menampilkan perubahan
        setKey(Date.now());
      } catch (error) {
        console.error('Failed to save assignment:', error);
        toast.error('Gagal menyimpan alokasi.');
      }
    },
    1000
  );

  const handleRefresh = () => {
    setKey(Date.now());
  };

  const toBeBudgeted = (data?.total_income || 0) - (data?.total_budgeted || 0);

  // LOGIKA BARU: Menyimpan status warna DAN pesan yang dipersonalisasi
  const budgetStatus = useMemo(() => {
    if (toBeBudgeted < 0) {
      return {
        color: 'text-destructive', // Merah
        message: 'Oops! Alokasi Anda minus. Perlu penyesuaian.'
      };
    }
    if (toBeBudgeted > 0) {
      return {
        color: 'text-warning', // Hijau
        message: 'Masih ada dana yang perlu diberi tugas.'
      };
    }
    // Default (jika === 0)
    return {
      color: 'text-gray-500', // Abu-abu netral
      message: 'Kerja bagus! Setiap rupiah sudah punya tugas.'
    };
  }, [toBeBudgeted]);


  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto overflow-x-hidden">
      <BudgetHeader
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        householdId={householdId || ''}
        onSyncComplete={handleRefresh}
      />

      {/* --- KARTU "READY TO ASSIGN" YANG DIPERBARUI --- */}
      <div className="sticky top-0 z-10 py-3 bg-background/90 backdrop-blur-sm mb-4">
        {/* Tetap menggunakan w-fit agar rata kiri dan pas dengan konten */}
        <div className="bg-white p-3 rounded-lg shadow-md border w-fit">
          {/* PERUBAHAN LAYOUT: 
            Menggunakan flex-col (kolom vertikal) dan menghapus justify-between.
            Items-start membuat semua teks rata kiri dalam kolom.
          */}
          <div className="flex flex-col items-start">
            <h3 className="text-sm font-medium text-gray-500 tracking-wider uppercase">
              Siap Dialokasikan
            </h3>
            
            <p className={cn("text-2xl font-bold", budgetStatus.color)}>
              {formatCurrency(toBeBudgeted)}
            </p>

            {/* PESAN BARU YANG DIPERSONALISASI: 
              Ditampilkan di bawah nominal dengan warna yang sesuai.
            */}
            <p className={cn("text-xs font-medium mt-1", budgetStatus.color)}>
              {budgetStatus.message}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <BudgetSkeleton />
      ) : data && data.categories.length > 0 ? (
        <BudgetList 
          data={data.categories} 
          onAssignmentChange={handleAssignmentChange}
          onRefresh={handleRefresh}
          currentPeriodStart={period!.from}
        />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
          <h3 className="text-lg font-medium">Tidak Ada Data Anggaran</h3>
          <p className="text-sm text-gray-500 mt-2">Belum ada kategori atau data untuk periode ini.</p>
        </div>
      )}
    </div>
  );
};

export default BudgetView;