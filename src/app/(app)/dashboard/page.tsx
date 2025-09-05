'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import SpendingByCategory from '@/components/dashboard/SpendingByCategory';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import BudgetQuickView from '@/components/dashboard/BudgetQuickView';
import PendingRecurringWidget from '@/components/dashboard/PendingRecurringWidget';
import { DateRangePicker } from '@/components/DateRangePicker';
import RecurringConfirmModal from '@/components/modals/RecurringConfirmModal';
import { RecurringInstance } from '@/types';
import { supabase } from '@/lib/supabase';
import { getCustomPeriod } from '@/lib/periodUtils';

function Dashboard() {
  const { isLoading, accounts, categories, refetchData, user } = useAppData();
  
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<RecurringInstance | null>(null);

  useEffect(() => {
    if (user && !date) {
      const fetchProfileAndSetDate = async () => {
        const { data: profile } = await supabase.from('profiles').select('period_start_day').eq('id', user.id).single();
        const startDay = profile?.period_start_day || 1;
        setDate(getCustomPeriod(startDay));
      };
      fetchProfileAndSetDate();
    }
  }, [user, date]);

  const handleInstanceClick = (instance: RecurringInstance) => {
    setSelectedInstance(instance);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInstance(null);
  };

  const handleConfirm = () => {
    handleCloseModal();
    refetchData(); // Refresh data after confirmation
  };

  if (isLoading || !date) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <DateRangePicker onUpdate={({ range }) => setDate(range)} initialDate={date} />
        </div>
        <div className="grid grid-cols-12 gap-6">
          {/* PRIORITAS 1 & 2 (Mobile): Ringkasan Anggaran & Aksi Mendesak.
              Di desktop, kita letakkan keduanya berdampingan di baris pertama.
          */}
          <div className="col-span-12 lg:col-span-7 budget-quick-view">
            <BudgetQuickView dateRange={date} />
          </div>
          <div className="col-span-12 lg:col-span-5 pending-recurring">
            <PendingRecurringWidget onInstanceClick={handleInstanceClick} />
          </div>

          {/* PRIORITAS 3 (Mobile): Transaksi Terbaru.
              Di desktop, kita berikan lebar penuh agar tabel mudah dibaca.
          */}
          <div className="col-span-12 recent-transactions">
            <RecentTransactions />
          </div>

          {/* PRIORITAS 4 & 5 (Mobile): Grafik dan Analisis.
              Di desktop, keduanya berbagi tempat di baris terakhir, seperti sebelumnya.
          */}
          <div className="col-span-12 lg:col-span-8 cash-flow-chart">
            <CashFlowChart dateRange={date} />
          </div>
          <div className="col-span-12 lg:col-span-4 spending-by-category">
            <SpendingByCategory dateRange={date} />
          </div>
        </div>
      </div>
      <RecurringConfirmModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        instance={selectedInstance}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Dashboard />
  );
}
