// src/components/layout/Header.tsx
"use client";

import { Menu, Plus, PlusSquare, Upload, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { handleOpenModalForCreate, handleOpenImportModal } = useAppData();

  // --- PERBAIKAN UTAMA: Bungkus pemanggilan modal dengan setTimeout ---
  const triggerSingleTransactionModal = () => setTimeout(handleOpenModalForCreate, 0);
  const triggerBulkInputPage = () => router.push('/transactions/bulk-add');
  const triggerImportModal = () => setTimeout(handleOpenImportModal, 0);


  return (
    <header className="sticky top-0 bg-card backdrop-blur-sm border-b border-background z-30 shadow-md">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button className="p-4 text-foreground hover:text-gray-800 hover:bg-gray-200 rounded-full" onClick={onMenuClick}>
          <span className="sr-only">Open/Close sidebar</span>
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="hidden sm:flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="pl-4 pr-2">
                        <Plus size={18} className="mr-2"/>
                        <span>Add Transaction</span>
                        <span className="border-l border-blue-500 h-4 mx-2"></span>
                        <ChevronDown size={16} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {/* Gunakan onSelect agar dropdown tertutup sebelum aksi dijalankan */}
                    <DropdownMenuItem onSelect={triggerSingleTransactionModal} className="cursor-pointer">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Single Transaction</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={triggerBulkInputPage} className="cursor-pointer">
                        <PlusSquare className="mr-2 h-4 w-4" />
                        <span>Bulk Input</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={triggerImportModal} className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        <span>Import from CSV</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  );
}