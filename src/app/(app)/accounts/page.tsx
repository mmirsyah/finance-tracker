// src/app/accounts/page.tsx

import { Suspense } from 'react';
import AccountsView from './AccountsView';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AccountsPage() {
  
  return (
    <Suspense fallback={<LoadingSpinner text="Loading accounts page..." />}>
      <AccountsView />
    </Suspense>
  );
}