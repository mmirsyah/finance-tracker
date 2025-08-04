// src/components/layout/Header.tsx

"use client";

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    // Header ini sekarang tidak lagi disembunyikan di layar besar
    <header className="sticky top-0 bg-white/75 backdrop-blur-sm border-b border-gray-200 z-30">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Tombol Hamburger Menu (selalu terlihat) */}
        <button
          className="p-2 text-gray-500 hover:text-gray-800"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open/Close sidebar</span>
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Bisa kita tambahkan elemen lain di sini nanti, seperti search global atau profil user */}
      </div>
    </header>
  );
}