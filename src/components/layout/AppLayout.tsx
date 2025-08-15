// src/components/layout/AppLayout.tsx
"use client";

import { useState, useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/navigation'; // Import useRouter
import Sidebar from './Sidebar';
import Header from './Header';
import { AppDataProvider, useAppData } from '@/contexts/AppDataContext';
import { Plus } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner'; // Import LoadingSpinner

// Komponen ini menjadi "consumer" dan "gatekeeper"
const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  
  // Ambil state yang dibutuhkan dari context
  const { handleOpenModalForCreate, isLoading, user } = useAppData();

  // Efek untuk menjaga otentikasi
  useEffect(() => {
    // Hanya lakukan pengecekan JIKA loading sudah selesai
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // --- LOGIKA UTAMA ---
  // Jika masih loading, tampilkan spinner layar penuh
  if (isLoading) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  // Jika sudah tidak loading dan ada user, tampilkan layout aplikasi
  if (user) {
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
      </div>
    );
  }
  
  // Jika tidak loading dan tidak ada user, return null (karena sudah di-redirect)
  return null;
}

// Komponen induk hanya membungkus dengan provider
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AppDataProvider>
  );
}