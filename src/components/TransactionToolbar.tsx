// src/components/TransactionToolbar.tsx
"use client";

import { DateRange } from 'react-day-picker';
import { DateRangePicker } from './DateRangePicker';
import { FilterPopover } from './FilterPopover';
import { Category, Account } from '@/types';
import { Button } from './ui/button';
import { Upload, PlusSquare, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/lib/haptics';

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
  const isDesktop = useIsDesktop();
  const { triggerHaptic } = useHapticFeedback();

  // Fungsi untuk menangani haptic feedback saat tombol diklik
  const handleButtonClick = (pattern: 'transaction' | 'selection' | 'light' = 'light') => {
    triggerHaptic(pattern);
  };

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 sm:p-6 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 border-b">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href="/transactions/bulk-add" passHref>
            <Button 
              variant="outline" 
              size="sm"
              haptic="transaction"
              onClick={() => handleButtonClick('transaction')}
            >
                <PlusSquare className="mr-2 h-4 w-4" /> Input Massal
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="sm" 
            haptic="light"
            onClick={() => {
              handleButtonClick('light');
              onOpenImportModal();
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> Impor
          </Button>

          {isDesktop ? (
            <DateRangePicker 
              initialDate={dateRange} 
              onUpdate={({ range }) => {
                handleButtonClick('selection');
                onDateChange(range);
              }} 
            />
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={"outline"} 
                  size="sm" 
                  className={cn("w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                  onClick={() => handleButtonClick('selection')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    handleButtonClick('selection');
                    onDateChange(range);
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          )}

          <FilterPopover 
            filterType={filterType} 
            setFilterType={setFilterType} 
            filterCategory={filterCategory} 
            setFilterCategory={(value) => {
              handleButtonClick('selection');
              setFilterCategory(value);
            }} 
            filterAccount={filterAccount} 
            setFilterAccount={(value) => {
              handleButtonClick('selection');
              setFilterAccount(value);
            }} 
            categories={categories} 
            accounts={accounts} 
            onResetFilters={() => {
              handleButtonClick('selection');
              onResetFilters();
            }} 
          />
        </div>
      </div>
    </div>
  );
}
