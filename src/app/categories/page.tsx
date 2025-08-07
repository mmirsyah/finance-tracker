// src/app/categories/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAppData } from '@/contexts/AppDataContext';
import * as categoryService from '@/lib/categoryService';
import CategoryModal from '@/components/modals/CategoryModal';
import ReassignCategoryModal from '@/components/modals/ReassignCategoryModal';
import TableSkeleton from '@/components/skeletons/TableSkeleton'; // <-- Import Skeleton

const CategoryRow = ({ category, level, onEdit, onDelete }: { category: Category & { children?: Category[] }; level: number; onEdit: (cat: Category) => void; onDelete: (cat: Category) => void; }) => (
  <>
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}>
        {level > 0 && <span className="mr-2 text-gray-400">└─</span>}
        <Link href={`/categories/${category.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{category.name}</Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {category.type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-4">
          <button onClick={() => onEdit(category)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button>
          <button onClick={() => onDelete(category)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
        </div>
      </td>
    </tr>
    {category.children && category.children.map(child => (
      <CategoryRow key={child.id} category={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
    ))}
  </>
);

export default function CategoriesPage() {
  const { categories: allCategories, isLoading: isAppDataLoading, user, householdId, refetchData } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const categoryTree = useMemo(() => {
    const map: Record<number, Category & { children: Category[] }> = {};
    const roots: (Category & { children: Category[] })[] = [];
    allCategories.forEach((cat) => { map[cat.id] = { ...cat, children: [] }; });
    allCategories.forEach((cat) => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        roots.push(map[cat.id]);
      }
    });
    roots.sort((a, b) => {
      if (a.type !== b.type) { return a.type === 'income' ? -1 : 1; }
      return a.name.localeCompare(b.name);
    });
    return roots;
  }, [allCategories]);

  const handleSaveCategory = async (payload: Partial<Category>) => {
    if (!user || !householdId) return toast.error('User session not found.');

    const promise = categoryService.saveCategory(payload, user.id, householdId)
      .then(() => refetchData());

    toast.promise(promise, {
      loading: 'Saving category...',
      success: 'Category saved successfully!',
      error: (err) => `Failed to save category: ${err.message}`,
    });
    
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (category: Category) => {
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category', category.id);

    if (error) return toast.error(`Error checking transactions: ${error.message}`);
    
    if ((count || 0) > 0) {
      setCategoryToDelete(category);
      setIsReassignModalOpen(true);
    } else {
      if (confirm(`Are you sure you want to delete the category "${category.name}"? This cannot be undone.`)) {
        const promise = categoryService.deleteCategory(category.id).then(() => refetchData());
        toast.promise(promise, {
          loading: 'Deleting category...',
          success: 'Category deleted successfully!',
          error: (err) => `Failed to delete category: ${err.message}`,
        });
      }
    }
  };

  const handleReassignAndDelele = async (oldCatId: number, newCatId: number) => {
    const promise = categoryService.reassignAndDeleleCategory(oldCatId, newCatId)
      .then(() => refetchData());

    toast.promise(promise, {
      loading: 'Reassigning and deleting...',
      success: 'Category deleted successfully!',
      error: (err) => err.message,
    });
    
    setIsReassignModalOpen(false);
    setCategoryToDelete(null);
  };

  const handleAddNew = () => { setEditingCategory(null); setIsModalOpen(true); };
  const handleEdit = (category: Category) => { setEditingCategory(category); setIsModalOpen(true); };
  
  return (
    <div className="p-6">
      <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-6 -mx-6 -mt-6 mb-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        <button onClick={handleAddNew} disabled={isAppDataLoading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
          <Plus size={20} /> Add New
        </button>
      </div>
      {/* --- PERUBAHAN DI SINI: Tampilkan Skeleton saat loading --- */}
      {isAppDataLoading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryTree.map((cat) => (
                <CategoryRow key={cat.id} category={cat} level={0} onEdit={handleEdit} onDelete={handleDeleteCategory} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveCategory} category={editingCategory} parentCategories={allCategories.filter((c) => !c.parent_id)} />
      <ReassignCategoryModal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} onReassign={handleReassignAndDelele} categoryToDelete={categoryToDelete} allCategories={allCategories} />
    </div>
  );
}
