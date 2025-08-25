// src/components/modals/RecurringConfirmModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { RecurringInstance, Account, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryCombobox } from '@/components/CategoryCombobox';
import { Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import * as recurringService from '@/lib/recurringService';

interface RecurringConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  instance: RecurringInstance | null;
  accounts: Account[];
  categories: Category[];
}

export default function RecurringConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  instance,
  accounts,
  categories,
}: RecurringConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    account_id: '',
    to_account_id: '',
    note: '',
  });

  // Filter accounts (exclude Modal Awal Aset)
  const filteredAccounts = accounts.filter(acc => acc.name !== 'Modal Awal Aset');

  // Get relevant categories based on transaction type
  const relevantCategories = categories.filter(c => 
    instance && c.type === instance.transaction_type && !c.is_archived
  );

  useEffect(() => {
    if (isOpen && instance) {
      setFormData({
        amount: instance.original_amount.toString(),
        category_id: instance.original_category_id?.toString() || '',
        account_id: instance.original_account_id,
        to_account_id: instance.original_to_account_id || '',
        note: instance.original_note || '',
      });
    }
  }, [isOpen, instance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!instance) {
      toast.error('No instance selected');
      return;
    }
    
    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    
    if (!formData.account_id) {
      toast.error('Account is required');
      return;
    }
    
    if (instance.transaction_type === 'transfer') {
      if (!formData.to_account_id) {
        toast.error('Destination account is required for transfers');
        return;
      }
      if (formData.account_id === formData.to_account_id) {
        toast.error('Source and destination accounts cannot be the same');
        return;
      }
    } else {
      if (!formData.category_id) {
        toast.error('Category is required');
        return;
      }
    }

    setIsConfirming(true);
    
    try {
      // Check if any values were modified
      const isModified = 
        parseFloat(formData.amount) !== instance.original_amount ||
        formData.category_id !== (instance.original_category_id?.toString() || '') ||
        formData.account_id !== instance.original_account_id ||
        formData.to_account_id !== (instance.original_to_account_id || '') ||
        formData.note !== (instance.original_note || '');

      await recurringService.confirmRecurringInstance(
        instance.instance_id,
        parseFloat(formData.amount),
        formData.category_id ? parseInt(formData.category_id) : null,
        formData.account_id,
        formData.to_account_id || null,
        formData.note || null
      );

      toast.success(
        isModified 
          ? 'Instance confirmed with modifications!' 
          : 'Instance confirmed successfully!'
      );
      
      onConfirm();
    } catch (error) {
      console.error('Error confirming instance:', error);
      toast.error('Failed to confirm instance');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen || !instance) return null;

  // Check if values have been modified
  const isModified = 
    parseFloat(formData.amount) !== instance.original_amount ||
    formData.category_id !== (instance.original_category_id?.toString() || '') ||
    formData.account_id !== instance.original_account_id ||
    formData.to_account_id !== (instance.original_to_account_id || '') ||
    formData.note !== (instance.original_note || '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800">Confirm Recurring Transaction</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            disabled={isConfirming}
          >
            <X size={24} />
          </button>
        </div>

        {/* Instance Preview */}
        <div className="p-6 bg-gray-50 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recurring Instance:</h3>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-lg">{instance.template_name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    instance.transaction_type === 'income' ? 'bg-green-100 text-green-800' :
                    instance.transaction_type === 'expense' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {instance.transaction_type}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Due Date:</strong> {new Date(instance.due_date).toLocaleDateString()}</div>
                  <div><strong>Frequency:</strong> {instance.frequency}</div>
                  {instance.original_category_name && (
                    <div><strong>Category:</strong> {instance.original_category_name}</div>
                  )}
                  <div><strong>Account:</strong> {instance.original_account_name}</div>
                  {instance.original_to_account_name && (
                    <div><strong>To Account:</strong> {instance.original_to_account_name}</div>
                  )}
                </div>
              </div>
              <div className={`text-xl font-bold ${
                instance.transaction_type === 'income' ? 'text-green-600' :
                instance.transaction_type === 'expense' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {instance.transaction_type === 'income' ? '+' : ''}
                {formatCurrency(instance.original_amount)}
              </div>
            </div>

            {isModified && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  You have modified the original values. This will be marked as &quot;Done with Difference&quot;.
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            {instance.transaction_type !== 'transfer' && (
              <div>
                <Label htmlFor="category">Category *</Label>
                <CategoryCombobox
                  allCategories={relevantCategories}
                  value={formData.category_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="account">
                {instance.transaction_type === 'transfer' ? 'From Account *' : 'Account *'}
              </Label>
              <Select
                value={formData.account_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {instance.transaction_type === 'transfer' && (
              <div>
                <Label htmlFor="to_account">To Account *</Label>
                <Select
                  value={formData.to_account_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, to_account_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Optional note"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isConfirming}>
              Cancel
            </Button>
            <Button type="submit" disabled={isConfirming} className="min-w-[140px]">
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Transaction'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}