// src/components/layout/SearchBar.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { useDebouncedCallback } from 'use-debounce';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsDesktop } from '@/hooks/useMediaQuery';

interface SearchResult {
  id: string;
  note: string | null;
  category: string | null;
  account: string | null;
  amount: number;
  date: string;
  type: 'expense' | 'income' | 'transfer';
}

export default function SearchBar() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { transactions, categories, accounts } = useAppData();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedCallback(setSearchTerm, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map categories and accounts for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach(category => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach(account => {
      map.set(account.id, account.name);
    });
    return map;
  }, [accounts]);

  // Filter transactions based on search term
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const term = searchTerm.toLowerCase();
    const results: SearchResult[] = [];

    transactions.forEach(transaction => {
      // Check note
      const matchesNote = transaction.note && transaction.note.toLowerCase().includes(term);
      
      // Check category
      const categoryName = categoryMap.get(transaction.category || 0) || '';
      const matchesCategory = categoryName.toLowerCase().includes(term);
      
      // Check accounts
      const fromAccountName = accountMap.get(transaction.account_id) || '';
      const toAccountName = (transaction.to_account_id && accountMap.get(transaction.to_account_id)) || '';
      const matchesAccount = fromAccountName.toLowerCase().includes(term) || toAccountName.toLowerCase().includes(term);
      
      // Check amount
      const matchesAmount = transaction.amount.toString().includes(term);

      if (matchesNote || matchesCategory || matchesAccount || matchesAmount) {
        results.push({
          id: transaction.id,
          note: transaction.note,
          category: categoryName,
          account: transaction.type === 'transfer' 
            ? `${fromAccountName} → ${toAccountName}` 
            : fromAccountName,
          amount: transaction.amount,
          date: transaction.date,
          type: transaction.type
        });
      }
    });

    // Sort by date (newest first) and limit to 10 results
    return results
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [searchTerm, transactions, categoryMap, accountMap]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Gunakan function callback daripada string
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSelect = useCallback((transactionId: string) => {
    setIsOpen(false);
    setSearchTerm('');
    router.push(`/transactions?txId=${transactionId}`);
  }, [router]);

  const formatCurrency = (value: number, type: string) => {
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    });
    
    const prefix = type === 'expense' ? '-' : type === 'income' ? '+' : '';
    return `${prefix} ${formatter.format(value)}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
  };

  if (!isDesktop) {
    // Mobile: Icon only
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-foreground hover:text-gray-800 hover:bg-gray-200 rounded-full"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Search Dialog */}
        <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTitle className="sr-only">Search Transactions</DialogTitle>
          <div className="flex items-center border-b px-3" data-cmdk-input-wrapper="">
            <CommandInput
              ref={inputRef}
              placeholder="Search transactions by note, category, account, or amount..."
              onValueChange={debouncedSearchTerm}
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
          <CommandList>
            <CommandEmpty>No transactions found.</CommandEmpty>
            {searchResults.length > 0 && (
              <CommandGroup heading={`${searchResults.length} transaction${searchResults.length !== 1 ? 's' : ''} found`}>
                {searchResults.map((transaction) => (
                  <CommandItem
                    key={transaction.id}
                    value={`${transaction.note || ''} ${transaction.category || ''} ${transaction.account || ''} ${transaction.amount}`}
                    onSelect={() => handleSelect(transaction.id)}
                    className="flex flex-col items-start"
                  >
                    <div className="flex w-full justify-between">
                      <span className="font-medium truncate max-w-[70%]">
                        {transaction.note || transaction.category || 'Unnamed Transaction'}
                      </span>
                      <span className={`font-semibold ${transaction.type === 'expense' ? 'text-red-500' : transaction.type === 'income' ? 'text-green-500' : 'text-blue-500'}`}>
                        {formatCurrency(transaction.amount, transaction.type)}
                      </span>
                    </div>
                    <div className="flex w-full text-xs text-muted-foreground mt-1">
                      <span className="truncate max-w-[60%]">
                        {transaction.category} {transaction.account && `• ${transaction.account}`}
                      </span>
                      <span className="ml-auto">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>
      </>
    );
  }

  // Desktop: Full search bar
  return (
    <>
      <div className="flex-1 max-w-2xl mx-4">
        <div 
          className="w-full flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground cursor-text"
          onClick={() => setIsOpen(true)}
        >
          <span>Search transactions...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">Ctrl</span>K
          </kbd>
        </div>
      </div>

      {/* Search Dialog */}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTitle className="sr-only">Search Transactions</DialogTitle>
        <div className="flex items-center border-b px-3" data-cmdk-input-wrapper="">
          <CommandInput
            ref={inputRef}
            placeholder="Search transactions by note, category, account, or amount..."
            onValueChange={debouncedSearchTerm}
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>
        <CommandList>
          <CommandEmpty>No transactions found.</CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup heading={`${searchResults.length} transaction${searchResults.length !== 1 ? 's' : ''} found`}>
              {searchResults.map((transaction) => (
                <CommandItem
                  key={transaction.id}
                  value={`${transaction.note || ''} ${transaction.category || ''} ${transaction.account || ''} ${transaction.amount}`}
                  onSelect={() => handleSelect(transaction.id)}
                  className="flex flex-col items-start"
                >
                  <div className="flex w-full justify-between">
                    <span className="font-medium truncate max-w-[70%]">
                      {transaction.note || transaction.category || 'Unnamed Transaction'}
                    </span>
                    <span className={`font-semibold ${transaction.type === 'expense' ? 'text-red-500' : transaction.type === 'income' ? 'text-green-500' : 'text-blue-500'}`}>
                      {formatCurrency(transaction.amount, transaction.type)}
                    </span>
                  </div>
                  <div className="flex w-full text-xs text-muted-foreground mt-1">
                    <span className="truncate max-w-[60%]">
                      {transaction.category} {transaction.account && `• ${transaction.account}`}
                    </span>
                    <span className="ml-auto">
                      {formatDate(transaction.date)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}