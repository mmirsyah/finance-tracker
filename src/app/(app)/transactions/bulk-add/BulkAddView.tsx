// src/app/(app)/transactions/bulk-add/BulkAddView.tsx
"use client";

import { useState } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ArrowLeft, Save, Loader2, ChevronsDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

type BulkRow = {
    id: number;
    date: string;
    type: 'income' | 'expense';
    amount: string;
    category_id: string;
    account_id: string;
    note: string;
};

const createNewRow = (): BulkRow => ({
    id: Date.now() + Math.random(),
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense',
    amount: '',
    category_id: '',
    account_id: '',
    note: '',
});

export default function BulkAddView() {
    const router = useRouter();
    const { householdId, accounts, categories, refetchData } = useAppData();
    const [rows, setRows] = useState<BulkRow[]>([createNewRow(), createNewRow(), createNewRow()]);
    const [isSaving, setIsSaving] = useState(false);

    const handleRowChange = (index: number, field: keyof Omit<BulkRow, 'id'>, value: string) => {
        const newRows = [...rows];
        const rowToUpdate = { ...newRows[(index)] };

        if (field === 'type') {
            rowToUpdate.type = value as 'income' | 'expense';
            rowToUpdate.category_id = '';
        } else {
            rowToUpdate[(field)] = value;
        }

        newRows[(index)] = rowToUpdate;
        setRows(newRows);
    };

    const addRow = () => setRows([...rows, createNewRow()]);
    const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

    const handleCopyDown = (fromIndex: number, field: keyof Omit<BulkRow, 'id'>) => {
        if (fromIndex >= rows.length - 1) return;

        const valueToCopy = rows[(fromIndex)][(field)];
        const newRows = [...rows];

        for (let i = fromIndex + 1; i < newRows.length; i++) {
            const rowToUpdate = { ...newRows[(i)] };
            if (field === 'type') {
                rowToUpdate.type = valueToCopy as 'income' | 'expense';
                rowToUpdate.category_id = '';
            } else {
                rowToUpdate[(field)] = valueToCopy;
            }
            newRows[(i)] = rowToUpdate;
        }

        setRows(newRows);
        toast.info(`'${field.replace(/_/g, ' ')}' disalin ke semua baris di bawah.`);
    };

    const handleSave = async () => {
        if (!householdId) return toast.error("Sesi tidak valid.");

        const validRows = rows.filter(row => row.amount && Number(row.amount) > 0 && row.category_id && row.account_id && row.date && row.type);
        if (validRows.length === 0) {
            return toast.error("Tidak ada baris yang valid untuk disimpan. Harap lengkapi data.");
        }

        setIsSaving(true);
        const payload = validRows.map(row => ({
            tanggal: row.date,
            jenis: row.type,
            jumlah: Number(row.amount),
            kategori_id: Number(row.category_id),
            akun_sumber_id: row.account_id,
            akun_tujuan_id: null,
            catatan: row.note
        }));

        const { data, error } = await supabase.rpc('import_transactions_batch', { p_transactions: payload, p_household_id: householdId });

        if (error || (data && data[(0)].error_message)) {
            toast.error(`Gagal menyimpan: ${error?.message || data[(0)].error_message}`);
        } else {
            toast.success(`${data[(0)].imported_count} transaksi berhasil disimpan!`);
            refetchData();
            router.push('/transactions');
        }
        setIsSaving(false);
    };

    interface CopyableCellProps {
        children: React.ReactNode;
        onCopy: () => void;
        isLastRow: boolean;
    }
    const CopyableCell = ({ children, onCopy, isLastRow }: CopyableCellProps) => (
        <TableCell className="group relative pr-8"> {/* Kurangi padding kanan */}
            {children}
            {!isLastRow && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-0 -translate-y-1/2 h-6 w-6 opacity-40 group-hover:opacity-100 transition-opacity" // Ukuran & opacity diubah
                    title="Salin ke bawah"
                    onClick={onCopy}
                >
                    <ChevronsDown className="h-3 w-3" /> {/* Ukuran ikon diubah */}
                </Button>
            )}
        </TableCell>
    );

    return (
        <div className="p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                <h1 className="text-2xl font-bold">Input Transaksi Massal</h1>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Tanggal</TableHead>
                                <TableHead className="w-[180px]">Jenis</TableHead>
                                <TableHead>Jumlah</TableHead>
                                <TableHead className="w-[200px]">Kategori</TableHead>
                                <TableHead className="w-[200px]">Akun</TableHead>
                                <TableHead>Catatan</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={row.id}>
                                    <CopyableCell isLastRow={index === rows.length - 1} onCopy={() => handleCopyDown(index, 'date')}>
                                        <Input type="date" value={row.date} onChange={(e) => handleRowChange(index, 'date', e.target.value)} />
                                    </CopyableCell>
                                    <CopyableCell isLastRow={index === rows.length - 1} onCopy={() => handleCopyDown(index, 'type')}>
                                        <Select value={row.type} onValueChange={(value) => handleRowChange(index, 'type', value)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent>
                                        </Select>
                                    </CopyableCell>
                                    <TableCell><Input type="number" placeholder="0" value={row.amount} onChange={(e) => handleRowChange(index, 'amount', e.target.value)} /></TableCell>
                                    <CopyableCell isLastRow={index === rows.length - 1} onCopy={() => handleCopyDown(index, 'category_id')}>
                                        <Select value={row.category_id} onValueChange={(value) => handleRowChange(index, 'category_id', value)}>
                                            <SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                                            <SelectContent>
                                                {categories.filter(c => c.type === row.type).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </CopyableCell>
                                    <CopyableCell isLastRow={index === rows.length - 1} onCopy={() => handleCopyDown(index, 'account_id')}>
                                        <Select value={row.account_id} onValueChange={(value) => handleRowChange(index, 'account_id', value)}>
                                            <SelectTrigger><SelectValue placeholder="Pilih akun..." /></SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </CopyableCell>
                                    <TableCell><Input placeholder="Opsional" value={row.note} onChange={(e) => handleRowChange(index, 'note', e.target.value)} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => removeRow(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <Button variant="outline" onClick={addRow}><Plus className="mr-2 h-4 w-4" />Tambah Baris</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Simpan Semua
                    </Button>
                </div>
            </div>
        </div>
    );
}