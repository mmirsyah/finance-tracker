// src/components/modals/CategoryModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Category } from '@/types';
import toast from 'react-hot-toast';

type CategoryType = 'income' | 'expense';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Category>) => void;
  category: Partial<Category> | null;
  parentCategories: Category[];
}

export default function CategoryModal({ isOpen, onClose, onSave, category, parentCategories }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [parentId, setParentId] = useState<number | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setType(category.type as CategoryType);
      setParentId(category.parent_id || null);
    } else {
      setName('');
      setType('expense');
      setParentId(null);
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error('Category name is required.');
    onSave({ id: category?.id, name, type, parent_id: parentId });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{category?.id ? 'Edit Category' : 'Add New Category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value as CategoryType)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700">Parent Category</label>
              <select id="parent_id" value={parentId || ''} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" >
                <option value="">--- None (Top Level) ---</option>
                {parentCategories.filter(p => p.type === type && p.id !== category?.id).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Category</button>
          </div>
        </form>
      </div>
    </div>
  );
};
