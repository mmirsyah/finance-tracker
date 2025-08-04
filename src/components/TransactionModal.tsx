// src/components/TransactionModal.tsx
"use client";
import { Category, Account, Transaction } from "@/types";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CategoryCombobox } from "./CategoryCombobox";
import { Loader2 } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean; onClose: () => void; onSave: () => void; editId: string | null;
  isSaving: boolean; type: Transaction['type']; setType: (type: Transaction['type']) => void;
  amount: string; setAmount: (amount: string) => void;
  category: string; setCategory: (category: string) => void;
  accountId: string; setAccountId: (accountId: string) => void;
  toAccountId: string; setToAccountId: (toAccountId: string) => void;
  note: string; setNote: (note: string) => void;
  date: string; setDate: (date: string) => void;
  categories: Category[]; accounts: Account[];
}

const formatCurrency = (value: number) => { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };

export default function TransactionModal({
  isOpen, onClose, onSave, editId, isSaving, type, setType, amount, setAmount,
  category, setCategory, accountId, setAccountId, toAccountId, setToAccountId,
  note, setNote, date, setDate, categories, accounts,
}: TransactionModalProps) {

  // === SEMUA HOOKS DIKUMPULKAN DI ATAS, SEBELUM KONDISI APAPUN ===
  const [selectedAccountBalance, setSelectedAccountBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  useEffect(() => {
    const accountIdToCheck = accountId;
    if (accountIdToCheck && isOpen) {
      const fetchBalance = async () => {
        setIsBalanceLoading(true);
        setSelectedAccountBalance(null);
        const { data, error } = await supabase.rpc('get_balance_for_account', { p_account_id: accountIdToCheck });
        if (error) { console.error('Failed to fetch balance:', error); } else { setSelectedAccountBalance(data); }
        setIsBalanceLoading(false);
      };
      fetchBalance();
    } else {
      setSelectedAccountBalance(null);
    }
  }, [accountId, isOpen]);

  const relevantCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

  // Sekarang, setelah semua hook dijalankan, baru kita boleh keluar lebih awal.
  if (!isOpen) { return null; }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(); };
  const handleModalContentClick = (e: React.MouseEvent) => { e.stopPropagation(); };
  
  const BalanceDisplay = () => {
    if (isBalanceLoading) { return <p className="text-xs text-gray-500 mt-1 h-4">Loading balance...</p>; }
    if (selectedAccountBalance !== null) { return <p className="text-xs text-gray-500 mt-1 h-4">Current Balance: {formatCurrency(selectedAccountBalance)}</p>; }
    return <div className="h-4 mt-1"></div>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={handleModalContentClick}>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{editId ? 'Edit Transaction' : 'Add New Transaction'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={(e) => { setType(e.target.value as Transaction['type']); setCategory(''); setAccountId(''); setToAccountId(''); }} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="expense">Expense</option> <option value="income">Income</option> <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="0" required />
            </div>
            {type === 'transfer' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" required>
                    <option value="" disabled>Select an account</option>
                    {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                  </select>
                  <BalanceDisplay />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
                  <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" required>
                    <option value="" disabled>Select an account</option>
                    {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><CategoryCombobox allCategories={relevantCategories} value={category} onChange={setCategory}/></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" required>
                    <option value="" disabled>Select an account</option>
                    {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                  </select>
                  <BalanceDisplay />
                </div>
              </>
            )}
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" required /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Note</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="Optional" /></div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition" disabled={isSaving}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-blue-400 w-36" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}