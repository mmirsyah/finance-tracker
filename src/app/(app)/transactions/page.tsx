// src/app/(app)/transactions/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import ImportTransactionModal from '@/components/modals/ImportTransactionModal';

export default function TransactionsPage() {
  const router = useRouter();
  const { accounts, categories, isLoading: isAppDataLoading, user, handleOpenModalForEdit } = useAppData();
  const [transactionVersion, setTransactionVersion] = useState(0); 
  const [isListLoading, setIsListLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  
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

  useEffect(() => {
    if (date?.from) { setFilterStartDate(format(date.from, 'yyyy-MM-dd')); } else { setFilterStartDate(''); }
    if (date?.to) { setFilterEndDate(format(date.to, 'yyyy-MM-dd')); } 
    else { if (date?.from) { setFilterEndDate(format(date.from, 'yyyy-MM-dd')); } else { setFilterEndDate(''); } }
  }, [date]);

  useEffect(() => {
    if (!isAppDataLoading && !user) {
      router.push('/login');
    }
  }, [isAppDataLoading, user, router]);

  const handleTransactionChange = () => { setTransactionVersion(v => v + 1); setIsListLoading(true); };

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

  const filters = useMemo(() => ({ filterType, filterCategory, filterAccount, filterStartDate, filterEndDate, }), 
    [filterType, filterCategory, filterAccount, filterStartDate, filterEndDate]);
  
  if (isAppDataLoading || !date) { return <div className="p-6"><TransactionListSkeleton /></div>; }
  if (!user) { return null; }

  return (
    <>
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
              onOpenImportModal={() => setIsImportModalOpen(true)}
            />
            {isListLoading && <TransactionListSkeleton />}
            <div style={{ display: isListLoading ? 'none' : 'block' }}>
              <TransactionList 
                key={transactionVersion} 
                userId={user.id} 
                startEdit={handleOpenModalForEdit} 
                filters={filters}
                onDataLoaded={() => setIsListLoading(false)}
                onTransactionChange={handleTransactionChange}
              />
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
              <TransactionSummary 
                  userId={user.id} 
                  startDate={filterStartDate}
                  endDate={filterEndDate}
              />
          </div>
        </div>
      </div>
      
      <ImportTransactionModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </>
  )
}