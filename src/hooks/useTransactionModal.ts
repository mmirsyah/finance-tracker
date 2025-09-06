"use client";

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Transaction, AssetTransaction } from '@/types';
import * as transactionService from '@/lib/transactionService';
import { saveAssetTransaction } from '@/lib/assetService';
import { useAppData } from '@/contexts/AppDataContext';

export interface UseTransactionModalProps {
  onSaveSuccess?: () => void;
}

export const useTransactionModal = ({ onSaveSuccess }: UseTransactionModalProps = {}) => {
  const { user, householdId, accounts, categories, refetchData } = useAppData();

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form state
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  const handleOpenForCreate = useCallback(() => {
    setEditId(null);
    setType('expense');
    setAmount('');
    setCategory('');
    setAccountId('');
    setToAccountId('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsOpen(true);
  }, []);

  const handleOpenForEdit = useCallback((transaction: Transaction) => {
    setEditId(transaction.id);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(transaction.category?.toString() || '');
    setAccountId(transaction.account_id);
    setToAccountId(transaction.to_account_id || '');
    setNote(transaction.note || '');
    setDate(transaction.date.split('T')[0]);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSave = async (isAssetMode?: boolean, assetPayload?: Partial<AssetTransaction>): Promise<Transaction | boolean> => {
    setIsSaving(true);
    if (!user || !householdId) {
      toast.error('User session not found.');
      setIsSaving(false);
      return false;
    }

    const transactionData: Partial<Transaction> = {
      id: editId || undefined,
      type,
      amount: Number(amount),
      note: note || null,
      date,
      user_id: user.id,
      household_id: householdId,
      category: type !== 'transfer' ? Number(category) : null,
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
    };

    try {
      const savedTransaction = await transactionService.saveTransaction(transactionData);

      if (isAssetMode && assetPayload && savedTransaction) {
        assetPayload.related_transaction_id = savedTransaction.id;
        await saveAssetTransaction(assetPayload);
      }

      if (type === 'transfer' && toAccountId) {
        const targetAccount = accounts.find(acc => acc.id === toAccountId);
        if (targetAccount?.type === 'goal') {
          toast.success(`Kerja Bagus! Selangkah lebih dekat menuju "${targetAccount.name}"! 🎉`);
        } else {
          toast.success(editId ? 'Transaction updated!' : 'Transaction saved!');
        }
      } else {
        toast.success(editId ? 'Transaction updated!' : 'Transaction saved!');
      }

      setIsOpen(false);
      refetchData();
      onSaveSuccess?.();
      return savedTransaction;
    } catch (err) {
      console.error("Error during save process:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    setIsSaving(true);
    try {
      await transactionService.deleteTransaction(editId);
      toast.success('Transaction deleted!');
      setIsOpen(false);
      refetchData();
      onSaveSuccess?.();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error('Failed to delete transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Modal state and handlers
    isOpen,
    isSaving,
    editId,
    handleOpenForCreate,
    handleOpenForEdit,
    handleClose,
    handleSave,
    handleDelete,

    // Form state and setters for the modal to consume
    formState: {
      type,
      amount,
      category,
      accountId,
      toAccountId,
      note,
      date,
    },
    formSetters: {
      setType,
      setAmount,
      setCategory,
      setAccountId,
      setToAccountId,
      setNote,
      setDate,
    },
    // Pass down necessary data from AppContext
    contextData: {
        accounts,
        categories,
    }
  };
};