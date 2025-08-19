// src/components/TransactionToolbar.tsx
"use client";

import { DateRange } from 'react-day-picker';
import { DateRangePicker } from './DateRangePicker';
import { FilterPopover } from './FilterPopover';
import { Category, Account } from '@/types';
import { Button } from './ui/button';
import { Upload, PlusSquare } from 'lucide-react';
import Link from 'next/link';

interface TransactionToolbarProps {
  dateRange: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  filterType: string; setFilterType: (value: string) => void;
  filterCategory: string; setFilterCategory: (value: string) => void;
  filterAccount: string; setFilterAccount: (value: string) => void;
  categories: Category[]; accounts: Account[]; onResetFilters: () => void;
  onOpenImportModal: () => void;
}

export default function TransactionToolbar({ 
  dateRange, onDateChange,
  filterType, setFilterType,
  filterCategory, setFilterCategory, filterAccount, setFilterAccount,
  categories, accounts, onResetFilters, onOpenImportModal
}: TransactionToolbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-4 sm:p-6 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 border-b border-gray-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Transactions</h1>
        <div className="flex items-center gap-2">
          <Link href="/transactions/bulk-add" passHref>
            <Button variant="outline">
                <PlusSquare className="mr-2 h-4 w-4" /> Input Massal
            </Button>
          </Link>
          
          <Button variant="outline" onClick={onOpenImportModal}>
            <Upload className="mr-2 h-4 w-4" /> Impor
          </Button>

          <DateRangePicker 
            initialDate={dateRange} 
            onUpdate={({ range }) => onDateChange(range)} 
          />
          <FilterPopover 
            filterType={filterType} 
            setFilterType={setFilterType} 
            filterCategory={filterCategory} 
            setFilterCategory={setFilterCategory} 
            filterAccount={filterAccount} 
            setFilterAccount={setFilterAccount} 
            categories={categories} 
            accounts={accounts} 
            onResetFilters={onResetFilters} 
          />
        </div>
      </div>
    </div>
  );
}