// src/components/layout/AppLayout.tsx

"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { AppDataProvider } from '@/contexts/AppDataContext'; // <-- 1. Import provider

export default function AppLayout({ children }: { children: React.ReactNode }) {

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // 2. Bungkus semua dengan AppDataProvider
    <AppDataProvider>
      <div className="relative h-screen flex overflow-hidden bg-gray-100">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        {/* Area Konten Utama */}
        <div className="flex-1 flex flex-col">
          {/* Header Universal */}
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          {/* Konten Halaman yang bisa di-scroll */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AppDataProvider>
  );
}
