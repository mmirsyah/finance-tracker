"use client";

import { Category, Account, Transaction } from "@/types";
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
  DialogDescription,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Main Props Interface
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editId ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                </DialogHeader>
                <TransactionForm {...props} editId={editId} onClose={onClose} />
            </DialogContent>
        </Dialog>
    );
}

// Mobile Component: Drawer with multi-step form
function TransactionDrawer({ isOpen, onClose, ...props }: TransactionModalProps) {
    const [step, setStep] = useState(0);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
        }
    }, [isOpen]);

    const { editId, onSave, isSaving } = props;

    return (
        <Drawer open={isOpen} onClose={onClose}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{editId ? 'Edit Transaction' : 'Add New Transaction'}</DrawerTitle>
                    <DrawerDescription>
                        {editId ? 'Update the details of your transaction.' : `Step ${step + 1} of 2: Enter the details.`}
                    </DrawerDescription>
                </DrawerHeader>
                
                <div className="p-4">
                    {step === 0 && 
                        <StepOne 
                            type={props.type} setType={props.setType}
                            amount={props.amount} setAmount={props.setAmount}
                            note={props.note} setNote={props.setNote}
                        />
                    }
                    {step === 1 && 
                        <StepTwo 
                            type={props.type}
                            category={props.category} setCategory={props.setCategory}
                            accountId={props.accountId} setAccountId={props.setAccountId}
                            toAccountId={props.toAccountId} setToAccountId={props.setToAccountId}
                            date={props.date} setDate={props.setDate}
                            categories={props.categories} accounts={props.accounts}
                        />
                    }
                </div>

                <DrawerFooter className="pt-2">
                    {step === 0 && <Button onClick={handleNext}>Continue</Button>}
                    {step === 1 && (
                        <>
                            <Button onClick={onSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Transaction'}
                            </Button>
                            <Button variant="outline" onClick={handleBack}>Back</Button>
                        </>
                    )}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

// Props for Step One
interface StepOneProps {
    type: Transaction['type'];
    setType: (type: Transaction['type']) => void;
    amount: string;
    setAmount: (amount: string) => void;
    note: string;
    setNote: (note: string) => void;
}

// UI for Step One
function StepOne({ type, setType, amount, setAmount, note, setNote }: StepOneProps) {
    return (
        <div className="space-y-4">
            <ToggleGroup type="single" defaultValue={type} value={type} onValueChange={(value) => setType(value as Transaction['type'])} className="w-full">
                <ToggleGroupItem value="expense" className="w-full">Expense</ToggleGroupItem>
                <ToggleGroupItem value="income" className="w-full">Income</ToggleGroupItem>
                <ToggleGroupItem value="transfer" className="w-full">Transfer</ToggleGroupItem>
            </ToggleGroup>
            <div>
                <label htmlFor="amount-input" className="text-sm font-medium">Amount</label>
                <Input id="amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Rp 0" className="text-2xl h-14 mt-1" required />
            </div>
            <div>
                <label htmlFor="note-input" className="text-sm font-medium">Note (Optional)</label>
                <Textarea id="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Lunch with client" className="mt-1" />
            </div>
        </div>
    );
}

// Props for Step Two
interface StepTwoProps {
    type: Transaction['type'];
    category: string;
    setCategory: (category: string) => void;
    accountId: string;
    setAccountId: (accountId: string) => void;
    toAccountId: string;
    setToAccountId: (toAccountId: string) => void;
    date: string;
    setDate: (date: string) => void;
    categories: Category[];
    accounts: Account[];
}

// UI for Step Two
function StepTwo({ type, category, setCategory, accountId, setAccountId, toAccountId, setToAccountId, date, setDate, categories, accounts }: StepTwoProps) {
    const relevantCategories = useMemo(() => categories.filter(c => c.type === type && !c.is_archived), [categories, type]);

    return (
        <div className="space-y-4">
            {type !== 'transfer' ? (
                <div>
                    <label htmlFor="category-input" className="text-sm font-medium">Category</label>
                    <CategoryCombobox allCategories={relevantCategories} value={category || ''} onChange={setCategory} />
                </div>
            ) : null}
            
            <div>
                <label htmlFor="account-input" className="text-sm font-medium">{type === 'transfer' ? 'From Account' : 'Account'}</label>
                <select id="account-input" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800 mt-1" required>
                    <option value="" disabled>Select an account</option>
                    {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                </select>
            </div>

            {type === 'transfer' && (
                 <div>
                    <label htmlFor="to-account-input" className="text-sm font-medium">To Account</label>
                    <select id="to-account-input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800 mt-1" required>
                        <option value="" disabled>Select an account</option>
                        {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                    </select>
                </div>
            )}

            <div>
                <label htmlFor="date-input" className="text-sm font-medium">Date</label>
                <Input id="date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" required />
            </div>
        </div>
    );
}

// The original form, to be used inside the desktop dialog for now
type TransactionFormProps = Omit<TransactionModalProps, 'isOpen' | 'editId' | 'onClose'> & {
  editId: string | null;
  onClose: () => void;
};

function TransactionForm({
  onClose, onSave, isSaving, type, setType, amount, setAmount,
  category, setCategory, accountId, setAccountId, toAccountId, setToAccountId,
  note, setNote, date, setDate, categories, accounts, editId
}: TransactionFormProps) {

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

  const handleValidationAndSave = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onSave(); 
  };

  return (
    <form onSubmit={handleValidationAndSave} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value as Transaction['type'])} 
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800"
          >
            <option value="expense">Expense</option> 
            <option value="income">Income</option> 
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
        </div>
        {type === 'transfer' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required>
                <option value="" disabled>Select an account</option>
                {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required>
                <option value="" disabled>Select an account</option>
                {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <CategoryCombobox allCategories={relevantCategories} value={category} onChange={setCategory}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-800" required>
                <option value="" disabled>Select an account</option>
                {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
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
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Transaction'}
        </Button>
      </DialogFooter>
    </form>
  );
}