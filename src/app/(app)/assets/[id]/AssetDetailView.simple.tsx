// src/app/(app)/assets/[id]/AssetDetailView.simple.tsx
"use client";

import { Account, AssetTransaction } from '@/types';

interface AssetDetailViewProps {
  initialAssetAccount: Account;
  initialTransactions: AssetTransaction[];
}

export default function AssetDetailView({ initialAssetAccount, initialTransactions }: AssetDetailViewProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{initialAssetAccount.name}</h1>
      <p>Asset Detail View - Simplified for testing</p>
      <p>Transactions: {initialTransactions.length}</p>
    </div>
  );
}