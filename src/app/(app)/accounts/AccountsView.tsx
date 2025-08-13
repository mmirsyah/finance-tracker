// src/app/accounts/AccountsView.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Account } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppData } from '@/contexts/AppDataContext';
import * as accountService from '@/lib/accountService';
import AccountModal from '@/components/modals/AccountModal';
import ReassignAccountModal from '@/components/modals/ReassignAccountModal';
import TableSkeleton from '@/components/skeletons/TableSkeleton'; // <-- Import Skeleton

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export default function AccountsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { accounts, isLoading: isAppDataLoading, user, householdId, refetchData } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
      router.replace('/accounts', { scroll: false });
    }
  }, [searchParams, router]);
  
  // --- PERBAIKAN DI SINI ---
  const handleSaveAccount = async (name: string, initialBalance: number) => {
    if (!user || !householdId) return toast.error('User session not found.');

    // Membuat objek akun yang lengkap untuk dikirim ke service
    const accountData: Partial<Account> = {
      ...editingAccount,
      name,
      initial_balance: initialBalance,
      household_id: householdId,
      user_id: user.id,
    };

    // Memanggil service dengan satu argumen objek
    const promise = accountService.saveAccount(accountData)
      .then(() => {
        refetchData();
      });

    toast.promise(promise, {
      loading: 'Saving account...',
      success: 'Account saved successfully!',
      error: (err) => `Failed to save account: ${err.message}`,
    });

    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = async (account: Account) => {
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`);

    if (error) return toast.error(`Error checking transactions: ${error.message}`);
    
    if ((count || 0) > 0) {
      setAccountToDelete(account);
      setIsReassignModalOpen(true);
    } else {
      if (confirm(`Are you sure you want to delete the account "${account.name}"?`)) {
        const promise = accountService.deleteAccount(account.id).then(() => refetchData());
        toast.promise(promise, {
          loading: 'Deleting account...',
          success: 'Account deleted successfully!',
          error: (err) => `Failed to delete account: ${err.message}`,
        });
      }
    }
  };

  // --- PERBAIKAN DI SINI ---
  const handleReassignAndDelete = async (oldAccId: string, newAccId: string) => {
    // Menggunakan nama fungsi yang sudah diperbaiki (tanpa typo)
    const promise = accountService.reassignAndDeleteAccount(oldAccId, newAccId)
      .then(() => refetchData());

    toast.promise(promise, {
      loading: 'Reassigning and deleting...',
      success: 'Account deleted successfully!',
      error: (err) => err.message,
    });
    
    setIsReassignModalOpen(false);
    setAccountToDelete(null);
  };

  const handleAddNew = () => { setEditingAccount(null); setIsModalOpen(true); };
  const handleEdit = (account: Account) => { setEditingAccount(account); setIsModalOpen(true); };
  
  return (
    <div className="p-6">
      <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-6 -mx-6 -mt-6 mb-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Accounts</h1>
        <button onClick={handleAddNew} disabled={isAppDataLoading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
          <Plus size={20} /> Add New
        </button>
      </div>
      {/* --- PERUBAHAN DI SINI: Tampilkan Skeleton saat loading --- */}
      {isAppDataLoading ? (
        <TableSkeleton />
      ) : accounts.length === 0 ? (
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold">No Accounts Found</h3>
          <p className="text-gray-500 mt-2">Click &quot;Add New&quot; to create your first financial account.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Balance</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{acc.name}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${acc.balance && acc.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(acc.balance)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-4">
                      <button onClick={() => handleEdit(acc)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button>
                      <button onClick={() => handleDeleteAccount(acc)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
      <ReassignAccountModal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} onReassign={handleReassignAndDelete} accountToDelete={accountToDelete} allAccounts={accounts} />
    </div>
  );
}
