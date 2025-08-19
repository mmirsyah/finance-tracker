// src/components/modals/AssetTransactionModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { AssetTransaction, Account } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AssetTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Partial<AssetTransaction> & { from_account_id?: string, to_account_id?: string }) => void;
  transaction: Partial<AssetTransaction> | null;
  assetName: string;
  accounts: Account[]; // Akun 'generic' untuk sumber/tujuan dana
}

export default function AssetTransactionModal({ isOpen, onClose, onSave, transaction, assetName, accounts }: AssetTransactionModalProps) {
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [linkedAccountId, setLinkedAccountId] = useState('');

  const isEditMode = !!transaction?.id;

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setTransactionType(transaction.transaction_type || 'buy');
        setQuantity(String(transaction.quantity || ''));
        setPricePerUnit(String(transaction.price_per_unit || ''));
        setTransactionDate(transaction.transaction_date ? format(new Date(transaction.transaction_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setLinkedAccountId(''); // Edit mode currently doesn't support changing the linked financial tx
      } else {
        // Reset form for new transaction
        setTransactionType('buy');
        setQuantity('');
        setPricePerUnit('');
        setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
        setLinkedAccountId('');
      }
    }
  }, [transaction, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !pricePerUnit || !transactionDate || !linkedAccountId) {
      toast.error("Harap isi semua field, termasuk akun sumber/tujuan dana.");
      return;
    }
    
    const payload: Partial<AssetTransaction> & { from_account_id?: string, to_account_id?: string } = {
      id: transaction?.id,
      transaction_type: transactionType,
      quantity: Number(quantity),
      price_per_unit: Number(pricePerUnit),
      transaction_date: transactionDate,
    };
    
    if (transactionType === 'buy') {
        payload.from_account_id = linkedAccountId;
    } else {
        payload.to_account_id = linkedAccountId;
    }

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Transaction for {assetName}</DialogTitle>
          <DialogDescription>
            Ini akan membuat catatan transaksi aset dan transfer finansial yang sesuai.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label>Tipe Transaksi</Label>
                <RadioGroup disabled={isEditMode} value={transactionType} onValueChange={(val) => setTransactionType(val as 'buy' | 'sell')} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="buy" id="r-buy" /><Label htmlFor="r-buy">Beli (Buy)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="sell" id="r-sell" /><Label htmlFor="r-sell">Jual (Sell)</Label></div>
                </RadioGroup>
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="linked-account">
                    {transactionType === 'buy' ? 'Sumber Dana (Dari Akun)' : 'Tujuan Dana (Ke Akun)'}
                </Label>
                <Select value={linkedAccountId} onValueChange={setLinkedAccountId} required disabled={isEditMode}>
                    <SelectTrigger><SelectValue placeholder="Pilih akun..." /></SelectTrigger>
                    <SelectContent>
                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 {isEditMode && <p className="text-xs text-muted-foreground">Mengubah akun finansial belum didukung dalam mode edit.</p>}
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="quantity">Kuantitas</Label>
                <Input id="quantity" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 5" required disabled={isEditMode}/>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="price">Harga / Unit</Label>
                <Input id="price" type="number" step="any" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} placeholder="e.g., 1200000" required disabled={isEditMode}/>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Tanggal Transaksi</Label>
            <Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required disabled={isEditMode}/>
          </div>
           {isEditMode && <p className="text-sm text-center text-amber-700 bg-amber-50 p-3 rounded-md">Saat ini, untuk mengubah detail transaksi, silakan hapus transaksi ini dan buat yang baru.</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isEditMode}>Simpan Transaksi</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}