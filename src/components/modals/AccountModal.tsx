// src/components/modals/AccountModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Account } from '@/types';
import toast from 'react-hot-toast';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, initialBalance: number) => void;
  account: Partial<Account> | null;
}

export default function AccountModal({ isOpen, onClose, onSave, account }: AccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setInitialBalance(String(account.initial_balance || 0));
    } else {
      setName('');
      setInitialBalance('0');
    }
  }, [account, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error('Account name is required.');
    onSave(name, Number(initialBalance));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{account?.id ? 'Edit Account' : 'Add New Account'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name-acc" className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" id="name-acc" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required placeholder="e.g., Bank BCA, Gopay, Dompet" />
            </div>
            <div>
              <label htmlFor="initial_balance" className="block text-sm font-medium text-gray-700">Initial Balance</label>
              <input type="number" id="initial_balance" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Account</button>
          </div>
        </form>
      </div>
    </div>
  );
};
