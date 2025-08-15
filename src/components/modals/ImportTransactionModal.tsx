// src/components/modals/ImportTransactionModal.tsx
"use client";

import { useState, useRef, useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { isValid, parse } from 'date-fns';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'result';
type ParsedRow = Record<string, string>;
type MappedRow = Record<string, string | undefined>;
type Status = 'ok' | 'error_account_not_found' | 'error_category_not_found' | 'error_invalid_data';
interface PreviewRow {
    original: ParsedRow;
    mapped: MappedRow;
    status: Status;
    message: string;
}

const requiredFields = ['tanggal', 'jenis', 'jumlah', 'akun_sumber'];
const allFields = [...requiredFields, 'kategori', 'akun_tujuan', 'catatan'];

export default function ImportTransactionModal({ isOpen, onClose }: ImportModalProps) {
  const { householdId, accounts, categories, refetchData } = useAppData();
  const [step, setStep] = useState<Step>('upload');
  const [/*file*/, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<{ imported: number, skipped: number }>({ imported: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload'); setFile(null); setParsedData([]); setHeaders([]);
    setMapping({}); setPreviewRows([]); setResult({ imported: 0, skipped: 0 });
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
        if (selectedFile.type !== 'text/csv') { toast.error("File tidak valid. Harap unggah file dengan format .csv"); return; }
        setFile(selectedFile);
        Papa.parse(selectedFile, {
            header: true, skipEmptyLines: true,
            complete: (results) => {
                setParsedData(results.data as ParsedRow[]);
                const fileHeaders = results.meta.fields || [];
                setHeaders(fileHeaders);
                const newMapping: Record<string, string> = {};
                allFields.forEach(field => {
                    const foundHeader = fileHeaders.find(h => h.toLowerCase().replace(/ /g, '_') === field);
                    if (foundHeader) newMapping[field] = foundHeader;
                });
                setMapping(newMapping);
                setStep('mapping');
            }
        });
    }
  };

  const handleProcessMapping = () => {
    const missingFields = requiredFields.filter(f => !mapping[f]);
    if (missingFields.length > 0) { toast.error(`Kolom wajib belum dipetakan: ${missingFields.join(', ')}`); return; }
    
    const accountMap = new Map(accounts.map(a => [a.name.toLowerCase(), a.id]));
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    const newPreviewRows = parsedData.map(row => {
        const mapped: MappedRow = {};
        allFields.forEach(field => { mapped[field] = row[mapping[field]]; });
        let status: Status = 'ok';
        let message = 'Siap untuk diimpor';
        const parsedDate = parse(mapped.tanggal || '', 'yyyy-MM-dd', new Date());
        
        if (!mapped.tanggal || !mapped.jenis || !mapped.jumlah || !mapped.akun_sumber) { status = 'error_invalid_data'; message = 'Data wajib (tanggal, jenis, jumlah, akun_sumber) tidak lengkap.';
        } else if (!isValid(parsedDate)) { status = 'error_invalid_data'; message = `Format tanggal '${mapped.tanggal}' tidak valid (harusnya YYYY-MM-DD).`;
        } else if (!['income', 'expense', 'transfer'].includes((mapped.jenis || '').toLowerCase())) { status = 'error_invalid_data'; message = `Jenis transaksi '${mapped.jenis}' tidak valid. Gunakan 'income', 'expense', atau 'transfer'.`;
        } else if (isNaN(parseFloat(mapped.jumlah))) { status = 'error_invalid_data'; message = `Jumlah '${mapped.jumlah}' bukan angka yang valid.`;
        } else if (!accountMap.has((mapped.akun_sumber || '').toLowerCase())) { status = 'error_account_not_found'; message = `Akun sumber '${mapped.akun_sumber}' tidak ditemukan di aplikasi Anda.`;
        } else if (mapped.jenis.toLowerCase() === 'transfer') {
            if (!mapped.akun_tujuan) { status = 'error_invalid_data'; message = 'Akun tujuan wajib diisi untuk jenis transfer.';
            } else if (!accountMap.has((mapped.akun_tujuan || '').toLowerCase())) { status = 'error_account_not_found'; message = `Akun tujuan '${mapped.akun_tujuan}' tidak ditemukan di aplikasi Anda.`; }
        } else {
            if (!mapped.kategori) { status = 'error_invalid_data'; message = 'Kategori wajib diisi untuk pemasukan/pengeluaran.';
            } else if (!categoryMap.has((mapped.kategori || '').toLowerCase())) {
                status = 'error_category_not_found'; message = `Kategori '${mapped.kategori}' tidak ditemukan di aplikasi Anda.`;
            }
        }
        return { original: row, mapped, status, message };
    });
    setPreviewRows(newPreviewRows);
    setStep('preview');
  };
  
  const handleImport = async () => {
    if (!householdId) return;
    setStep('importing');
    const accountMap = new Map(accounts.map(a => [a.name.toLowerCase(), a.id]));
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    const validRowsToSubmit = previewRows
      .filter(r => r.status === 'ok')
      .map(r => ({
          ...r.mapped,
          akun_sumber_id: accountMap.get((r.mapped.akun_sumber || '').toLowerCase()),
          akun_tujuan_id: r.mapped.jenis === 'transfer' ? accountMap.get((r.mapped.akun_tujuan || '').toLowerCase()) : null,
          kategori_id: r.mapped.jenis !== 'transfer' ? categoryMap.get((r.mapped.kategori || '').toLowerCase()) : null,
      }));

    const { data, error } = await supabase.rpc('import_transactions_batch', { p_transactions: validRowsToSubmit, p_household_id: householdId });
    if (error || (data && data[0].error_message)) {
        toast.error(`Terjadi kesalahan saat impor: ${error?.message || data[0].error_message}`);
        resetState();
    } else {
        setResult({ imported: data[0].imported_count, skipped: 0 });
        setStep('result');
        refetchData();
    }
  };

  const { errorCount, okCount } = useMemo(() => {
    return previewRows.reduce((acc, row) => {
        if (row.status === 'ok') acc.okCount++;
        else acc.errorCount++;
        return acc;
    }, { errorCount: 0, okCount: 0 });
  }, [previewRows]);

  const StatusIcon = ({ status }: { status: Status }) => {
    if (status === 'ok') return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetState(); onClose(); } }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>Impor Transaksi dari CSV</DialogTitle></DialogHeader>
        {step === 'upload' && ( <div className="py-6 text-center"> <div onClick={() => fileInputRef.current?.click()} className="p-10 border-2 border-dashed rounded-lg hover:bg-gray-50 cursor-pointer"> <UploadCloud className="mx-auto h-12 w-12 text-gray-400" /> <p className="mt-2 text-sm font-semibold">Klik untuk memilih file</p> <p className="text-xs text-gray-500">Hanya file .csv yang didukung</p> <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} className="hidden" accept=".csv" /> </div> <a href="/template_impor_transaksi.csv" download className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"> <FileText className="h-4 w-4" /> Unduh Template </a> </div> )}
        {step === 'mapping' && ( <div> <DialogDescription className="mb-4">Cocokkan kolom dari file Anda dengan kolom yang dibutuhkan oleh aplikasi.</DialogDescription> <div className="grid grid-cols-2 gap-4"> {allFields.map(field => ( <div key={field} className="grid grid-cols-2 items-center gap-2"> <Label className="font-semibold capitalize">{field.replace('_', ' ')} {requiredFields.includes(field) && '*'}</Label> <select value={mapping[field] || ''} onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))} className="w-full p-2 border rounded-md"> <option value="" disabled>Pilih Kolom...</option> {headers.map(h => <option key={h} value={h}>{h}</option>)} </select> </div> ))} </div> <DialogFooter className="mt-6"><Button onClick={handleProcessMapping}>Lanjutkan ke Pratinjau</Button></DialogFooter> </div> )}
        {step === 'preview' && ( <div className="space-y-4"> {errorCount > 0 && (<div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"><b>{errorCount} baris mengandung error</b> dan akan dilewati. Arahkan kursor ke ikon silang merah untuk melihat detailnya. Perbaiki file CSV Anda lalu unggah kembali.</div>)} <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
          {/* --- PERBAIKAN HYDRATION WARNING DI SINI --- */}
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b">
                <th className="p-2 text-left w-12">Status</th>
                {allFields.map(f => <th key={f} className="p-2 text-left capitalize">{f.replace('_', ' ')}</th>)}
              </tr>
            </thead>
            <tbody>{previewRows.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 align-top">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help"><StatusIcon status={row.status} /></div>
                  </TooltipTrigger><TooltipContent><p>{row.message}</p></TooltipContent></Tooltip></TooltipProvider>
                </td>
                {allFields.map(f => <td key={f} className="p-2 align-top truncate max-w-[100px]">{row.mapped[f]}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div> <DialogFooter className="mt-6"> <Button variant="outline" onClick={() => setStep('mapping')}>Kembali</Button> <Button onClick={handleImport} disabled={okCount === 0}>Impor {okCount} Transaksi</Button> </DialogFooter> </div> )}
        {step === 'importing' && (<div className="py-20 flex flex-col items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /><p className="mt-4">Mengimpor transaksi...</p></div>)}
        {step === 'result' && ( <div className="py-10 text-center"> <CheckCircle className="mx-auto h-16 w-16 text-green-500" /> <h3 className="mt-4 text-xl font-semibold">Impor Selesai!</h3> <p>{result.imported} transaksi berhasil diimpor.</p> <Button onClick={onClose} className="mt-6">Tutup</Button> </div> )}
      </DialogContent>
    </Dialog>
  );
}