// src/components/modals/RecurringTemplateModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { RecurringTemplate, Account, Category, FrequencyType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryCombobox } from '@/components/CategoryCombobox';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import * as recurringService from '@/lib/recurringService';

interface RecurringTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  template: RecurringTemplate | null;
  accounts: Account[];
  categories: Category[];
}

const frequencyOptions: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function RecurringTemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
  accounts,
  categories,
}: RecurringTemplateModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    template_name: '',
    type: 'expense' as 'expense' | 'income' | 'transfer',
    amount: '',
    category_id: '',
    account_id: '',
    to_account_id: '',
    note: '',
    frequency: 'monthly' as FrequencyType,
    interval_value: '1',
    start_date: '',
    end_date: '',
  });

  // Filter accounts (exclude Modal Awal Aset)
  const filteredAccounts = accounts.filter(acc => acc.name !== 'Modal Awal Aset');

  // Get relevant categories based on transaction type
  const relevantCategories = categories.filter(c => c.type === formData.type && !c.is_archived);

  useEffect(() => {
    if (isOpen) {
      if (template) {
        // Edit mode - debug log to see what data we're getting
        console.log('Template data for edit:', template);
        
        setFormData({
          template_name: template.template_name || '',
          type: template.type || 'expense',
          amount: template.amount?.toString() || '',
          category_id: template.category_id?.toString() || '',
          account_id: template.account_id || '',
          to_account_id: template.to_account_id || '',
          note: template.note || '',
          frequency: template.frequency || 'monthly',
          interval_value: template.interval_value?.toString() || '1',
          start_date: template.start_date || '',
          end_date: template.end_date || '',
        });
      } else {
        // Create mode
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          template_name: '',
          type: 'expense',
          amount: '',
          category_id: '',
          account_id: '',
          to_account_id: '',
          note: '',
          frequency: 'monthly',
          interval_value: '1',
          start_date: today,
          end_date: '',
        });
      }
    }
  }, [isOpen, template]);

  const handleTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      category_id: '', // Reset category when type changes
      to_account_id: newType === 'transfer' ? prev.to_account_id : '', // Keep to_account_id only for transfers
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.template_name.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    
    if (!formData.account_id) {
      toast.error('Account is required');
      return;
    }
    
    if (formData.type === 'transfer') {
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
    
    if (!formData.start_date) {
      toast.error('Start date is required');
      return;
    }

    setIsSaving(true);
    
    try {
      const templateData = {
        template_name: formData.template_name.trim(),
        type: formData.type,
        amount: parseFloat(formData.amount),
        category_id: formData.type !== 'transfer' ? parseInt(formData.category_id) : null,
        account_id: formData.account_id,
        to_account_id: formData.type === 'transfer' ? formData.to_account_id : null,
        note: formData.note.trim() || null,
        frequency: formData.frequency,
        interval_value: parseInt(formData.interval_value),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      };

      if (template) {
        await recurringService.updateRecurringTemplate({
          ...templateData,
          template_id: template.id,
        });
        toast.success('Template updated successfully');
      } else {
        await recurringService.createRecurringTemplate(templateData);
        toast.success('Template created successfully');
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {template ? 'Edit Recurring Template' : 'Create Recurring Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            disabled={isSaving}
          >
            <X size={24} />
          </button>
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
              <Label htmlFor="type">Transaction Type *</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            {formData.type !== 'transfer' && (
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
                {formData.type === 'transfer' ? 'From Account *' : 'Account *'}
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

            {formData.type === 'transfer' && (
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
                placeholder="Optional note"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[120px]">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                template ? 'Update Template' : 'Create Template'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}