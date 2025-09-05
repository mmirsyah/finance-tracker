// src/app/(app)/categories/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Edit, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CategoryModal from '@/components/modals/CategoryModal';
import { toast } from 'sonner';
import * as categoryService from '@/lib/categoryService';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import DynamicIcon from '@/components/DynamicIcon';

const CategoryRow = ({ 
    category, 
    onEdit, 
    onArchive, 
    onDelete, 
    onNavigate 
}: { 
    category: Category & { children?: Category[] }, 
    onEdit: (cat: Category) => void, 
    onArchive: (cat: Category) => void, 
    onDelete: (cat: Category) => void,
    onNavigate: (id: number) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    // PERBAIKAN: Menghapus @ts-ignore yang tidak perlu
    const isArchived = category.is_archived;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn("flex items-center justify-between p-3 hover:bg-gray-50", isArchived && "bg-gray-100 opacity-60")}>
                <div className="flex items-center gap-2">
                    {category.children && category.children.length > 0 && (
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </CollapsibleTrigger>
                    )}
                    <button onClick={() => onNavigate(category.id)} className={cn("flex items-center gap-3 text-left", !(category.children && category.children.length > 0) && "ml-12")}>
                      {category.icon && <DynamicIcon name={category.icon} className="h-5 w-5 text-gray-700" />}
                      <p className="font-medium">{category.name}</p>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {isArchived ? (
                        <Button variant="ghost" size="sm" onClick={() => onArchive(category)}>
                            <ArchiveRestore className="h-4 w-4 mr-2"/> Pulihkan
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" size="icon" onClick={() => onEdit(category)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => (category.parent_id ? onArchive(category) : onDelete(category))}>
                                {category.parent_id ? <Archive className="h-4 w-4 text-yellow-600" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {category.children && category.children.length > 0 && (
                <CollapsibleContent>
                    <div className="pl-12 border-l ml-6">
                        {category.children.map(child => (
                           <div key={child.id} className={cn("flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0", child.is_archived && "bg-gray-100 opacity-60")}>
                               <button onClick={() => onNavigate(child.id)} className="flex items-center gap-3 text-left">
                                  {child.icon && <DynamicIcon name={child.icon} className="h-5 w-5 text-gray-600" />}
                                  <p className="font-medium text-gray-700">{child.name}</p>
                               </button>
                               <div className="flex items-center gap-2">
                                   {child.is_archived ? (
                                        <Button variant="ghost" size="sm" onClick={() => onArchive(child)}>
                                            <ArchiveRestore className="h-4 w-4 mr-2"/> Pulihkan
                                        </Button>
                                   ) : (
                                    <>
                                       <Button variant="ghost" size="icon" onClick={() => onEdit(child)}><Edit className="h-4 w-4" /></Button>
                                       <Button variant="ghost" size="icon" onClick={() => onArchive(child)}><Archive className="h-4 w-4 text-yellow-600" /></Button>
                                    </>
                                   )}
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
    const [showArchived, setShowArchived] = useState(false);

    const { parentCategories, categoryTree } = useMemo(() => {
        const activeCategories = showArchived ? categories : categories.filter(c => !c.is_archived);

        const parentCats = activeCategories.filter(c => c.parent_id === null);
        const childMap = activeCategories.reduce((acc, cat) => {
            if(cat.parent_id) {
                if(!acc[cat.parent_id]) acc[cat.parent_id] = [];
                acc[cat.parent_id].push(cat);
            }
            return acc;
        }, {} as Record<number, Category[]>);

        const tree = parentCats.map(p => ({
            ...p,
            children: childMap[p.id]?.sort((a,b) => a.name.localeCompare(b.name)) || []
        }));

        return { parentCategories: parentCats, categoryTree: tree };
    }, [categories, showArchived]);

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

    const handleArchiveToggle = async (category: Category) => {
        // PERBAIKAN: Menghapus @ts-ignore yang tidak perlu
        const newStatus = !category.is_archived;
        const actionText = newStatus ? 'Mengarsipkan' : 'Memulihkan';
        
        const promise = categoryService.setCategoryArchiveStatus(category.id, newStatus).then(refetchData);

        toast.promise(promise, {
            loading: `${actionText} kategori...`,
            success: `Kategori "${category.name}" berhasil di${newStatus ? 'arsipkan' : 'pulihkan'}!`,
            error: (err: Error) => `Gagal: ${err.message}`
        });
    };
    
    const handleDeleteParentCategory = async (category: Category) => {
        if (category.children && category.children.length > 0) {
            return toast.error("Tidak bisa menghapus kategori induk. Harap arsipkan atau hapus semua sub-kategorinya terlebih dahulu.");
        }
        
        const supabase = createClient();
        const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category', category.id);
        if ((count || 0) > 0) {
            return toast.error("Kategori ini memiliki transaksi. Harap arsipkan saja jika sudah tidak digunakan.");
        }

        if (confirm(`Anda yakin ingin menghapus permanen kategori "${category.name}"? Aksi ini tidak bisa dibatalkan.`)) {
            const promise = categoryService.deleteCategory(category.id).then(refetchData);
            toast.promise(promise, {
                loading: 'Menghapus...',
                success: 'Kategori berhasil dihapus!',
                error: (err: Error) => `Gagal: ${err.message}`
            });
        }
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
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Daftar Kategori</CardTitle>
                                <CardDescription>Atur kategori pengeluaran dan pemasukan Anda di sini.</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
                                <Label htmlFor="show-archived">Tampilkan Arsip</Label>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                           {categoryTree.map(category => (
                               <CategoryRow 
                                   key={category.id}
                                   category={category}
                                   onEdit={(cat) => { setEditingCategory(cat); setIsModalOpen(true); }}
                                   onArchive={handleArchiveToggle}
                                   onDelete={handleDeleteParentCategory}
                                   onNavigate={(id) => router.push(`/categories/${id}`)}
                               />
                           ))}
                           {categoryTree.length === 0 && (
                                <p className="p-8 text-center text-gray-500">
                                    {showArchived ? "Tidak ada kategori yang diarsipkan." : "Belum ada kategori aktif."}
                                </p>
                           )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <CategoryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCategory}
                category={editingCategory}
                parentCategories={parentCategories.filter(c => !c.is_archived)}
            />
        </>
    );
}