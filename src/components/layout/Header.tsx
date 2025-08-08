// src/components/layout/Header.tsx

"use client";

import { Menu, Plus } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  // Kita asumsikan onAddTransactionClick akan disediakan oleh AppLayout
  onAddTransactionClick: () => void;
}

export default function Header({ onMenuClick, onAddTransactionClick }: HeaderProps) {
  return (
    
    <header className="sticky top-0 bg-white/75 backdrop-blur-sm border-b border-gray-200 z-30">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Tombol Hamburger Menu */}
        <button
          className="p-2 text-gray-500 hover:text-gray-800"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open/Close sidebar</span>
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Tombol Add Transaction untuk Desktop */}
        {/* 'hidden' di mobile, 'flex' (terlihat) di layar sm ke atas */}
        <button
          onClick={onAddTransactionClick}
          className="hidden sm:flex items-center gap-2 bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow text-sm"
        >
          <Plus size={18} />
          <span>Add Transaction</span>
        </button>
      </div>
    </header>
  );
}