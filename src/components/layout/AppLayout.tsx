// src/components/layout/AppLayout.tsx

"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { AppDataProvider, useAppData } from '@/contexts/AppDataContext';
import { Plus } from 'lucide-react';

// Komponen ini menjadi "consumer" murni
const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Ambil fungsi yang dibutuhkan dari context
  const { handleOpenModalForCreate } = useAppData();

  return (
    <div className="relative h-screen flex overflow-hidden bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          onAddTransactionClick={handleOpenModalForCreate}
        />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <button
        onClick={handleOpenModalForCreate}
        className="sm:hidden fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-40"
        aria-label="Add Transaction"
      >
        <Plus size={24} />
      </button>
      
      {/* Modal tidak lagi dirender di sini */}
    </div>
  );
}

// Komponen induk hanya membungkus dengan provider
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AppDataProvider>
  );
}