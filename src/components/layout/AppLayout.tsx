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
import { Plus, PlusSquare, Upload } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import the new wrapper modal
import TransactionModal from '@/components/transaction/TransactionModal';
import ImportTransactionModal from '@/components/modals/ImportTransactionModal';


const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const isDesktop = useIsDesktop();
  
  const initialContext = useAppData();
  const { isLoading, user } = initialContext;
  
  // All modal logic is now encapsulated in the hook
  const transactionModal = useTransactionModal();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

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
        <div className="relative h-screen flex overflow-hidden bg-background">
          {/* Desktop Sidebar */}
          {isDesktop && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
          
          <div className="flex-1 flex flex-col">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className={cn(
              "flex-1 overflow-y-auto",
              !isDesktop && "pb-24" // Add bottom padding for mobile navigation
            )}>
              {children}
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          {!isDesktop && <BottomNavigation />}

          {/* FAB - positioned differently for desktop and mobile */}
          {!isDesktop && (
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-3">
              <div className={cn("flex flex-row items-center gap-3 transition-all duration-300 ease-in-out", isFabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
                  <Button variant="secondary" className="rounded-full h-12 w-12 shadow-lg" aria-label="Import from CSV" onClick={() => { handleOpenImportModal(); setIsFabOpen(false); }}>
                      <Upload size={20} />
                  </Button>
                  <Button variant="secondary" className="rounded-full h-12 w-12 shadow-lg" aria-label="Bulk Input" onClick={() => { router.push('/transactions/bulk-add'); setIsFabOpen(false); }}>
                      <PlusSquare size={20} />
                  </Button>
                  <Button variant="secondary" className="rounded-full h-12 w-12 shadow-lg" aria-label="Add Single Transaction" onClick={() => { transactionModal.handleOpenForCreate(); setIsFabOpen(false); }}>
                      <Plus size={20} />
                  </Button>
              </div>
              <Button onClick={() => setIsFabOpen(!isFabOpen)} className={cn("bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 h-16 w-16 shadow-lg transition-transform duration-300 ease-in-out", isFabOpen && "rotate-45 bg-destructive hover:bg-destructive/90")} aria-label="Add Transaction Menu">
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