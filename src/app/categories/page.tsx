// src/app/categories/page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

type CategoryType = 'income' | 'expense' | 'transfer';
type Profile = { id: string; full_name: string | null; household_id: string; }

const CategoryRow = ({ category, level, onEdit, onDelete }: { category: Category & { children?: Category[] }; level: number; onEdit: (cat: Category) => void; onDelete: (cat: Category) => void; }) => ( <> <tr> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}> {level > 0 && <span className="mr-2 text-gray-400">└─</span>} <Link href={`/categories/${category.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{category.name}</Link> </td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ category.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}> {category.type} </span> </td> <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"> <div className="flex justify-end gap-4"> <button onClick={() => onEdit(category)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button> <button onClick={() => onDelete(category)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button> </div> </td> </tr> {category.children && category.children.map(child => ( <CategoryRow key={child.id} category={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} /> ))} </> );
const CategoryModal = ({ isOpen, onClose, onSave, category, parentCategories }: { isOpen: boolean; onClose: () => void; onSave: (payload: Partial<Category>) => void; category: Partial<Category> | null; parentCategories: Category[]; }) => { const [name, setName] = useState(''); const [type, setType] = useState<CategoryType>('expense'); const [parentId, setParentId] = useState<number | null>(null); useEffect(() => { if (category) { setName(category.name || ''); setType(category.type as CategoryType); setParentId(category.parent_id || null); } else { setName(''); setType('expense'); setParentId(null); } }, [category, isOpen]); if (!isOpen) return null; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name) return alert('Category name is required.'); onSave({ id: category?.id, name, type, parent_id: parentId }); }; return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"> <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"> <h2 className="text-xl font-bold mb-4">{category?.id ? 'Edit Category' : 'Add New Category'}</h2> <form onSubmit={handleSubmit}> <div className="space-y-4"> <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required /></div> <div><label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label><select id="type" value={type} onChange={(e) => setType(e.target.value as CategoryType)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" ><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></div> <div><label htmlFor="parent_id" className="block text-sm font-medium text-gray-700">Parent Category</label><select id="parent_id" value={parentId || ''} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" ><option value="">--- None (Top Level) ---</option>{parentCategories.filter(p => p.type === type && p.id !== category?.id).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div> </div> <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Category</button></div> </form> </div> </div> ); };
const ReassignModal = ({ isOpen, onClose, onReassign, categoryToDelete, allCategories }: { isOpen: boolean; onClose: () => void; onReassign: (oldCatId: number, newCatId: number) => void; categoryToDelete: Category | null; allCategories: Category[]; }) => { const [newCategoryId, setNewCategoryId] = useState<string>(''); if (!isOpen || !categoryToDelete) return null; const validTargetCategories = allCategories.filter(cat => cat.type === categoryToDelete.type && cat.id !== categoryToDelete.id); const handleReassign = () => { if (!newCategoryId) return alert('Please select a new category to reassign transactions to.'); onReassign(categoryToDelete.id, Number(newCategoryId)); }; return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"> <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"> <div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-10 h-10 text-yellow-500" /><h2 className="text-xl font-bold">Reassign Transactions</h2></div><p className="text-sm text-gray-600 mb-4">The category &quot;<strong>{categoryToDelete.name}</strong>&quot; has transactions linked to it. To delete it, you must first reassign these transactions to another category.</p><div className="space-y-2"><label htmlFor="reassign_category" className="block text-sm font-medium text-gray-700">Reassign to:</label><select id="reassign_category" value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" ><option value="" disabled>Select a new category...</option>{validTargetCategories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button><button type="button" onClick={handleReassign} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reassign & Delete</button></div></div></div> ); };

export default function CategoriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchCategories = useCallback(async (householdId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId) // <-- PERBAIKAN: Filter berdasarkan household_id
      .order('name', { ascending: true });
    if (error) { console.error('Error fetching categories:', error); } 
    else { setAllCategories(data || []); }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function checkUser() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (userProfile) {
          setProfile(userProfile);
          await fetchCategories(userProfile.household_id);
          channel = supabase.channel('realtime-categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, 
            () => { if(userProfile) fetchCategories(userProfile.household_id) }
          ).subscribe();
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    }
    checkUser();
    return () => { if(channel) supabase.removeChannel(channel); };
  }, [router, fetchCategories]);
  
  const categoryTree = useMemo(() => {
    const map: Record<number, Category & { children: Category[] }> = {}; const roots: (Category & { children: Category[] })[] = [];
    allCategories.forEach((cat) => { map[cat.id] = { ...cat, children: [] }; });
    allCategories.forEach((cat) => { if (cat.parent_id && map[cat.parent_id]) { map[cat.parent_id].children.push(map[cat.id]); } else { roots.push(map[cat.id]); } });
    roots.sort((a, b) => { if (a.type !== b.type) { return a.type === 'income' ? -1 : 1; } return a.name.localeCompare(b.name); });
    return roots;
  }, [allCategories]);

  const handleSaveCategory = async (payload: Partial<Category>) => {
    if (!user || !profile) return alert('User profile is not ready. Please try again.');
    const { id, ...dataToSave } = payload;
    const finalPayload = { ...dataToSave, user_id: user.id, household_id: profile.household_id };
    let error;
    if (id) {
      ({ error } = await supabase.from('categories').update(finalPayload).eq('id', id));
    } else {
      ({ error } = await supabase.from('categories').insert([finalPayload]));
    }
    if (error) { alert(`Failed to save category: ${error.message}`); }
    else { await fetchCategories(profile.household_id); }
    setIsModalOpen(false); setEditingCategory(null);
  };
  const handleDeleteCategory = async (category: Category) => {
    if (!user || !profile) return;
    const { count, error: checkError } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category', category.id);
    if (checkError) { return alert(`Error checking transactions: ${checkError.message}`); }
    if ((count || 0) > 0) { setCategoryToDelete(category); setIsReassignModalOpen(true); } 
    else { 
      if (confirm(`Are you sure you want to delete the category "${category.name}"? This cannot be undone.`)) { 
        const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id); 
        if (deleteError) { alert(`Failed to delete category: ${deleteError.message}`); }
        else { await fetchCategories(profile.household_id); }
      } 
    }
  };
  const handleReassignAndDelele = async (oldCatId: number, newCatId: number) => {
    if (!user || !profile) return;
    const { error: updateError } = await supabase.from('transactions').update({ category: newCatId }).eq('category', oldCatId);
    if (updateError) { return alert(`Failed to reassign transactions: ${updateError.message}`); }
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', oldCatId);
    if (deleteError) { return alert(`Transactions were reassigned, but failed to delete the old category: ${deleteError.message}`); }
    else { await fetchCategories(profile.household_id); }
    setIsReassignModalOpen(false); setCategoryToDelete(null);
  };
  const handleAddNew = () => { setEditingCategory(null); setIsModalOpen(true); };
  const handleEdit = (category: Category) => { setEditingCategory(category); setIsModalOpen(true); };
  
  if (loading && !profile) return <div className="p-6">Loading...</div>;
  return (
    <div className="p-6">
      <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-6 -mx-6 -mt-6 mb-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        <button onClick={handleAddNew} disabled={loading || !profile} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><Plus size={20} /> Add New</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">{categoryTree.map((cat) => ( <CategoryRow key={cat.id} category={cat} level={0} onEdit={handleEdit} onDelete={handleDeleteCategory} /> ))}</tbody>
        </table>
      </div>
      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveCategory} category={editingCategory} parentCategories={allCategories.filter((c) => !c.parent_id)} />
      <ReassignModal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} onReassign={handleReassignAndDelele} categoryToDelete={categoryToDelete} allCategories={allCategories} />
    </div>
  );
}
