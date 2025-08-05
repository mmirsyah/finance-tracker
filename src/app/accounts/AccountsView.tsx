// src/app/accounts/AccountsView.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Account } from '@/types';
import { User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

// Komponen-komponen Modal dan helper bisa tetap di sini
const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };
const AccountModal = ({ isOpen, onClose, onSave, account }: { isOpen: boolean; onClose: () => void; onSave: (name: string, initialBalance: number) => void; account: Partial<Account> | null; }) => { const [name, setName] = useState(''); const [initialBalance, setInitialBalance] = useState('0'); useEffect(() => { if (account) { setName(account.name || ''); setInitialBalance(String(account.initial_balance || 0)); } else { setName(''); setInitialBalance('0'); } }, [account, isOpen]); if (!isOpen) return null; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name) return alert('Account name is required.'); onSave(name, Number(initialBalance)); }; return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"> <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"> <h2 className="text-xl font-bold mb-4">{account?.id ? 'Edit Account' : 'Add New Account'}</h2> <form onSubmit={handleSubmit}> <div className="space-y-4"> <div><label htmlFor="name-acc" className="block text-sm font-medium text-gray-700">Name</label><input type="text" id="name-acc" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required placeholder="e.g., Bank BCA, Gopay, Dompet" /></div> <div><label htmlFor="initial_balance" className="block text-sm font-medium text-gray-700">Initial Balance</label><input type="number" id="initial_balance" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required /></div> </div> <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Account</button></div> </form> </div> </div> ); };
const ReassignAccountModal = ({ isOpen, onClose, onReassign, accountToDelete, allAccounts }: { isOpen: boolean; onClose: () => void; onReassign: (oldAccId: string, newAccId: string) => void; accountToDelete: Account | null; allAccounts: Account[]; }) => { const [newAccountId, setNewAccountId] = useState<string>(''); if (!isOpen || !accountToDelete) return null; const validTargetAccounts = allAccounts.filter(acc => acc.id !== accountToDelete.id); const handleReassign = () => { if (!newAccountId) return alert('Please select a new account to reassign transactions to.'); onReassign(accountToDelete.id, newAccountId); }; return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"> <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"> <div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-10 h-10 text-yellow-500" /><h2 className="text-xl font-bold">Reassign Transactions</h2></div><p className="text-sm text-gray-600 mb-4">The account &quot;<strong>{accountToDelete.name}</strong>&quot; has transactions linked to it. To delete it, you must first reassign these transactions to another account.</p><div className="space-y-2"><label htmlFor="reassign_account" className="block text-sm font-medium text-gray-700">Reassign to:</label><select id="reassign_account" value={newAccountId} onChange={(e) => setNewAccountId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" ><option value="" disabled>Select a new account...</option>{validTargetAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}</select></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button><button type="button" onClick={handleReassign} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reassign & Delete</button></div></div></div> ); };

export default function AccountsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const fetchAccountsWithBalance = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc('get_accounts_with_balance', { p_user_id: userId });
    if (error) { console.error('Error fetching accounts with balance:', error); } 
    else { setAccounts(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchAccountsWithBalance(session.user.id);
        if (searchParams.get('action') === 'new') { setIsModalOpen(true); router.replace('/accounts', { scroll: false }); }
        channel = supabase.channel('realtime-accounts-balance').on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => fetchAccountsWithBalance(session.user.id)).on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchAccountsWithBalance(session.user.id)).subscribe();
      } else {
        router.push('/login');
      }
    };
    initialize();
    return () => { if (channel) { supabase.removeChannel(channel); } };
  }, [router, fetchAccountsWithBalance, searchParams]);
  
  const handleSaveAccount = async (name: string, initialBalance: number) => {
    if (!user) return alert('User not found.');
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single();
    if (!profile) return alert('Could not find user profile. Failed to save.');
    const payload = { name, user_id: user.id, initial_balance: initialBalance, household_id: profile.household_id };
    let error;
    if (editingAccount?.id) {
      ({ error } = await supabase.from('accounts').update(payload).eq('id', editingAccount.id));
    } else {
      ({ error } = await supabase.from('accounts').insert([payload]));
    }
    if (error) { alert(`Failed to save account: ${error.message}`); }
    else { await fetchAccountsWithBalance(user.id); }
    setIsModalOpen(false); setEditingAccount(null);
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!user) return;
    const { count, error: checkError } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`);
    if (checkError) return alert(`Error checking transactions: ${checkError.message}`);
    if ((count || 0) > 0) {
      setAccountToDelete(account);
      setIsReassignModalOpen(true);
    } else {
      if (confirm(`Are you sure you want to delete the account "${account.name}"?`)) {
        const { error } = await supabase.from('accounts').delete().eq('id', account.id);
        if (error) { alert('Failed to delete account.'); }
        else { await fetchAccountsWithBalance(user.id); }
      }
    }
  };

  const handleReassignAndDelete = async (oldAccId: string, newAccId: string) => {
    if (!user) return;
    const { error: updateFromError } = await supabase.from('transactions').update({ account_id: newAccId }).eq('account_id', oldAccId);
    if (updateFromError) return alert(`Failed to reassign 'from' transactions: ${updateFromError.message}`);
    const { error: updateToError } = await supabase.from('transactions').update({ to_account_id: newAccId }).eq('to_account_id', oldAccId);
    if (updateToError) return alert(`Failed to reassign 'to' transactions: ${updateToError.message}`);
    const { error: deleteError } = await supabase.from('accounts').delete().eq('id', oldAccId);
    if (deleteError) { alert(`Transactions reassigned, but failed to delete old account: ${deleteError.message}`); }
    else { await fetchAccountsWithBalance(user.id); }
    setIsReassignModalOpen(false); setAccountToDelete(null);
  };

  const handleAddNew = () => { setEditingAccount(null); setIsModalOpen(true); };
  const handleEdit = (account: Account) => { setEditingAccount(account); setIsModalOpen(true); };

  if (loading) { return <div className="p-6">Loading Accounts...</div>; }
  return (
    <div className="p-6">
      <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-6 -mx-6 -mt-6 mb-6 border-b border-gray-200 flex justify-between items-center"><h1 className="text-3xl font-bold">Manage Accounts</h1><button onClick={handleAddNew} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"><Plus size={20} /> Add New</button></div>
      {accounts.length === 0 && !loading ? (
        <div className="text-center p-6 bg-white rounded-lg shadow"><h3 className="text-lg font-semibold">No Accounts Found</h3><p className="text-gray-500 mt-2">Click &quot;Add New&quot; to create your first financial account.</p></div>
      ) : (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Balance</th><th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">{accounts.map((acc) => (<tr key={acc.id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{acc.name}</td><td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${acc.balance && acc.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(acc.balance)}</td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end gap-4"><button onClick={() => handleEdit(acc)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button><button onClick={() => handleDeleteAccount(acc)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button></div></td></tr>))}</tbody>
        </table>
      </div>
      )}
      <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
      <ReassignAccountModal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} onReassign={handleReassignAndDelete} accountToDelete={accountToDelete} allAccounts={accounts} />
    </div>
  );
}