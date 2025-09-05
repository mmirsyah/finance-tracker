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
import { useAppData } from "@/contexts/AppDataContext"; // Import context

import DynamicIcon from "./DynamicIcon";

interface CategoryComboboxProps {
  allCategories: Category[]; // Ini akan menjadi daftar yang sudah difilter
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCombobox({ allCategories, value, onChange }: CategoryComboboxProps) {
  const { categories: globalCategories } = useAppData(); // Ambil daftar lengkap
  const [open, setOpen] = React.useState(false);

  const categoryOptions = React.useMemo(() => {
    const grouped: { [key: string]: Category[] } = {};
    const parents = allCategories.filter(c => !c.parent_id);
    const children = allCategories.filter(c => c.parent_id);

    parents.forEach(parent => {
      if (!grouped[parent.name]) {
        grouped[parent.name] = [];
      }
      grouped[parent.name].push(parent);
      const parentChildren = children.filter(c => c.parent_id === parent.id);
      grouped[parent.name].push(...parentChildren);
    });
    return grouped;
  }, [allCategories]);

  const selectedCategory = globalCategories.find(c => c.id.toString() === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <div className="flex items-center gap-2">
            {selectedCategory?.icon && <DynamicIcon name={selectedCategory.icon} className="h-4 w-4" />}
            <span className="truncate">{selectedCategory?.name || "Pilih kategori..."}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Cari kategori..." />
          <CommandEmpty>Kategori tidak ditemukan.</CommandEmpty>
          <CommandList>
            {Object.entries(categoryOptions).map(([groupName, categoriesInGroup]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {categoriesInGroup.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name} // Search by name
                    onSelect={() => {
                      onChange(category.id.toString());
                      setOpen(false);
                    }}
                    className={!category.parent_id ? "font-semibold" : "pl-6"}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.icon && <DynamicIcon name={category.icon} className="mr-2 h-4 w-4" />}
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