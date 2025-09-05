"use client";

import dynamic from 'next/dynamic';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import LoadingSpinner from '../LoadingSpinner';

// Dynamically import the components to enable code-splitting and lazy loading.
// This means the code for the desktop modal won't be downloaded on mobile, and vice-versa.

const TransactionModalDesktop = dynamic(() => 
    import('./TransactionModalDesktop').then(mod => mod.TransactionModalDesktop), 
    { 
        ssr: false, 
        loading: () => <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><LoadingSpinner /></div> 
    }
);

const TransactionModalMobile = dynamic(() => 
    import('./TransactionModalMobile').then(mod => mod.TransactionModalMobile), 
    { 
        ssr: false, 
        loading: () => <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><LoadingSpinner /></div>
    }
);

// Define the props for the main modal wrapper.
// It will accept the return value of the useTransactionModal hook.
type TransactionModalProps = ReturnType<typeof useTransactionModal>;

export default function TransactionModal(props: TransactionModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Do not render anything if the modal is not open.
  if (!props.isOpen) return null;

  if (isDesktop) {
    return <TransactionModalDesktop {...props} />;
  }

  return <TransactionModalMobile {...props} />;
}
