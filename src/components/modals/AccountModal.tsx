// src/components/modals/AccountModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Account } from '@/types';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Account> & { initial_quantity?: number, total_cost?: number }) => void;
  account: Partial<Account> | null;
}

export default function AccountModal({ isOpen, onClose, onSave, account }: AccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [type, setType] = useState<'generic' | 'goal' | 'asset'>('generic');
  const [targetAmount, setTargetAmount] = useState('');
  const [goalReason, setGoalReason] = useState('');
  const [assetClass, setAssetClass] = useState('');
  const [unit, setUnit] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  
  const isEditMode = !!account?.id;

  useEffect(() => {
    if (isOpen) {
        if (account) {
            setName(account.name || '');
            setInitialBalance(String(account.initial_balance || 0));
            setType(account.type || 'generic');
            setTargetAmount(String(account.target_amount || ''));
            setGoalReason(account.goal_reason || '');
            setAssetClass(account.asset_class || '');
            setUnit(account.unit || '');
        } else {
            setName('');
            setInitialBalance('0');
            setType('generic');
            setTargetAmount('');
            setGoalReason('');
            setAssetClass('');
            setUnit('');
            setInitialQuantity('');
            setTotalCost('');
        }
    }
  }, [account, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        toast.error('Nama akun/aset wajib diisi.');
        return;
    }

    const quantity = Number(initialQuantity) || 0;
    const cost = Number(totalCost) || 0;

    if (!isEditMode && type === 'asset' && quantity > 0 && cost <= 0) {
        toast.error("Jika mengisi kuantitas, total biaya juga harus diisi.");
        return;
    }

    const payload: Partial<Account> & { initial_quantity?: number, total_cost?: number } = {
        id: account?.id,
        name,
        type,
        initial_balance: type === 'asset' ? 0 : (Number(initialBalance) || 0),
        target_amount: type === 'goal' ? (Number(targetAmount) || null) : null,
        goal_reason: type === 'goal' ? goalReason : null,
        asset_class: type === 'asset' ? (assetClass || null) : null,
        unit: type === 'asset' ? (unit || null) : null,
        initial_quantity: isEditMode ? undefined : quantity,
        total_cost: isEditMode ? undefined : cost
    };
    onSave(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>{account?.id ? 'Edit Akun' : 'Buat Akun Baru'}</DialogTitle>
                <DialogDescription>
                    Pilih tipe &apos;Aset&apos; untuk mulai melacak investasi atau barang berharga Anda.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                <div>
                    <Label className="mb-2 block">Tipe Akun</Label>
                    <RadioGroup disabled={isEditMode} value={type} onValueChange={(val) => setType(val as 'generic' | 'goal' | 'asset')} className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="generic" id="r1" /><Label htmlFor="r1">Akun Umum</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="goal" id="r2" /><Label htmlFor="r2">Tujuan / Amplop</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="asset" id="r3" /><Label htmlFor="r3">Aset / Investasi</Label></div>
                    </RadioGroup>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name-acc">Nama Akun / Aset</Label>
                    <Input id="name-acc" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bank BCA, Emas Antam" required />
                </div>
                
                {(type === 'generic' || type === 'goal') && (
                  <div className="grid gap-2">
                      <Label htmlFor="initial_balance">Saldo Awal</Label>
                      <Input id="initial_balance" type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} required disabled={isEditMode} />
                      <p className="text-xs text-muted-foreground">{isEditMode ? "Saldo awal tidak dapat diubah." : "Isi dengan saldo Anda saat ini di akun tersebut."}</p>
                  </div>
                )}

                {type === 'goal' && (
                    <div className="grid gap-4 border-t pt-4">
                         <div className="grid gap-2">
                            <Label htmlFor="target-amount">Target Dana (Opsional)</Label>
                            <Input id="target-amount" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Contoh: 50000000" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="goal-reason">Apa alasanmu menabung untuk ini?</Label>
                            <Textarea id="goal-reason" value={goalReason} onChange={(e) => setGoalReason(e.target.value)} placeholder="Contoh: Untuk membeli rumah pertama, agar lebih semangat!" />
                        </div>
                    </div>
                )}

                {type === 'asset' && (
                    <div className="grid gap-4 border-t pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="asset-unit">Unit</Label>
                                <Input id="asset-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., gram, lembar" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="asset-class">Kelas Aset</Label>
                                <Input id="asset-class" value={assetClass} onChange={(e) => setAssetClass(e.target.value)} placeholder="e.g., gold, stock" />
                            </div>
                        </div>

                        {!isEditMode && (
                            <div className="grid gap-4 border-t pt-4">
                                <p className="text-sm text-muted-foreground -mb-2">
                                    Jika Anda sudah memiliki aset ini, masukkan jumlah dan total modalnya di sini.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="initial-quantity">Initial Quantity</Label>
                                        <Input id="initial-quantity" type="number" step="any" value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} placeholder="e.g., 10" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="total-cost">Total Cost (Modal)</Label>
                                        <Input id="total-cost" type="number" step="any" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} placeholder="e.g., 10000000" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
};