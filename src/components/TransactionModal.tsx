"use client";

import { Category, Account, Transaction, AssetTransaction } from "@/types";
import { useMemo, useState, useEffect } from "react";
import { CategoryCombobox } from "./CategoryCombobox";
import { Loader2 } from "lucide-react";
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { toast } from "sonner";
import { saveAssetTransaction, getAssetTransactionByFinancialTxId } from "@/lib/assetService";

// Main Props Interface
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<Transaction | boolean>;
  onDelete?: () => void; // Simplified: No longer passes data up
  onMakeRecurring?: () => void;
  editId: string | null;
  isSaving: boolean;
  type: Transaction['type'];
  setType: (type: Transaction['type']) => void;
  amount: string;
  setAmount: (amount: string) => void;
  category: string;
  setCategory: (category: string) => void;
  accountId: string;
  setAccountId: (accountId: string) => void;
  toAccountId: string;
  setToAccountId: (toAccountId: string) => void;
  note: string;
  setNote: (note: string) => void;
  date: string;
  setDate: (date: string) => void;
  categories: Category[];
  accounts: Account[];
}

// Main Component: Decides to render Dialog or Drawer
export default function TransactionModal(props: TransactionModalProps) {
  const { isOpen } = props;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!isOpen) return null;

  if (isDesktop) {
    return <TransactionDialog {...props} />;
  }

  return <TransactionDrawer {...props} />;
}

// Desktop Component: Dialog with a side-panel style
function TransactionDialog({ editId, isOpen, onClose, ...props }: TransactionModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
            <DialogContent variant="side-panel" className="flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{editId ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-grow pr-6 -mr-6">
                    <TransactionForm {...props} editId={editId} onClose={onClose} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Mobile Component: Drawer with a single-step form
function TransactionDrawer({ isOpen, onClose, ...props }: TransactionModalProps) {
    return (
        <Drawer open={isOpen} onClose={onClose}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{props.editId ? 'Edit Transaction' : 'Add New Transaction'}</DrawerTitle>
                    <DrawerDescription>
                        {props.editId ? 'Update the details of your transaction.' : 'Enter the details for your new transaction.'}
                    </DrawerDescription>
                </DrawerHeader>
                
                <div className="overflow-y-auto px-4">
                  <TransactionForm {...props} editId={props.editId} onClose={onClose} />
                </div>

                <DrawerFooter className="pt-2 mt-4">
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

// The main form, used by both Dialog and Drawer
type TransactionFormProps = Omit<TransactionModalProps, 'isOpen' | 'editId' | 'onClose'> & {
  editId: string | null;
  onClose: () => void;
};

function TransactionForm({
  onClose, onSave, isSaving, type, setType, amount, setAmount,
  category, setCategory, accountId, setAccountId, toAccountId, setToAccountId,
  note, setNote, date, setDate, categories, accounts, editId,
  onDelete, onMakeRecurring
}: TransactionFormProps) {

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
      setIsAssetMode(fromAccount?.type === 'asset' || toAccount?.type === 'asset');
    } else {
      setIsAssetMode(false);
    }
  }, [type, accountId, toAccountId, accounts, editId]);

  // Effect to calculate total amount from quantity and price, ONLY in asset mode
  useEffect(() => {
    if (isAssetMode) {
      const totalAmount = Number(quantity) * Number(price);
      setAmount(String(totalAmount > 0 ? totalAmount : ''));
    }
  }, [quantity, price, setAmount, isAssetMode]);

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

    const financialTx = await onSave();

    if (isAssetMode && financialTx) {
        const assetPayload: Partial<AssetTransaction> = {
            quantity: Number(quantity),
            price_per_unit: Number(price),
            transaction_date: date,
        };

        if (editId && linkedAssetTx) {
            assetPayload.id = linkedAssetTx.id;
        } else if (!editId && typeof financialTx !== 'boolean') {
            const fromAccount = accounts.find(a => a.id === accountId);
            const assetAccount = fromAccount?.type === 'asset' ? fromAccount : accounts.find(a => a.id === toAccountId);
            if (!assetAccount) { toast.error("Could not determine asset account."); return; }

            assetPayload.asset_account_id = assetAccount.id;
            assetPayload.household_id = assetAccount.household_id;
            assetPayload.transaction_type = fromAccount?.type === 'asset' ? 'sell' : 'buy';
            assetPayload.related_transaction_id = financialTx.id;
        }

        try {
            await saveAssetTransaction(assetPayload);
        } catch (error) {
            toast.error(`Failed to save asset transaction details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
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
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 1.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                <Input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 1,000,000" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <Input type="number" value={amount} placeholder="0" required disabled />
              </div>
            </>
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