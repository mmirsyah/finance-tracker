// src/components/CategoryCombobox.tsx

"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Category } from "@/types";

interface CategoryComboboxProps {
  allCategories: Category[];
  value: string; // The selected category ID (as a string for the form)
  onChange: (value: string) => void;
}

export function CategoryCombobox({ allCategories, value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // --- LOGIKA BARU UNTUK MENYARING & MENGELOMPOKKAN KATEGORI ---
  const categoryOptions = React.useMemo(() => {
    // 1. Cari tahu dulu ID semua kategori yang merupakan induk
    const parentIds = new Set(allCategories.map(c => c.parent_id).filter(Boolean));

    // 2. Buat daftar kategori yang bisa dipilih (bukan induk)
    const selectableCategories = allCategories.filter(c => !parentIds.has(c.id));
    
    // 3. Kelompokkan berdasarkan induknya
    const grouped: { [key: string]: Category[] } = {};
    selectableCategories.forEach(cat => {
      if (cat.parent_id) {
        const parent = allCategories.find(p => p.id === cat.parent_id);
        if (parent) {
          if (!grouped[parent.name]) {
            grouped[parent.name] = [];
          }
          grouped[parent.name].push(cat);
        }
      } else {
        // Untuk kategori level atas yang tidak punya anak
        if (!grouped['Top Level']) {
          grouped['Top Level'] = [];
        }
        grouped['Top Level'].push(cat);
      }
    });

    return grouped;
  }, [allCategories]);

  const selectedCategoryName = allCategories.find(c => c.id.toString() === value)?.name || "Select category...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{selectedCategoryName}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandEmpty>No category found.</CommandEmpty>
          <CommandList>
            {Object.entries(categoryOptions).map(([groupName, categories]) => (
              <CommandGroup key={groupName} heading={groupName === 'Top Level' ? undefined : groupName}>
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name} // Search by name
                    onSelect={() => {
                      onChange(category.id.toString());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}