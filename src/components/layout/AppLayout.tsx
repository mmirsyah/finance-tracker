// src/components/layout/AppLayout.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { AppDataContext, AppDataProvider, useAppData } from '@/contexts/AppDataContext';
import { useTransactionModal } from '@/hooks/useTransactionModal'; // Added hook
import { Plus } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast, Toaster } from 'sonner'; // Import Toaster dari sonner

// Import the new wrapper modal
import TransactionModal from '@/components/transaction/TransactionModal';
import ImportTransactionModal from '@/components/modals/ImportTransactionModal';


const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const initialContext = useAppData();
  const { isLoading, user, profile } = initialContext;

  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);
  
  // All modal logic is now encapsulated in the hook
  const transactionModal = useTransactionModal();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleOpenImportModal = useCallback(() => setIsImportModalOpen(true), []);

  // The context now provides the modal handlers directly from our custom hook
  const contextValue = { 
    ...initialContext, 
    handleOpenModalForCreate: transactionModal.handleOpenForCreate, 
    handleOpenModalForEdit: transactionModal.handleOpenForEdit, 
    handleCloseModal: transactionModal.handleClose, 
    handleOpenImportModal 
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Efek untuk menampilkan pesan sambutan hanya sekali per sesi
  useEffect(() => {
    if (user && !isLoading && profile) {
      const hasSeenGreeting = sessionStorage.getItem('hasSeenGreeting');
      if (!hasSeenGreeting) {
        const getGreetingAndMessage = () => {
          const hour = new Date().getHours();
          const userName = profile?.full_name || 'Pengguna';
          
          let greeting = '';
          let message = '';
          
          if (hour >= 5 && hour < 12) {
            // Pagi
            greeting = `Selamat Pagi, ${userName}! 😊`;
            const morningMessages = [
              "Siap taklukkan tujuan finansial hari ini?",
              "Mari mulai hari dengan keputusan keuangan yang cerdas."
            ];
            message = morningMessages[Math.floor(Math.random() * morningMessages.length)];
          } else if (hour >= 12 && hour < 18) {
            // Siang
            greeting = `Selamat Siang, ${userName}! 😊`;
            const afternoonMessages = [
              "Waktunya cek cepat progress budget Anda hari ini.",
              "Sudah setengah hari. Ingat tujuan hemat kita ya!"
            ];
            message = afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
          } else {
            // Malam
            greeting = `Selamat Malam, ${userName}! 😊`;
            const eveningMessages = [
              "Mari review pengeluaran hari ini. Ada yang bisa kita catat?",
              "Waktunya istirahat. Keuangan Anda hari ini aman terkendali."
            ];
            message = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
          }
          
          // Tampilkan pesan sambutan menggunakan Sonner
          toast(greeting, {
            description: message,
            duration: 3500, // Toast akan otomatis hilang setelah 7 detik
            id: 'greeting-toast', // ID unik untuk toast ini
            // priority dihapus karena tidak dikenali
          });
          
          sessionStorage.setItem('hasSeenGreeting', 'true');
        };

        getGreetingAndMessage();
      }
    }
  }, [user, isLoading, profile]);

  if (isLoading) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  if (user) {
    // Filter out the specific account before passing it to the modal
    const filteredAccountsForModal = transactionModal.contextData.accounts.filter(acc => acc.name !== 'Modal Awal Aset');
    const modalProps = {
      ...transactionModal,
      contextData: {
        ...transactionModal.contextData,
        accounts: filteredAccountsForModal,
      }
    };

    return (
      <AppDataContext.Provider value={contextValue}>
        {/* Toaster kedua untuk pesan sambutan dengan posisi top-right */}
        <Toaster position="top-right" />
        <div className="relative h-screen flex overflow-hidden bg-background">
          {/* Desktop Sidebar */}
          {isDesktop && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isDesktop={isDesktop} />}
          
          <div className={cn("flex-1 flex flex-col", { "lg:ml-64": sidebarOpen })}>
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
            <main className={cn(
              "flex-1 overflow-y-auto",
              !isDesktop && "pb-32" // Add bottom padding for mobile navigation
            )}>
              {children}
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          {!isDesktop && <BottomNavigation />}

          {/* FAB - Mobile Only */}
          {!isDesktop && (
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
              <Button 
                onClick={transactionModal.handleOpenForCreate} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 h-16 w-16 shadow-lg" 
                aria-label="Add Transaction"
              >
                <Plus size={28} />
              </Button>
            </div>
          )}
          
          {/* The new, simplified TransactionModal call */}
          <TransactionModal {...modalProps} />

          <ImportTransactionModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
      </AppDataContext.Provider>
    );
  }
  
  return null;
}

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from '@/utils/supabase/client';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <AppDataProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </AppDataProvider>
    </SessionContextProvider>
  );
}