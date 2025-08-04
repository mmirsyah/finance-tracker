// src/components/layout/AppLayout.tsx

"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header'; // Menggunakan Header universal

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Secara default, sidebar terbuka di desktop dan tertutup di mobile.
  // Kita akan gunakan state untuk mengontrolnya.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
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
  );
}