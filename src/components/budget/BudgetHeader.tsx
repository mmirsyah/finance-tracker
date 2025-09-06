// src/components/budget/BudgetHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import { BudgetPeriodNavigator } from './BudgetPeriodNavigator';
import { createClient } from '@/utils/supabase/client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { getCustomPeriod } from '@/lib/periodUtils';
import { useAppData } from '@/contexts/AppDataContext';

interface BudgetHeaderProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  householdId: string;
  onSyncComplete: () => void;
}

export function BudgetHeader({
  currentMonth,
  setCurrentMonth,
  householdId,
  onSyncComplete,
}: BudgetHeaderProps) {
  const supabase = createClient();
  const { profile } = useAppData();
  const [isSyncing, setIsSyncing] = useState(false);

  // ... (semua logika useMemo dan handler Anda tetap sama, tidak perlu diubah) ...
  const { periodDisplayText } = useMemo(() => {
    if (!profile || !currentMonth) {
      return { periodDisplayText: 'Memuat...' };
    }
    const startDay = profile.period_start_day || 1;
    const period = getCustomPeriod(startDay, currentMonth);
    return {
      periodDisplayText: `${format(period.from, 'd MMM', { locale: indonesiaLocale })} - ${format(period.to, 'd MMM yyyy', { locale: indonesiaLocale })}`
    };
  }, [profile, currentMonth]);

  const handlePeriodChange = (direction: 'next' | 'prev') => {
    if (!currentMonth) return;
    const newDate = direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
    setCurrentMonth(newDate);
  };

  const handleSyncRollover = async () => {
    if (!householdId) {
      toast.error('Household ID tidak ditemukan.');
      return;
    }
    setIsSyncing(true);
    
    const monthAnchor = format(currentMonth, 'yyyy-MM-dd');

    const { error } = await supabase.rpc('update_rollover_for_period', {
      p_household_id: householdId,
      p_current_month_ref_date: monthAnchor,
    });

    setIsSyncing(false);

    if (error) {
      console.error('Error syncing rollover:', error);
      toast.error('Gagal menyinkronkan data rollover.', {
        description: error.message,
      });
    } else {
      toast.success('Data rollover berhasil disinkronkan!', {
        description: 'Data budget Anda telah diperbarui.',
      });
      onSyncComplete();
    }
  };

  return (
    // Div utama ini sudah benar (tumpuk di seluler, baris di desktop)
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border">
      <h1 className="text-2xl font-semibold text-gray-900">Anggaran Bulanan</h1>
      
      {/* FIX: Kita kembalikan ke "flex items-center gap-2" yang sederhana.
        Ini hanya mengelompokkan 2 item (Tombol & Nav) bersama-sama.
        Div induk (di atas) akan menangani pemosisian (tengah di seluler, kanan di desktop).
        Ini akan bekerja sekarang KARENA navigator sudah fleksibel.
      */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={handleSyncRollover} 
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 sm:mr-2" />
          )}
          
          <span className="hidden sm:inline">
            Sinkronkan Rollover
          </span>
        </Button>
        <BudgetPeriodNavigator
          periodText={periodDisplayText}
          onPrev={() => handlePeriodChange('prev')}
          onNext={() => handlePeriodChange('next')}
        />
      </div>
    </div>
  );
}