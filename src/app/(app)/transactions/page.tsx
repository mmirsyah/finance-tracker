// src/app/(app)/transactions/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import TransactionSummary from '@/components/transaction/TransactionSummary';
import TransactionList from '@/components/TransactionList';
import TransactionToolbar from '@/components/TransactionToolbar';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import TransactionListSkeleton from '@/components/skeletons/TransactionListSkeleton';
import { supabase } from '@/lib/supabase';
import { getCustomPeriod } from '@/lib/periodUtils';

export default function TransactionsPage() {
  const router = useRouter();
  const { accounts, categories, isLoading: isAppDataLoading, user, dataVersion, handleOpenModalForEdit, handleOpenImportModal } = useAppData();
  const [isListLoading, setIsListLoading] = useState(true);

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');

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

  const { filterStartDate, filterEndDate } = useMemo(() => {
    const from = date?.from ? format(date.from, 'yyyy-MM-dd') : '';
    const to = date?.to ? format(date.to, 'yyyy-MM-dd') : (date?.from ? format(date.from, 'yyyy-MM-dd') : '');
    return { filterStartDate: from, filterEndDate: to };
  }, [date]);

  useEffect(() => {
    if (!isAppDataLoading && !user) {
      router.push('/login');
    }
  }, [isAppDataLoading, user, router]);

  const handleDataLoaded = useCallback(() => {
    setIsListLoading(false);
  }, []);

  const onResetFilters = () => {
    setFilterType(''); setFilterCategory(''); setFilterAccount('');
    const fetchProfileAndSetDate = async () => {
        if(user) {
            const { data: profile } = await supabase.from('profiles').select('period_start_day').eq('id', user.id).single();
            const startDay = profile?.period_start_day || 1;
            setDate(getCustomPeriod(startDay));
        }
    };
    fetchProfileAndSetDate();
  };

  // Pemicu fetch ulang sekarang adalah 'dataVersion' dari context
  const filters = useMemo(() => ({ filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, transactionVersion: dataVersion }),
    [filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, dataVersion]);

  // Setiap kali dataVersion berubah, set list ke loading
  useEffect(() => {
    setIsListLoading(true);
  }, [dataVersion]);

  if (isAppDataLoading || !date) { return <div className="p-6"><TransactionListSkeleton /></div>; }
  if (!user) { return null; }

  return (
      <div className="p-4 sm:p-6 w-full h-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <TransactionToolbar
              dateRange={date} setDateRange={setDate}
              filterType={filterType} setFilterType={setFilterType}
              filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              filterAccount={filterAccount} setFilterAccount={setFilterAccount}
              categories={categories}
              accounts={accounts}
              onResetFilters={onResetFilters}
              onOpenImportModal={handleOpenImportModal}
            />
            {isListLoading && <TransactionListSkeleton />}
            <div style={{ display: isListLoading ? 'none' : 'block' }}>
              <TransactionList
                startEdit={handleOpenModalForEdit}
                filters={filters}
                onDataLoaded={handleDataLoaded}
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
              <TransactionSummary
                  startDate={filterStartDate}
                  endDate={filterEndDate}
              />
          </div>
        </div>
      </div>
  )
}