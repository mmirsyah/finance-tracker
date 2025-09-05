"use client";

import { useState, useEffect, useMemo } from 'react';
import { Transaction, AssetTransaction } from "@/types";
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { TransactionForm, useAssetTransaction } from './TransactionForm';
import { AssetFields } from './AssetFields';
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type TransactionModalMobileProps = ReturnType<typeof useTransactionModal>;

export function TransactionModalMobile(props: TransactionModalMobileProps) {
    const { isOpen, handleClose, editId, handleSave, isSaving, formState, formSetters, contextData } = props;
    const { type, amount, date, accountId, toAccountId } = formState;
    const [step, setStep] = useState(1);

    const { isAssetMode, quantity, setQuantity, price, setPrice } = useAssetTransaction(
        editId, type, accountId, toAccountId, contextData.accounts, formSetters.setAmount
    );

    useEffect(() => {
        if (isOpen && !editId) {
            setStep(1);
        }
    }, [isOpen, editId]);

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isAssetMode) {
            if (!quantity || !price || Number(quantity) <= 0 || Number(price) < 0) {
                toast.error("Please enter a valid quantity and price.");
                return;
            }
        } else if (!amount || Number(amount) <= 0) {
            toast.error('Please fill in the Amount.');
            return;
        }
        if(!date) { toast.error("Please select a date."); return; }
        if (type === 'transfer' && (!accountId || !toAccountId)) {
            toast.error('Please select both From and To accounts for a transfer.');
            return;
        }
        setStep(2);
    };

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        setStep(1);
    };

    const handleMobileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (type === 'transfer') {
            if (!accountId || !toAccountId) { toast.error('Please select both From and To accounts.'); return; }
            if (accountId === toAccountId) { toast.error('From and To accounts cannot be the same.'); return; }
        } else {
            if (!amount || !formState.category || !accountId || !date) { toast.error('Please fill in all required fields.'); return; }
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
            const fromAccount = contextData.accounts.find(a => a.id === accountId);
            const assetAccount = fromAccount?.type === 'asset' ? fromAccount : contextData.accounts.find(a => a.id === toAccountId);
            if (!assetAccount) { toast.error("Could not determine asset account."); return; }

            assetPayload.asset_account_id = assetAccount.id;
            assetPayload.household_id = assetAccount.household_id;
            assetPayload.transaction_type = fromAccount?.type === 'asset' ? 'sell' : 'buy';
        }
        
        handleSave(isAssetMode, assetPayload);
      };

    if (editId) {
        return (
            <Drawer open={isOpen} onClose={handleClose}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Edit Transaction</DrawerTitle>
                        <DrawerDescription>Update the details of your transaction.</DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-4">
                        <TransactionForm 
                            {...formState} 
                            {...formSetters} 
                            {...contextData} 
                            editId={editId} 
                            isSaving={isSaving} 
                            onClose={handleClose} 
                            onSave={handleSave} 
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }
    
    return (
        <Drawer open={isOpen} onClose={handleClose}>
            <DrawerContent>
                 <DrawerHeader className="text-left">
                    <DrawerTitle>Add New Transaction</DrawerTitle>
                    <DrawerDescription>Step {step} of 2: Enter the details.</DrawerDescription>
                </DrawerHeader>
                
                <form onSubmit={handleMobileSave} className="px-4">
                    {step === 1 && <TransactionFormStep1 {...props} isAssetMode={isAssetMode} quantity={quantity} setQuantity={setQuantity} price={price} setPrice={setPrice} />}
                    {step === 2 && <TransactionFormStep2 {...props} />}

                    <DrawerFooter className="pt-2 mt-4 px-0">
                        {step === 1 ? (
                            <Button type="button" onClick={handleNext}>Continue</Button>
                        ) : (
                            <div className="flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">Back</Button>
                                <Button type="submit" disabled={isSaving} className="flex-1">
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Transaction'}
                                </Button>
                            </div>
                        )}
                        <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}


// Form Steps
type FormStepProps = TransactionModalMobileProps & { 
    isAssetMode: boolean, 
    quantity: string, 
    setQuantity: (v: string) => void, 
    price: string, 
    setPrice: (v: string) => void 
};

function TransactionFormStep1({ formState, formSetters, contextData, isAssetMode, quantity, setQuantity, price, setPrice }: FormStepProps) {
    const { type, amount, date, accountId, toAccountId } = formState;
    const { setType, setAmount, setDate, setAccountId, setToAccountId, setCategory } = formSetters;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value as Transaction['type']); setCategory(''); }} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        
        {isAssetMode ? (
            <AssetFields 
                quantity={quantity!} 
                setQuantity={setQuantity!} 
                price={price!} 
                setPrice={setPrice!} 
                amount={amount}
            />
        ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <Input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
            </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        
        {type === 'transfer' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required>
                <option value="" disabled>Select an account</option>
                {contextData.accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required>
                <option value="" disabled>Select an account</option>
                {contextData.accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
              </select>
            </div>
          </>
        )}
      </div>
    );
}
  
function TransactionFormStep2({ formState, formSetters, contextData, editId }: Omit<FormStepProps, 'isAssetMode' | 'quantity' | 'setQuantity' | 'price' | 'setPrice'>) {
    const { type, category, accountId, note } = formState;
    const { setCategory, setAccountId, setNote } = formSetters;

    const relevantCategories = useMemo(() => {
        const categoriesForType = contextData.categories.filter(c => c.type === type);
        if (!editId) {
          return categoriesForType.filter(c => !c.is_archived);
        }
        const currentCategoryForTx = categoriesForType.find(c => c.id.toString() === category);
        const activeCategories = categoriesForType.filter(c => !c.is_archived);
        if (currentCategoryForTx && currentCategoryForTx.is_archived) {
          return [...activeCategories, currentCategoryForTx].sort((a, b) => a.name.localeCompare(b.name));
        }
        return activeCategories;
    }, [contextData.categories, type, editId, category]);
      
    const standardAccounts = useMemo(() =>
      contextData.accounts.filter(acc => acc.type !== 'asset' && acc.type !== 'goal'),
      [contextData.accounts]
    );
  
    return (
      <div className="space-y-4">
        {type !== 'transfer' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <CategoryCombobox allCategories={relevantCategories} value={category} onChange={setCategory} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required>
                <option value="" disabled>Select an account</option>
                {standardAccounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    );
}
