// src/components/modals/RecurringFromTransactionModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Transaction, Account, Category, FrequencyType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import * as recurringService from '@/lib/recurringService';

interface RecurringFromTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
}

const frequencyOptions: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function RecurringFromTransactionModal({
  isOpen,
  onClose,
  onSave,
  transaction,
  accounts,
  categories,
}: RecurringFromTransactionModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    template_name: '',
    frequency: 'monthly' as FrequencyType,
    interval_value: '1',
    start_date: '',
    end_date: '',
    note: '',
  });

  useEffect(() => {
    if (isOpen && transaction) {
      const today = new Date().toISOString().split('T')[0];
      
      // Generate template name based on transaction
      let templateName = '';
      if (transaction.type === 'transfer') {
        const fromAccount = accounts.find(a => a.id === transaction.account_id)?.name || 'Unknown';
        const toAccount = accounts.find(a => a.id === transaction.to_account_id)?.name || 'Unknown';
        templateName = `Transfer from ${fromAccount} to ${toAccount}`;
      } else {
        const categoryName = categories.find(c => c.id === transaction.category)?.name || 'Uncategorized';
        templateName = `${transaction.type === 'income' ? 'Income' : 'Expense'}: ${categoryName}`;
      }

      setFormData({
        template_name: templateName,
        frequency: 'monthly',
        interval_value: '1',
        start_date: today,
        end_date: '',
        note: transaction.note || '',
      });
    }
  }, [isOpen, transaction, accounts, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transaction) {
      toast.error('No transaction selected');
      return;
    }
    
    // Validation
    if (!formData.template_name.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    if (!formData.start_date) {
      toast.error('Start date is required');
      return;
    }

    setIsSaving(true);
    
    try {
      const templateData = {
        template_name: formData.template_name.trim(),
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category,
        account_id: transaction.account_id,
        to_account_id: transaction.to_account_id,
        note: formData.note.trim() || null,
        frequency: formData.frequency,
        interval_value: parseInt(formData.interval_value),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      };

      await recurringService.createRecurringTemplate(templateData);
      onSave();
    } catch (error) {
      console.error('Error creating recurring template:', error);
      toast.error('Failed to create recurring template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !transaction) return null;

  // Get transaction details for display
  const categoryName = categories.find(c => c.id === transaction.category)?.name || 'Uncategorized';
  const accountName = accounts.find(a => a.id === transaction.account_id)?.name || 'Unknown';
  const toAccountName = transaction.to_account_id ? accounts.find(a => a.id === transaction.to_account_id)?.name : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Repeat className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Create Recurring Template</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            disabled={isSaving}
          >
            <X size={24} />
          </button>
        </div>

        {/* Transaction Preview */}
        <div className="p-6 bg-gray-50 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Based on Transaction:</h3>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.type === 'income' ? 'bg-green-100 text-green-800' :
                    transaction.type === 'expense' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {transaction.type}
                  </span>
                  <span className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</span>
                </div>
                
                {transaction.type === 'transfer' ? (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{accountName}</span> → <span className="font-medium">{toAccountName}</span>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-gray-800">{categoryName}</div>
                    <div className="text-sm text-gray-600">{accountName}</div>
                  </div>
                )}
                
                {transaction.note && (
                  <div className="text-sm text-gray-500 mt-1">{transaction.note}</div>
                )}
              </div>
              <div className={`text-lg font-bold ${
                transaction.type === 'income' ? 'text-green-600' :
                transaction.type === 'expense' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {transaction.type === 'income' ? '+' : ''}
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaction.amount)}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                placeholder="e.g., Monthly Rent, Weekly Groceries"
                required
              />
            </div>

            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: FrequencyType) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="interval">Every</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                value={formData.interval_value}
                onChange={(e) => setFormData(prev => ({ ...prev, interval_value: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Optional note for the recurring template"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[140px]">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}