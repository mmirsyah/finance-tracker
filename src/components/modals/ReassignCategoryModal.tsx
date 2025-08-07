// src/components/modals/ReassignCategoryModal.tsx
"use client";

import { useState } from 'react';
import { Category } from '@/types';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReassignCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReassign: (oldCatId: number, newCatId: number) => void;
  categoryToDelete: Category | null;
  allCategories: Category[];
}

export default function ReassignCategoryModal({ isOpen, onClose, onReassign, categoryToDelete, allCategories }: ReassignCategoryModalProps) {
  const [newCategoryId, setNewCategoryId] = useState<string>('');

  if (!isOpen || !categoryToDelete) return null;

  const validTargetCategories = allCategories.filter(cat => cat.type === categoryToDelete.type && cat.id !== categoryToDelete.id);

  const handleReassign = () => {
    if (!newCategoryId) return toast.error('Please select a new category to reassign transactions to.');
    onReassign(categoryToDelete.id, Number(newCategoryId));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
          <h2 className="text-xl font-bold">Reassign Transactions</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">The category &quot;<strong>{categoryToDelete.name}</strong>&quot; has transactions linked to it. To delete it, you must first reassign these transactions to another category.</p>
        <div className="space-y-2">
          <label htmlFor="reassign_category" className="block text-sm font-medium text-gray-700">Reassign to:</label>
          <select id="reassign_category" value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" >
            <option value="" disabled>Select a new category...</option>
            {validTargetCategories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="button" onClick={handleReassign} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reassign & Delete</button>
        </div>
      </div>
    </div>
  );
};
