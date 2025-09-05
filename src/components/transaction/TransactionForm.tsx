"use client";

import { useMemo, useState, useEffect } from 'react';
import { Category, Account, Transaction, AssetTransaction } from "@/types";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { AssetFields } from "./AssetFields";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAssetTransactionByFinancialTxId } from '@/lib/assetService';

// Custom hook for asset transaction logic, co-located with the form that uses it.
export const useAssetTransaction = (
    editId: string | null,
    type: Transaction['type'],
    accountId: string,
    toAccountId: string,
    accounts: Account[],
    setAmount: (val: string) => void
) => {
    const [isAssetMode, setIsAssetMode] = useState(false);
    const [linkedAssetTx, setLinkedAssetTx] = useState<AssetTransaction | null>(null);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');

    // Effect for EDIT MODE: Fetch linked asset transaction
    useEffect(() => {
        const fetchLinkedAssetTx = async () => {
            if (editId) {
                const linkedTx = await getAssetTransactionByFinancialTxId(editId);
                if (linkedTx) {
                    setIsAssetMode(true);
                    setLinkedAssetTx(linkedTx);
                    setQuantity(String(linkedTx.quantity));
                    setPrice(String(linkedTx.price_per_unit));
                } else {
                    setIsAssetMode(false);
                    setLinkedAssetTx(null);
                }
            }
        };
        fetchLinkedAssetTx();
    }, [editId]);

    // Effect for CREATE MODE: Detect if it should be an asset transaction
    useEffect(() => {
        if (editId) return;
        if (type === 'transfer') {
            const fromAccount = accounts.find(a => a.id === accountId);
            const toAccount = accounts.find(a => a.id === toAccountId);
            const shouldBeAssetMode = fromAccount?.type === 'asset' || toAccount?.type === 'asset';
            setIsAssetMode(shouldBeAssetMode);
            if (!shouldBeAssetMode) {
                setQuantity('');
                setPrice('');
            }
        } else {
            setIsAssetMode(false);
        }
    }, [type, accountId, toAccountId, accounts, editId]);

    // Effect to calculate total amount from quantity and price
    useEffect(() => {
        if (isAssetMode) {
            const totalAmount = Number(quantity) * Number(price);
            setAmount(String(totalAmount > 0 ? totalAmount : ''));
        }
    }, [quantity, price, setAmount, isAssetMode]);
    
    return { isAssetMode, linkedAssetTx, quantity, setQuantity, price, setPrice };
};


// The full form, used by Dialog (desktop) and for editing in Drawer (mobile)
export interface TransactionFormProps {
  onClose: () => void;
  onSave: (isAssetMode?: boolean, assetPayload?: Partial<AssetTransaction>) => Promise<Transaction | boolean>;
  isSaving: boolean;
  editId: string | null;
  // Form state
  type: Transaction['type'];
  amount: string;
  category: string;
  accountId: string;
  toAccountId: string;
  note: string;
  date: string;
  // Form setters
  setType: (type: Transaction['type']) => void;
  setAmount: (amount: string) => void;
  setCategory: (category: string) => void;
  setAccountId: (accountId: string) => void;
  setToAccountId: (toAccountId: string) => void;
  setNote: (note: string) => void;
  setDate: (date: string) => void;
  // Context data
  categories: Category[];
  accounts: Account[];
  // Actions from parent
  onDelete?: () => void;
  onMakeRecurring?: () => void;
}

export function TransactionForm({
  onClose, onSave, isSaving, type, setType, amount, setAmount,
  category, setCategory, accountId, setAccountId, toAccountId, setToAccountId,
  note, setNote, date, setDate, categories, accounts, editId,
  onDelete, onMakeRecurring
}: TransactionFormProps) {

  const { isAssetMode, linkedAssetTx, quantity, setQuantity, price, setPrice } = useAssetTransaction(
      editId, type, accountId, toAccountId, accounts, setAmount
  );

  const relevantCategories = useMemo(() => {
    const categoriesForType = categories.filter(c => c.type === type);
    if (!editId) {
      return categoriesForType.filter(c => !c.is_archived);
    }
    const currentCategoryForTx = categoriesForType.find(c => c.id.toString() === category);
    const activeCategories = categoriesForType.filter(c => !c.is_archived);
    if (currentCategoryForTx && currentCategoryForTx.is_archived) {
      return [...activeCategories, currentCategoryForTx].sort((a, b) => a.name.localeCompare(b.name));
    }
    return activeCategories;
  }, [categories, type, editId, category]);

  const standardAccounts = useMemo(() => 
    accounts.filter(acc => acc.type !== 'asset' && acc.type !== 'goal'),
    [accounts]
  );

  const handleValidationAndSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'transfer') {
      if (!accountId || !toAccountId) { toast.error('Please select both From and To accounts.'); return; }
      if (accountId === toAccountId) { toast.error('From and To accounts cannot be the same.'); return; }
    } else {
      if (!amount || !category || !accountId || !date) { toast.error('Please fill in all required fields.'); return; }
    }
    
    if (isAssetMode && (!quantity || !price || Number(quantity) <= 0 || Number(price) < 0)) {
      toast.error("For asset transactions, please enter a valid quantity and price.");
      return;
    }

    let assetPayload: Partial<AssetTransaction> | undefined = undefined;
    if (isAssetMode) {
        assetPayload = {
            quantity: Number(quantity),
            price_per_unit: Number(price),
            transaction_date: date,
        };

        if (editId && linkedAssetTx) {
            assetPayload.id = linkedAssetTx.id;
        } else if (!editId) {
            const fromAccount = accounts.find(a => a.id === accountId);
            const assetAccount = fromAccount?.type === 'asset' ? fromAccount : accounts.find(a => a.id === toAccountId);
            if (!assetAccount) { 
                toast.error("Could not determine asset account."); 
                return;
            }

            assetPayload.asset_account_id = assetAccount.id;
            assetPayload.household_id = assetAccount.household_id;
            assetPayload.transaction_type = fromAccount?.type === 'asset' ? 'sell' : 'buy';
        }
    }
    
    onSave(isAssetMode, assetPayload);
  };

  return (
    <form onSubmit={handleValidationAndSave} className="flex flex-col h-full">
      <div className="space-y-4 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as Transaction['type']); setCategory(''); }}
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800"
              disabled={editId !== null}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {isAssetMode ? (
            <AssetFields 
                quantity={quantity} 
                setQuantity={setQuantity} 
                price={price} 
                setPrice={setPrice}
                amount={amount}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <Input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
            </div>
          )}

          {type === 'transfer' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required disabled={editId !== null}>
                  <option value="" disabled>Select an account</option>
                  {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required disabled={editId !== null}>
                  <option value="" disabled>Select an account</option>
                  {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <CategoryCombobox allCategories={relevantCategories} value={category} onChange={setCategory} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required disabled={editId !== null}>
                  <option value="" disabled>Select an account</option>
                  {standardAccounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                </select>
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </div>
      <DialogFooter className="!justify-between mt-auto pt-4 border-t">
        <div className="flex gap-2">
          {editId && onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete} disabled={isSaving}>Delete</Button>
          )}
          {editId && onMakeRecurring && (
            <Button type="button" variant="secondary" onClick={onMakeRecurring} disabled={isSaving}>Make Recurring</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editId ? 'Save Changes' : 'Save Transaction')}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
