// src/components/modals/ReassignAccountModal.tsx
"use client";

import { useState } from 'react';
import { Account } from '@/types';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReassignAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReassign: (oldAccId: string, newAccId: string) => void;
  accountToDelete: Account | null;
  allAccounts: Account[];
}

export default function ReassignAccountModal({ isOpen, onClose, onReassign, accountToDelete, allAccounts }: ReassignAccountModalProps) {
  const [newAccountId, setNewAccountId] = useState<string>('');

  if (!isOpen || !accountToDelete) return null;

  const validTargetAccounts = allAccounts.filter(acc => acc.id !== accountToDelete.id);

  const handleReassign = () => {
    if (!newAccountId) return toast.error('Please select a new account to reassign transactions to.');
    onReassign(accountToDelete.id, newAccountId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
          <h2 className="text-xl font-bold">Reassign Transactions</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">The account &quot;<strong>{accountToDelete.name}</strong>&quot; has transactions linked to it. To delete it, you must first reassign these transactions to another account.</p>
        <div className="space-y-2">
          <label htmlFor="reassign_account" className="block text-sm font-medium text-gray-700">Reassign to:</label>
          <select id="reassign_account" value={newAccountId} onChange={(e) => setNewAccountId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" >
            <option value="" disabled>Select a new account...</option>
            {validTargetAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="button" onClick={handleReassign} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reassign & Delete</button>
        </div>
      </div>
    </div>
  );
};
