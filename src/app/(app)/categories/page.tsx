// src/app/(app)/categories/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CategoryModal from '@/components/modals/CategoryModal';
import ReassignCategoryModal from '@/components/modals/ReassignCategoryModal';
import { toast } from 'sonner';
import * as categoryService from '@/lib/categoryService';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import TableSkeleton from '@/components/skeletons/TableSkeleton';

const CategoryRow = ({ category, onEdit, onDelete, onNavigate }: { category: Category & { children?: Category[] }, onEdit: (cat: Category) => void, onDelete: (cat: Category) => void, onNavigate: (id: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                    {category.children && category.children.length > 0 && (
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    )}
                    <button onClick={() => onNavigate(category.id)} className={cn("text-left", !(category.children && category.children.length > 0) && "ml-12")}>
                      <p className="font-medium">{category.name}</p>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(category)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(category)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
            </div>
            {category.children && category.children.length > 0 && (
                <CollapsibleContent>
                    <div className="pl-12 border-l ml-6">
                        {category.children.map(child => (
                           <div key={child.id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0">
                               <button onClick={() => onNavigate(child.id)} className="text-left">
                                  <p className="font-medium text-gray-700">{child.name}</p>
                               </button>
                               <div className="flex items-center gap-2">
                                   <Button variant="ghost" size="icon" onClick={() => onEdit(child)}><Edit className="h-4 w-4" /></Button>
                                   <Button variant="ghost" size="icon" onClick={() => onDelete(child)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                               </div>
                           </div>
                        ))}
                    </div>
                </CollapsibleContent>
            )}
        </Collapsible>
    )
}

export default function CategoriesPage() {
    const router = useRouter();
    const { categories, refetchData, isLoading, user, householdId } = useAppData();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

    const { parentCategories, categoryTree } = useMemo(() => {
        const parentCats = categories.filter(c => c.parent_id === null);
        const childMap = categories.reduce((acc, cat) => {
            if(cat.parent_id) {
                if(!acc[cat.parent_id]) acc[cat.parent_id] = [];
                acc[cat.parent_id].push(cat);
            }
            return acc;
        }, {} as Record<number, Category[]>);

        const tree = parentCats.map(p => ({
            ...p,
            children: childMap[p.id] || []
        }));

        return { parentCategories: parentCats, categoryTree: tree };
    }, [categories]);

    const handleSaveCategory = async (payload: Partial<Category>) => {
        if (!user || !householdId) return toast.error("User session not found.");
        const promise = categoryService.saveCategory({ ...payload, user_id: user.id, household_id: householdId })
            .then(() => {
                refetchData();
                setIsModalOpen(false);
            });
        
        toast.promise(promise, {
            loading: 'Menyimpan kategori...',
            success: 'Kategori berhasil disimpan!',
            error: (err: Error) => `Gagal: ${err.message}`
        });
    };

    const handleDeleteCategory = async (category: Category) => {
        const { count, error } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('category', category.id);
        
        if (error) return toast.error(`Error: ${error.message}`);
        
        if ((count || 0) > 0) {
            setCategoryToDelete(category);
            setIsReassignModalOpen(true);
        } else {
            if (confirm(`Anda yakin ingin menghapus kategori "${category.name}"?`)) {
                const promise = categoryService.deleteCategory(category.id).then(refetchData);
                toast.promise(promise, {
                    loading: 'Menghapus...',
                    success: 'Kategori berhasil dihapus!',
                    error: (err: Error) => `Gagal: ${err.message}`
                });
            }
        }
    };
    
    const handleReassignAndDelete = (toCategoryId: number) => {
        if (!categoryToDelete) return;
        // --- PERBAIKAN: Menggunakan nama fungsi yang benar ---
        const promise = categoryService.reassignAndDeleteCategory(categoryToDelete.id, toCategoryId).then(refetchData);
        toast.promise(promise, {
            loading: 'Memindahkan & menghapus...',
            success: 'Kategori berhasil dihapus!',
            error: (err: Error) => `Gagal: ${err.message}`
        });
        setIsReassignModalOpen(false);
        setCategoryToDelete(null);
    };

    if (isLoading) {
        return <div className="p-6"><TableSkeleton /></div>;
    }

    return (
        <>
            <div className="p-6">
                 <div className="sticky top-0 z-10 bg-gray-50/75 backdrop-blur-sm p-6 -mx-6 -mt-6 mb-6 border-b border-gray-200 flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Manage Categories</h1>
                    <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="flex items-center gap-2">
                        <Plus size={20} /> Add New
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Kategori</CardTitle>
                        <CardDescription>Atur kategori pengeluaran dan pemasukan Anda di sini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                           {categoryTree.map(category => (
                               <CategoryRow 
                                   key={category.id}
                                   category={category}
                                   onEdit={(cat) => { setEditingCategory(cat); setIsModalOpen(true); }}
                                   onDelete={handleDeleteCategory}
                                   onNavigate={(id) => router.push(`/categories/${id}`)}
                               />
                           ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <CategoryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCategory}
                category={editingCategory}
                parentCategories={parentCategories}
            />
            
            <ReassignCategoryModal 
                isOpen={isReassignModalOpen}
                onClose={() => setIsReassignModalOpen(false)}
                onReassign={handleReassignAndDelete}
                categoryToDelete={categoryToDelete}
                allCategories={categories}
            />
        </>
    );
}