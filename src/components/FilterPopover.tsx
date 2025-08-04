// src/components/FilterPopover.tsx

"use client";

import { useMemo } from "react"; // Kita butuh useMemo untuk efisiensi
import { Category, Account } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ListFilter } from "lucide-react";

interface FilterPopoverProps {
  filterType: string;
  setFilterType: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterAccount: string;
  setFilterAccount: (value: string) => void;
  categories: Category[];
  accounts: Account[];
  onResetFilters: () => void;
}

export function FilterPopover({
  filterType,
  setFilterType,
  filterCategory,
  setFilterCategory,
  filterAccount,
  setFilterAccount,
  categories,
  accounts,
  onResetFilters,
}: FilterPopoverProps) {

  // --- LOGIKA KECERDASAN DIMULAI DI SINI ---
  const filteredCategories = useMemo(() => {
    // Jika tidak ada tipe yang dipilih, tampilkan semua kategori
    if (!filterType) {
      return categories;
    }
    // Jika ada tipe yang dipilih, saring kategori berdasarkan tipe tersebut
    return categories.filter((cat) => cat.type === filterType);
  }, [categories, filterType]); // Jalankan ulang hanya jika daftar kategori atau filter tipe berubah
  // --- LOGIKA KECERDASAN SELESAI ---

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="p-2 h-auto" aria-label="Open filters">
          <ListFilter size={20} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Filters</h4>
            <p className="text-sm text-muted-foreground">
              Filter your transactions.
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="filter-type" className="text-sm font-medium">Type</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                // Bonus: Reset filter kategori saat tipe berubah agar tidak 'nyangkut'
                setFilterCategory(''); 
              }}
              className="w-full p-2 border rounded-md bg-transparent"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="filter-category" className="text-sm font-medium">Category</label>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-2 border rounded-md bg-transparent"
            >
              <option value="">All Categories</option>
              {/* Kita gunakan daftar kategori yang sudah disaring */}
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="filter-account" className="text-sm font-medium">Account</label>
            <select
              id="filter-account"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full p-2 border rounded-md bg-transparent"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={onResetFilters} variant="ghost">Reset Filters</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}